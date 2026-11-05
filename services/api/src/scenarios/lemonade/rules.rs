//! Lemonade stand rules (docs/build/contracts/0.2-game-core.md §5).

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use super::manifest::{LEMON, Manifest, SUGAR};
use crate::platform::scenario::{RuleCtx, RuleError, RuleResult};
use crate::systems::costs::CostLots;
use crate::systems::inventory::Inventory;

pub const STATE_SCHEMA: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub schema: u32,
    pub stock: Inventory,
    pub jug: Jug,
    pub round: Option<Round>,
    pub rounds_played: u32,
    pub last_round: Option<Summary>,
    /// Time up to which arrivals have been announced as events.
    pub settled_to: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Jug {
    pub cups: i64,
    /// Cost basis of the cups in the jug.
    pub lots: CostLots,
    pub making: Option<Making>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Making {
    pub started_at: DateTime<Utc>,
    pub done_at: DateTime<Utc>,
    pub cost: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Round {
    pub id: u32,
    pub opened_at: DateTime<Utc>,
    pub customers: Vec<Customer>,
    pub sold: i64,
    pub materials: i64,
    pub cups_sold: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Customer {
    pub id: u32,
    pub arrives_at: DateTime<Utc>,
    pub served: bool,
    pub left: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub round_id: u32,
    pub sold: i64,
    pub materials: i64,
    pub left: i64,
    pub cups_sold: i64,
    pub customers: u32,
    pub seen: bool,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
pub enum Command {
    #[serde(rename_all = "camelCase")]
    BuyStock {
        lemons: i64,
        sugar: i64,
    },
    MakeJug {},
    OpenStand {},
    #[serde(rename_all = "camelCase")]
    ServeCustomer {
        customer_id: u32,
    },
    CloseRound {},
    #[serde(rename_all = "camelCase")]
    SeenRound {
        round_id: u32,
    },
}

pub fn initial() -> State {
    State {
        schema: STATE_SCHEMA,
        stock: Inventory::default(),
        jug: Jug::default(),
        round: None,
        rounds_played: 0,
        last_round: None,
        settled_to: None,
    }
}

fn ms(n: i64) -> Duration {
    Duration::milliseconds(n)
}

impl Customer {
    fn waiting(&self, now: DateTime<Utc>) -> bool {
        !self.served && !self.left && self.arrives_at <= now
    }
}

/// Finish the jug when its time is up and announce arriving customers.
pub fn settle(m: &Manifest, s: &mut State, ctx: &mut RuleCtx) {
    let now = ctx.now;
    if let Some(mk) = s.jug.making.clone()
        && mk.done_at <= now
    {
        s.jug.making = None;
        s.jug.cups += m.recipe.cups;
        s.jug.lots.add(m.recipe.cups, mk.cost);
        ctx.emit("JugReady", mk.done_at, json!({ "cups": s.jug.cups }));
    }
    if let Some(r) = &s.round {
        let from = s.settled_to.unwrap_or(r.opened_at);
        for c in r
            .customers
            .iter()
            .filter(|c| c.arrives_at > from && c.arrives_at <= now && !c.left)
        {
            ctx.emit(
                "CustomerArrived",
                c.arrives_at,
                json!({ "customerId": c.id }),
            );
        }
    }
    s.settled_to = Some(now);
}

/// Coins needed to make one more jug from what is in stock.
fn missing_cost(m: &Manifest, stock: &Inventory) -> i64 {
    m.recipe
        .inputs
        .iter()
        .map(|(id, n)| (n - stock.get(id)).max(0) * m.ingredient(id).map_or(0, |i| i.price))
        .sum()
}

fn can_make_jug(m: &Manifest, stock: &Inventory) -> bool {
    m.recipe.inputs.iter().all(|(id, n)| stock.get(id) >= *n)
}

/// The child can still earn: cups to sell, a jug on the way, or enough stock
/// plus coins for one more jug (docs/03 §7).
fn can_continue(m: &Manifest, s: &State, coins: i64) -> bool {
    s.jug.cups > 0 || s.jug.making.is_some() || coins >= missing_cost(m, &s.stock)
}

fn close_round(s: &mut State, ctx: &mut RuleCtx) {
    let Some(mut r) = s.round.take() else { return };
    for c in r.customers.iter_mut().filter(|c| !c.served) {
        c.left = true;
    }
    let summary = Summary {
        round_id: r.id,
        sold: r.sold,
        materials: r.materials,
        left: r.sold - r.materials,
        cups_sold: r.cups_sold,
        customers: r.customers.len() as u32,
        seen: false,
    };
    ctx.emit(
        "RoundClosed",
        ctx.now,
        serde_json::to_value(&summary).unwrap_or(Value::Null),
    );
    s.last_round = Some(summary);
    s.rounds_played += 1;
}

pub fn apply(m: &Manifest, s: &mut State, cmd: Command, ctx: &mut RuleCtx) -> RuleResult<()> {
    let now = ctx.now;
    let cmd_id = ctx.command_id.ok_or(RuleError::new("invalid_command"))?;
    match cmd {
        Command::BuyStock { lemons, sugar } => {
            if lemons < 0 || sugar < 0 || lemons + sugar == 0 || lemons > 1000 || sugar > 1000 {
                return Err(RuleError::new("invalid_command"));
            }
            let price = |id: &str| m.ingredient(id).map_or(0, |i| i.price);
            let cap = |id: &str| m.ingredient(id).map(|i| i.capacity);
            if lemons > 0 {
                s.stock.add(LEMON, lemons, cap(LEMON))?;
            }
            if sugar > 0 {
                s.stock.add(SUGAR, sugar, cap(SUGAR))?;
            }
            let cost = lemons * price(LEMON) + sugar * price(SUGAR);
            ctx.debit("stock", cost, format!("stock:{cmd_id}"))?;
            if !can_continue(m, s, ctx.coins()) {
                return Err(RuleError::new("would_get_stuck"));
            }
            ctx.emit(
                "StockBought",
                now,
                json!({ "lemons": lemons, "sugar": sugar, "cost": cost }),
            );
        }
        Command::MakeJug {} => {
            if s.jug.making.is_some() {
                return Err(RuleError::new("jug_busy"));
            }
            if s.jug.cups + m.recipe.cups > m.jug_capacity {
                return Err(RuleError::new("jug_not_empty"));
            }
            if !can_make_jug(m, &s.stock) {
                return Err(RuleError::new("not_enough_stock"));
            }
            for (id, n) in &m.recipe.inputs {
                s.stock.take(id, *n)?;
            }
            let done_at = now + ms(m.recipe.duration_ms);
            s.jug.making = Some(Making {
                started_at: now,
                done_at,
                cost: m.jug_cost(),
            });
            ctx.emit("JugStarted", now, json!({ "doneAt": done_at }));
        }
        Command::OpenStand {} => {
            if s.round.is_some() {
                return Err(RuleError::new("round_open"));
            }
            if s.jug.cups == 0 && s.jug.making.is_none() {
                return Err(RuleError::new("nothing_to_sell"));
            }
            let id = s.rounds_played + 1;
            let customers = (0..m.customers_per_round)
                .map(|i| Customer {
                    id: i + 1,
                    arrives_at: now
                        + ms(m.first_customer_ms + i64::from(i) * m.customer_interval_ms),
                    served: false,
                    left: false,
                })
                .collect();
            s.round = Some(Round {
                id,
                opened_at: now,
                customers,
                sold: 0,
                materials: 0,
                cups_sold: 0,
            });
            s.settled_to = Some(now);
            ctx.emit("StandOpened", now, json!({ "roundId": id }));
        }
        Command::ServeCustomer { customer_id } => {
            let r = s.round.as_mut().ok_or(RuleError::new("no_round"))?;
            let c = r
                .customers
                .iter_mut()
                .find(|c| c.id == customer_id)
                .filter(|c| c.waiting(now))
                .ok_or(RuleError::new("customer_not_waiting"))?;
            if s.jug.cups == 0 {
                return Err(RuleError::new("no_cups"));
            }
            c.served = true;
            s.jug.cups -= 1;
            let cost = s.jug.lots.take(1);
            r.sold += m.cup_price;
            r.materials += cost;
            r.cups_sold += 1;
            let round_id = r.id;
            ctx.credit(
                "sale",
                m.cup_price,
                format!("sale:{round_id}:{customer_id}"),
            );
            ctx.emit(
                "CustomerServed",
                now,
                json!({ "customerId": customer_id, "price": m.cup_price }),
            );
            if r.customers.iter().all(|c| c.served) {
                close_round(s, ctx);
            }
        }
        Command::CloseRound {} => {
            if s.round.is_none() {
                return Err(RuleError::new("no_round"));
            }
            close_round(s, ctx);
        }
        Command::SeenRound { round_id } => {
            if let Some(l) = s.last_round.as_mut().filter(|l| l.round_id == round_id) {
                l.seen = true;
            }
        }
    }
    Ok(())
}

/// What the child should do now. Drives the goal card and the pointer.
pub fn next_step(m: &Manifest, s: &State, now: DateTime<Utc>) -> &'static str {
    if let Some(r) = &s.round {
        let waiting = r.customers.iter().any(|c| c.waiting(now));
        if waiting && s.jug.cups > 0 {
            return "serve";
        }
        if s.jug.cups == 0 && s.jug.making.is_none() {
            return if can_make_jug(m, &s.stock) {
                "make"
            } else {
                "buy"
            };
        }
        return "wait";
    }
    if s.last_round.as_ref().is_some_and(|l| !l.seen) {
        return "summary";
    }
    if s.jug.cups > 0 || s.jug.making.is_some() {
        return "open";
    }
    if can_make_jug(m, &s.stock) {
        "make"
    } else {
        "buy"
    }
}

pub fn view(m: &Manifest, s: &State, coins: i64, now: DateTime<Utc>) -> Value {
    let round = s.round.as_ref().map(|r| {
        let customers: Vec<Value> = r
            .customers
            .iter()
            .map(|c| {
                let state = if c.served {
                    "served"
                } else if c.left {
                    "left"
                } else if c.arrives_at <= now {
                    "waiting"
                } else {
                    "coming"
                };
                json!({ "id": c.id, "state": state, "arrivesAt": c.arrives_at })
            })
            .collect();
        json!({
            "id": r.id,
            "openedAt": r.opened_at,
            "customers": customers,
            "served": r.cups_sold,
            "demand": r.customers.len(),
            "sold": r.sold,
        })
    });
    let making = s.jug.making.as_ref().map(|mk| {
        json!({ "startedAt": mk.started_at, "doneAt": mk.done_at, "msLeft": (mk.done_at - now).num_milliseconds().max(0) })
    });
    let ing = |id: &str| m.ingredient(id).cloned();
    let (lemon, sugar) = (ing(LEMON), ing(SUGAR));
    let need = |id: &str| {
        m.recipe
            .inputs
            .iter()
            .find(|(i, _)| i == id)
            .map_or(0, |(_, n)| *n)
    };
    json!({
        "stateSchema": s.schema,
        "balanceVersion": m.balance_version,
        "prices": { "lemon": lemon.as_ref().map(|i| i.price), "sugar": sugar.as_ref().map(|i| i.price), "cup": m.cup_price },
        "capacity": {
            "lemons": lemon.as_ref().map(|i| i.capacity),
            "sugar": sugar.as_ref().map(|i| i.capacity),
            "jugCups": m.jug_capacity,
        },
        "recipe": { "lemons": need(LEMON), "sugar": need(SUGAR), "cups": m.recipe.cups, "durationMs": m.recipe.duration_ms },
        "stock": { "lemons": s.stock.get(LEMON), "sugar": s.stock.get(SUGAR) },
        // What to buy for one more jug, as a suggestion for the recipe card.
        "forOneJug": {
            "lemons": (need(LEMON) - s.stock.get(LEMON)).max(0),
            "sugar": (need(SUGAR) - s.stock.get(SUGAR)).max(0),
        },
        "jug": { "cups": s.jug.cups, "making": making },
        "round": round,
        "roundsPlayed": s.rounds_played,
        "lastRound": s.last_round,
        "nextStep": next_step(m, s, now),
        "coins": coins,
    })
}
