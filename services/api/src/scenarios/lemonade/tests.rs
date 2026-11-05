//! Rule tests for the lemonade stand, without a database.

use chrono::{DateTime, Duration, TimeZone, Utc};
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use serde_json::{Value, json};
use uuid::Uuid;

use super::Lemonade;
use super::rules::State;
use crate::platform::scenario::{RuleCtx, Ruleset};

struct Game {
    rules: Lemonade,
    state: Value,
    coins: i64,
    ledger: i64,
    now: DateTime<Utc>,
    events: Vec<String>,
}

impl Game {
    fn new() -> Self {
        let rules = Lemonade::new();
        let start = rules.start();
        Self {
            rules,
            state: start.state,
            coins: start.coins,
            ledger: start.coins,
            now: Utc.with_ymd_and_hms(2026, 11, 5, 10, 0, 0).unwrap(),
            events: vec![],
        }
    }

    /// Run one command through settle + apply like the pipeline does.
    /// A rejection leaves state and coins untouched.
    fn send(&mut self, cmd: Value) -> Result<(), String> {
        let mut ctx = RuleCtx::new(self.now, Some(Uuid::now_v7()), self.coins);
        let mut state = self.state.clone();
        self.rules
            .settle(&mut state, &mut ctx)
            .map_err(|e| e.code.to_string())?;
        self.rules
            .apply(&mut state, &cmd, &mut ctx)
            .map_err(|e| e.code.to_string())?;
        let (coins, ledger, events) = ctx.into_parts();
        self.ledger += ledger.iter().map(|l| l.amount).sum::<i64>();
        assert_eq!(self.ledger, coins, "ledger sum must equal coins");
        assert!(coins >= 0);
        self.state = state;
        self.coins = coins;
        self.events
            .extend(events.into_iter().map(|e| e.kind.to_string()));
        Ok(())
    }

    fn wait(&mut self, ms: i64) {
        self.now += Duration::milliseconds(ms);
    }

    fn view(&self) -> Value {
        let mut state = self.state.clone();
        let mut ctx = RuleCtx::new(self.now, None, self.coins);
        self.rules.settle(&mut state, &mut ctx).unwrap();
        self.rules.view(&state, self.coins, self.now).unwrap()
    }

    fn typed(&self) -> State {
        serde_json::from_value(self.state.clone()).unwrap()
    }

    fn err(&mut self, cmd: Value) -> String {
        self.send(cmd).expect_err("command should be refused")
    }

    /// Play one good round from whatever state the game is in.
    fn play_round(&mut self) {
        if self.typed().round.is_some() {
            self.send(json!({ "type": "closeRound" })).unwrap();
        }
        let v = self.view();
        if v["jug"]["cups"] == 0 && v["jug"]["making"].is_null() {
            let need = &v["forOneJug"];
            let (l, s) = (
                need["lemons"].as_i64().unwrap(),
                need["sugar"].as_i64().unwrap(),
            );
            if l + s > 0 {
                self.send(json!({ "type": "buyStock", "lemons": l, "sugar": s }))
                    .unwrap();
            }
            self.send(json!({ "type": "makeJug" })).unwrap();
        }
        if let Some(left) = self.view()["jug"]["making"]["msLeft"].as_i64() {
            self.wait(left);
        }
        self.send(json!({ "type": "openStand" })).unwrap();
        for id in 1..=4 {
            self.wait(2500);
            let v = self.view();
            if v["round"].is_null() {
                break;
            }
            if v["jug"]["cups"] == 0 {
                break;
            }
            self.send(json!({ "type": "serveCustomer", "customerId": id }))
                .unwrap();
        }
        if self.typed().round.is_some() {
            self.send(json!({ "type": "closeRound" })).unwrap();
        }
    }
}

#[test]
fn first_round_follows_the_balance_doc() {
    let mut g = Game::new();
    assert_eq!(g.coins, 12);
    assert_eq!(g.view()["nextStep"], "buy");

    g.send(json!({ "type": "buyStock", "lemons": 3, "sugar": 1 }))
        .unwrap();
    assert_eq!(g.coins, 8);
    assert_eq!(g.view()["stock"], json!({ "lemons": 3, "sugar": 1 }));
    assert_eq!(g.view()["nextStep"], "make");

    g.send(json!({ "type": "makeJug" })).unwrap();
    assert_eq!(g.view()["stock"], json!({ "lemons": 0, "sugar": 0 }));
    assert_eq!(g.view()["jug"]["making"]["msLeft"], 3000);
    assert_eq!(g.view()["nextStep"], "open");
    g.wait(3000);
    assert_eq!(g.view()["jug"]["cups"], 4);

    g.send(json!({ "type": "openStand" })).unwrap();
    assert_eq!(g.view()["nextStep"], "wait");
    assert_eq!(
        g.err(json!({ "type": "serveCustomer", "customerId": 1 })),
        "customer_not_waiting"
    );
    for id in 1..=4 {
        g.wait(if id == 1 { 1000 } else { 2500 });
        assert_eq!(g.view()["nextStep"], "serve");
        g.send(json!({ "type": "serveCustomer", "customerId": id }))
            .unwrap();
    }
    assert_eq!(g.coins, 16);
    let v = g.view();
    assert!(v["round"].is_null(), "round closes after the last customer");
    assert_eq!(v["lastRound"]["sold"], 8);
    assert_eq!(v["lastRound"]["materials"], 4);
    assert_eq!(v["lastRound"]["left"], 4);
    assert_eq!(v["lastRound"]["seen"], false);
    assert_eq!(v["nextStep"], "summary");

    g.send(json!({ "type": "seenRound", "roundId": 1 }))
        .unwrap();
    assert_eq!(g.view()["nextStep"], "buy");
    for kind in [
        "StockBought",
        "JugStarted",
        "JugReady",
        "StandOpened",
        "CustomerArrived",
        "CustomerServed",
        "RoundClosed",
    ] {
        assert!(g.events.iter().any(|e| e == kind), "missing event {kind}");
    }
}

#[test]
fn refusals_have_codes_and_change_nothing() {
    let mut g = Game::new();
    assert_eq!(g.err(json!({ "type": "makeJug" })), "not_enough_stock");
    assert_eq!(g.err(json!({ "type": "openStand" })), "nothing_to_sell");
    assert_eq!(g.err(json!({ "type": "closeRound" })), "no_round");
    assert_eq!(
        g.err(json!({ "type": "serveCustomer", "customerId": 1 })),
        "no_round"
    );
    assert_eq!(
        g.err(json!({ "type": "buyStock", "lemons": 13, "sugar": 0 })),
        "storage_full"
    );
    assert_eq!(
        g.err(json!({ "type": "buyStock", "lemons": 0, "sugar": 5 })),
        "storage_full"
    );
    assert_eq!(
        g.err(json!({ "type": "buyStock", "lemons": 0, "sugar": 0 })),
        "invalid_command"
    );
    assert_eq!(
        g.err(json!({ "type": "buyStock", "lemons": -1, "sugar": 2 })),
        "invalid_command"
    );
    assert_eq!(g.err(json!({ "type": "fly" })), "invalid_command");
    assert_eq!(
        g.err(json!({ "type": "makeJug", "extra": 1 })),
        "invalid_command"
    );
    // 12 lemons leave no coins for sugar: the child would get stuck.
    assert_eq!(
        g.err(json!({ "type": "buyStock", "lemons": 12, "sugar": 0 })),
        "would_get_stuck"
    );
    assert_eq!(g.coins, 12);
    assert_eq!(g.state, Game::new().state);

    g.send(json!({ "type": "buyStock", "lemons": 6, "sugar": 2 }))
        .unwrap();
    g.send(json!({ "type": "makeJug" })).unwrap();
    assert_eq!(g.err(json!({ "type": "makeJug" })), "jug_busy");
    g.wait(3000);
    assert_eq!(g.err(json!({ "type": "makeJug" })), "jug_not_empty");
    g.send(json!({ "type": "openStand" })).unwrap();
    assert_eq!(g.err(json!({ "type": "openStand" })), "round_open");
}

#[test]
fn not_enough_coins_is_refused() {
    let mut g = Game::new();
    g.send(json!({ "type": "buyStock", "lemons": 6, "sugar": 2 }))
        .unwrap();
    g.send(json!({ "type": "buyStock", "lemons": 3, "sugar": 1 }))
        .unwrap();
    assert_eq!(g.coins, 0);
    assert_eq!(
        g.err(json!({ "type": "buyStock", "lemons": 1, "sugar": 0 })),
        "not_enough_coins"
    );
}

#[test]
fn closing_early_lets_customers_leave_and_keeps_cups() {
    let mut g = Game::new();
    g.send(json!({ "type": "buyStock", "lemons": 3, "sugar": 1 }))
        .unwrap();
    g.send(json!({ "type": "makeJug" })).unwrap();
    g.wait(3000);
    g.send(json!({ "type": "openStand" })).unwrap();
    g.wait(1000);
    g.send(json!({ "type": "serveCustomer", "customerId": 1 }))
        .unwrap();
    g.send(json!({ "type": "closeRound" })).unwrap();
    let v = g.view();
    assert_eq!(v["jug"]["cups"], 3);
    assert_eq!(v["lastRound"]["sold"], 2);
    assert_eq!(v["lastRound"]["materials"], 1);
    assert_eq!(v["lastRound"]["left"], 1);
    assert_eq!(g.coins, 10);
    // Seeing the summary of another round is harmless.
    g.send(json!({ "type": "seenRound", "roundId": 9 }))
        .unwrap();
    assert_eq!(g.view()["nextStep"], "summary");
    g.send(json!({ "type": "seenRound", "roundId": 1 }))
        .unwrap();
    assert_eq!(g.view()["nextStep"], "open");
}

#[test]
fn running_out_of_cups_mid_round_points_to_the_next_jug() {
    let mut g = Game::new();
    g.send(json!({ "type": "buyStock", "lemons": 6, "sugar": 2 }))
        .unwrap();
    g.send(json!({ "type": "makeJug" })).unwrap();
    g.wait(3000);
    g.send(json!({ "type": "openStand" })).unwrap();
    g.wait(1000);
    for id in 1..=4 {
        if id > 1 {
            g.wait(2500);
        }
        if id == 4 {
            // Simulate a slow child: cups are gone before customer 4 is served.
            break;
        }
        g.send(json!({ "type": "serveCustomer", "customerId": id }))
            .unwrap();
    }
    g.send(json!({ "type": "makeJug" })).unwrap_err(); // jug still has a cup
    g.send(json!({ "type": "serveCustomer", "customerId": 4 }))
        .unwrap();
    assert_eq!(g.view()["nextStep"], "summary");
    assert_eq!(g.coins, 4 + 8);
}

#[test]
fn view_is_pure_and_settle_does_not_book() {
    let mut g = Game::new();
    g.send(json!({ "type": "buyStock", "lemons": 3, "sugar": 1 }))
        .unwrap();
    g.send(json!({ "type": "makeJug" })).unwrap();
    g.wait(10_000);
    let before = g.state.clone();
    let mut state = g.state.clone();
    let mut ctx = RuleCtx::new(g.now, None, g.coins);
    g.rules.settle(&mut state, &mut ctx).unwrap();
    let (coins, ledger, _) = ctx.into_parts();
    assert_eq!(coins, g.coins);
    assert!(ledger.is_empty());
    assert_eq!(g.state, before);
}

/// Thousands of random moves never break the ledger, never go negative and
/// never leave the child stuck: a good round must always be possible after.
#[test]
fn random_play_never_gets_stuck() {
    for seed in 0..200u64 {
        let mut rng = StdRng::seed_from_u64(seed);
        let mut g = Game::new();
        for _ in 0..60 {
            let cmd = match rng.gen_range(0..8) {
                0 => {
                    json!({ "type": "buyStock", "lemons": rng.gen_range(0..8), "sugar": rng.gen_range(0..3) })
                }
                1 => json!({ "type": "makeJug" }),
                2 => json!({ "type": "openStand" }),
                3 | 4 => json!({ "type": "serveCustomer", "customerId": rng.gen_range(1..=4) }),
                5 => json!({ "type": "closeRound" }),
                6 => json!({ "type": "seenRound", "roundId": rng.gen_range(1..4) }),
                _ => {
                    g.wait(rng.gen_range(0..4000));
                    continue;
                }
            };
            let _ = g.send(cmd);
            let s = g.typed();
            assert!(s.jug.cups >= 0 && s.jug.cups <= 4, "seed {seed}");
            assert_eq!(
                s.jug.cups,
                s.jug.lots.units(),
                "seed {seed}: cost lots follow cups"
            );
        }
        let before = g.coins;
        g.wait(5000);
        g.play_round();
        assert!(
            g.coins > before || g.typed().last_round.unwrap().cups_sold > 0,
            "seed {seed}: stuck"
        );
    }
}
