//! Rule tests for the lemonade clicker, without a database.

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
    refs: std::collections::BTreeSet<String>,
    now: DateTime<Utc>,
    events: Vec<(String, Value)>,
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
            refs: Default::default(),
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
        let mut balance = self.coins;
        for l in &ledger {
            balance += l.amount;
            assert!(balance >= 0, "balance after {} went negative", l.reference);
            assert!(
                self.refs.insert(l.reference.clone()),
                "duplicate ref {}",
                l.reference
            );
        }
        self.ledger += ledger.iter().map(|l| l.amount).sum::<i64>();
        assert_eq!(self.ledger, coins, "ledger sum must equal coins");
        self.state = state;
        self.coins = coins;
        self.events
            .extend(events.into_iter().map(|e| (e.kind.to_string(), e.data)));
        Ok(())
    }

    fn tap(&mut self, n: i64) -> Result<(), String> {
        self.send(json!({ "type": "tap", "count": n }))
    }

    fn buy(&mut self, id: &str) -> Result<(), String> {
        self.send(json!({ "type": "buyUpgrade", "upgrade": id }))
    }

    fn wait(&mut self, ms: i64) {
        self.now += Duration::milliseconds(ms);
    }

    fn view(&self) -> Value {
        let mut state = self.state.clone();
        let mut ctx = RuleCtx::new(self.now, None, self.coins);
        self.rules.settle(&mut state, &mut ctx).unwrap();
        let coins = ctx.coins();
        self.rules.view(&state, coins, self.now).unwrap()
    }

    fn typed(&self) -> State {
        serde_json::from_value(self.state.clone()).unwrap()
    }

    fn last_event(&self, kind: &str) -> Value {
        self.events
            .iter()
            .rev()
            .find(|(k, _)| k == kind)
            .map(|(_, d)| d.clone())
            .unwrap_or_else(|| panic!("no {kind} event"))
    }
}

#[test]
fn first_tap_buys_a_jug_and_sells_a_cup() {
    let mut g = Game::new();
    assert_eq!(g.coins, 12);
    assert_eq!(g.view()["nextStep"], "tap");
    g.tap(1).unwrap();
    // +2 for the cup, -4 for the ingredients of a jug of 4.
    assert_eq!(g.coins, 10);
    assert_eq!(g.typed().jug_left, 3);
    g.tap(3).unwrap();
    assert_eq!(g.coins, 16);
    assert_eq!(g.typed().jug_left, 0);
    let v = g.view();
    assert_eq!(v["stats"]["cupsSold"], 4);
    assert_eq!(v["stats"]["revenue"], 8);
    assert_eq!(v["stats"]["materials"], 4);
    assert_eq!(v["stats"]["profit"], 4);
}

#[test]
fn a_batch_spanning_jugs_books_every_jug() {
    let mut g = Game::new();
    g.tap(9).unwrap();
    // 9 cups = 3 jugs: 18 - 12.
    assert_eq!(g.coins, 18);
    assert_eq!(g.typed().jug_left, 3);
    assert_eq!(g.last_event("CupsSold")["materials"], 12);
}

#[test]
fn taps_are_limited_by_a_refilling_allowance() {
    let mut g = Game::new();
    g.tap(24).unwrap();
    assert_eq!(g.last_event("CupsSold")["taps"], 24);
    assert_eq!(g.tap(5).unwrap_err(), "too_fast");
    g.wait(500);
    g.tap(20).unwrap();
    let e = g.last_event("CupsSold");
    assert_eq!(e["taps"], 6);
    assert_eq!(e["ignored"], 14);
    assert_eq!(g.tap(0).unwrap_err(), "invalid_command");
    assert_eq!(g.tap(101).unwrap_err(), "invalid_command");
}

#[test]
fn the_better_press_makes_taps_worth_more() {
    let mut g = Game::new();
    assert_eq!(g.buy("press").unwrap_err(), "would_get_stuck");
    g.tap(4).unwrap(); // 16
    assert_eq!(g.view()["nextStep"], "upgrade:press");
    g.buy("press").unwrap();
    assert_eq!(g.coins, 6);
    assert_eq!(g.view()["cupsPerTap"], 2);
    g.tap(2).unwrap(); // 4 cups: +8 -4
    assert_eq!(g.coins, 10);
    let v = g.view();
    assert_eq!(v["upgrades"][0]["level"], 1);
    assert_eq!(v["upgrades"][0]["nextPrice"], 30);
    assert_eq!(v["stats"]["invested"], 10);
}

#[test]
fn an_upgrade_that_would_leave_you_stuck_is_refused() {
    let mut g = Game::new();
    g.tap(4).unwrap(); // 16 coins, jug empty
    g.wait(1000);
    g.tap(2).unwrap(); // 18 - 4 + 4 = 16... jug_left 2
    let coins = g.coins;
    assert_eq!(coins, 16);
    // Buying a 20-coin helper is not possible; press for 10 leaves 6 + 2*2 >= 4.
    g.buy("press").unwrap();
    // Now drive coins to exactly the press price for level 2 with an empty jug.
    let mut g = Game::new();
    g.state["jugLeft"] = json!(0);
    g.coins = 10;
    g.ledger = 10;
    assert_eq!(g.buy("press").unwrap_err(), "would_get_stuck");
    assert_eq!(g.coins, 10);
}

#[test]
fn max_level_and_unknown_upgrades_are_refused() {
    let mut g = Game::new();
    g.coins = 1000;
    g.ledger = 1000;
    g.buy("tree").unwrap();
    assert_eq!(g.view()["jugCost"], 1);
    assert_eq!(g.buy("tree").unwrap_err(), "max_level");
    assert_eq!(g.buy("rocket").unwrap_err(), "invalid_command");
    assert_eq!(
        g.send(json!({ "type": "buyStock", "lemons": 1, "sugar": 0 }))
            .unwrap_err(),
        "invalid_command"
    );
}

#[test]
fn helpers_keep_selling_while_away_up_to_the_cap() {
    let mut g = Game::new();
    g.coins = 1000;
    g.ledger = 1000;
    g.buy("helper").unwrap(); // 0.5 cup/s
    assert_eq!(g.view()["perMinute"], 30);
    g.wait(10_000);
    // The view shows 5 sold cups without saving anything.
    let before = g.coins;
    assert_eq!(g.view()["coins"], before + 10 - 8);
    assert_eq!(g.coins, before);
    g.tap(1).unwrap();
    assert_eq!(g.last_event("HelpersSold")["cups"], 5);
    assert_eq!(g.typed().stats.cups_by_helpers, 5);

    // Collecting books the helpers without a tap.
    g.wait(4000);
    g.send(json!({ "type": "collect" })).unwrap();
    assert_eq!(g.typed().stats.cups_by_helpers, 7);

    // Away for a day: only two hours count.
    let before = g.coins;
    g.wait(24 * 3600 * 1000);
    g.tap(1).unwrap();
    let away = g.last_event("AwayEarnings");
    assert_eq!(away["cups"], 3600);
    assert_eq!(away["capped"], true);
    // 3601 cups at 1 coin profit each, give or take one jug.
    assert!((g.coins - before - 3601).abs() <= 4, "{}", g.coins - before);
}

#[test]
fn helper_fractions_carry_over() {
    let mut g = Game::new();
    g.coins = 100;
    g.ledger = 100;
    g.buy("helper").unwrap();
    for _ in 0..3 {
        g.wait(1000);
        g.tap(1).unwrap();
    }
    // 1.5 cups made: 1 sold, half a cup carried.
    let s = g.typed();
    assert_eq!(s.stats.cups_by_helpers, 1);
    assert_eq!(s.carry_milli, 500);
}

#[test]
fn converting_a_v1_game_pays_back_stock_and_keeps_the_jug() {
    let rules = Lemonade::new();
    let now = Utc.with_ymd_and_hms(2026, 11, 5, 10, 0, 0).unwrap();
    let old = json!({
        "schema": 1,
        "stock": { "lemon": 2, "sugar": 1 },
        "jug": { "cups": 1, "lots": [], "making": { "startedAt": now, "doneAt": now, "cost": 4 } },
        "round": null, "roundsPlayed": 3, "lastRound": null, "settledTo": null
    });
    let mut state = old.clone();
    let mut ctx = RuleCtx::new(now, None, 7);
    rules.upgrade(1, &mut state, &mut ctx).unwrap();
    let (coins, ledger, _) = ctx.into_parts();
    assert_eq!(coins, 10);
    assert_eq!(ledger[0].reference, "convert:v1:stock");
    let s: State = serde_json::from_value(state).unwrap();
    assert_eq!(s.jug_left, 5);
    assert!(
        rules
            .upgrade(3, &mut old.clone(), &mut RuleCtx::new(now, None, 0))
            .is_err()
    );
}

#[test]
fn random_play_never_breaks_the_economy() {
    for seed in 0..40 {
        let mut rng = StdRng::seed_from_u64(seed);
        let mut g = Game::new();
        for _ in 0..300 {
            g.wait(rng.gen_range(0..20_000));
            let r = rng.gen_range(0..10);
            let _ = if r < 7 {
                g.tap(rng.gen_range(1..30))
            } else {
                let id = ["press", "helper", "tree"][rng.gen_range(0..3)];
                g.buy(id)
            };
            let s = g.typed();
            assert!(g.coins >= 0);
            assert!(s.jug_left >= 0 && s.jug_left < 4);
            // Never stuck: the next cup can always be made.
            let v = g.view();
            assert!(
                g.coins + s.jug_left * 2 >= v["jugCost"].as_i64().unwrap(),
                "seed {seed} stuck"
            );
        }
    }
}
