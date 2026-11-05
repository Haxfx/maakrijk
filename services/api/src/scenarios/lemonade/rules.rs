//! Lemonade stand rules v2: the clicker core
//! (docs/build/contracts/0.2-game-core.md §5, docs/03 §5–§8, decision D13).
//!
//! Tapping the press sells cups. Ingredients for a jug are bought
//! automatically when a new jug starts. Upgrades make taps worth more, add
//! helpers that keep selling (also while away, at most `away_cap_ms`) or make
//! an ingredient free.

use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use super::manifest::{Effect, Manifest};
use crate::platform::scenario::{RuleCtx, RuleError, RuleResult};

pub const STATE_SCHEMA: u32 = 2;

/// Gaps longer than this are reported as "while you were away".
const AWAY_NOTICE_MS: i64 = 60_000;
/// Most taps one command may carry (the client batches taps).
const MAX_TAPS_PER_COMMAND: i64 = 100;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub schema: u32,
    /// Bought level per upgrade id. Missing means level 0.
    pub upgrades: BTreeMap<String, u32>,
    /// Cups still in the current jug; their ingredients are paid.
    pub jug_left: i64,
    /// Thousandths of a cup the helpers made that are not sold yet.
    pub carry_milli: i64,
    /// Tap allowance in thousandths of a tap, refilled over time.
    pub tap_milli: i64,
    pub tap_at: Option<DateTime<Utc>>,
    /// Time up to which helper work is counted.
    pub settled_to: Option<DateTime<Utc>>,
    pub stats: Stats,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub cups_sold: i64,
    pub cups_by_helpers: i64,
    pub revenue: i64,
    pub materials: i64,
    pub invested: i64,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
pub enum Command {
    /// `count` taps on the press since the last batch.
    Tap {
        count: i64,
    },
    BuyUpgrade {
        upgrade: String,
    },
    /// Book what the helpers sold so far. Sent now and then while the child
    /// watches, so the away cap only applies to real absence.
    Collect {},
}

pub fn initial(m: &Manifest) -> State {
    State {
        schema: STATE_SCHEMA,
        upgrades: BTreeMap::new(),
        jug_left: 0,
        carry_milli: 0,
        tap_milli: m.tap_burst * 1000,
        tap_at: None,
        settled_to: None,
        stats: Stats::default(),
    }
}

fn level(s: &State, id: &str) -> u32 {
    s.upgrades.get(id).copied().unwrap_or(0)
}

pub fn cups_per_tap(m: &Manifest, s: &State) -> i64 {
    1 + m
        .upgrades
        .iter()
        .map(|u| match u.effect {
            Effect::CupsPerTap { per_level } => per_level * i64::from(level(s, &u.id)),
            _ => 0,
        })
        .sum::<i64>()
}

/// Thousandths of a cup the helpers make per second.
pub fn helper_rate(m: &Manifest, s: &State) -> i64 {
    m.upgrades
        .iter()
        .map(|u| match u.effect {
            Effect::HelperMilliCupsPerSecond { per_level } => {
                per_level * i64::from(level(s, &u.id))
            }
            _ => 0,
        })
        .sum()
}

/// Ingredient cost of one jug, after free ingredients.
pub fn jug_cost(m: &Manifest, s: &State) -> i64 {
    let free = |ing: &str| {
        m.upgrades.iter().any(|u| {
            matches!(&u.effect, Effect::FreeIngredient { ingredient } if ingredient == ing)
                && level(s, &u.id) > 0
        })
    };
    m.recipe
        .inputs
        .iter()
        .filter(|(id, _)| !free(id))
        .map(|(id, n)| m.ingredient(id).map_or(0, |i| i.price) * n)
        .sum()
}

/// Can the stand always make its next cup? Coins plus what the paid cups in
/// the jug will bring must cover a new jug (docs/03 §7).
fn can_continue(m: &Manifest, s: &State, coins: i64) -> bool {
    coins + s.jug_left * m.cup_price >= jug_cost(m, s)
}

/// Sell `cups`: book the money, then the ingredients of every new jug.
/// `reference` makes both ledger lines unique.
fn sell(
    m: &Manifest,
    s: &mut State,
    ctx: &mut RuleCtx,
    cups: i64,
    reference: &str,
) -> RuleResult<(i64, i64)> {
    let per_jug = m.recipe.cups;
    let new_jugs = if cups > s.jug_left {
        (cups - s.jug_left + per_jug - 1) / per_jug
    } else {
        0
    };
    let revenue = cups * m.cup_price;
    let materials = new_jugs * jug_cost(m, s);
    ctx.credit("sale", revenue, format!("sale:{reference}"));
    if materials > 0 {
        ctx.debit("materials", materials, format!("materials:{reference}"))?;
    }
    s.jug_left += new_jugs * per_jug - cups;
    s.stats.cups_sold += cups;
    s.stats.revenue += revenue;
    s.stats.materials += materials;
    Ok((revenue, materials))
}

/// Let the helpers work up to `ctx.now`, at most `away_cap_ms` at a time.
pub fn settle(m: &Manifest, s: &mut State, ctx: &mut RuleCtx) -> RuleResult<()> {
    let now = ctx.now;
    let Some(from) = s.settled_to else {
        s.settled_to = Some(now);
        return Ok(());
    };
    if now <= from {
        return Ok(());
    }
    let gap = (now - from).num_milliseconds();
    let worked = gap.min(m.away_cap_ms);
    let rate = helper_rate(m, s);
    s.settled_to = Some(now);
    if rate == 0 {
        return Ok(());
    }
    let milli = s.carry_milli + worked * rate / 1000;
    let cups = milli / 1000;
    s.carry_milli = milli % 1000;
    if cups == 0 {
        return Ok(());
    }
    let (revenue, materials) = sell(
        m,
        s,
        ctx,
        cups,
        &format!("auto:{}", from.timestamp_millis()),
    )?;
    s.stats.cups_by_helpers += cups;
    let data = json!({ "cups": cups, "revenue": revenue, "materials": materials });
    if gap > AWAY_NOTICE_MS {
        let mut data = data;
        data["awayMs"] = json!(gap);
        data["capped"] = json!(gap > m.away_cap_ms);
        ctx.emit("AwayEarnings", now, data);
    } else {
        ctx.emit("HelpersSold", now, data);
    }
    Ok(())
}

fn refill_taps(m: &Manifest, s: &mut State, now: DateTime<Utc>) {
    if let Some(at) = s.tap_at
        && now > at
    {
        let ms = (now - at).num_milliseconds().min(m.tap_burst * 1000);
        s.tap_milli = (s.tap_milli + ms * m.taps_per_second).min(m.tap_burst * 1000);
    }
    s.tap_at = Some(now);
}

pub fn apply(m: &Manifest, s: &mut State, cmd: Command, ctx: &mut RuleCtx) -> RuleResult<()> {
    let cmd_id = ctx.command_id.ok_or(RuleError::new("invalid_command"))?;
    match cmd {
        Command::Tap { count } => {
            if !(1..=MAX_TAPS_PER_COMMAND).contains(&count) {
                return Err(RuleError::new("invalid_command"));
            }
            refill_taps(m, s, ctx.now);
            // Taps beyond the allowance are ignored, not refused: a fast
            // child should never see an error for tapping.
            let taps = count.min(s.tap_milli / 1000);
            if taps == 0 {
                return Err(RuleError::new("too_fast"));
            }
            s.tap_milli -= taps * 1000;
            let cups = taps * cups_per_tap(m, s);
            let (revenue, materials) = sell(m, s, ctx, cups, &cmd_id.to_string())?;
            ctx.emit(
                "CupsSold",
                ctx.now,
                json!({ "taps": taps, "ignored": count - taps, "cups": cups, "revenue": revenue, "materials": materials }),
            );
        }
        Command::Collect {} => {}
        Command::BuyUpgrade { upgrade } => {
            let u = m
                .upgrade(&upgrade)
                .ok_or(RuleError::new("invalid_command"))?;
            let have = level(s, &u.id);
            let price = *u
                .prices
                .get(have as usize)
                .ok_or(RuleError::new("max_level"))?;
            if ctx.coins() < price {
                return Err(RuleError::new("not_enough_coins"));
            }
            let mut next = s.clone();
            next.upgrades.insert(u.id.clone(), have + 1);
            if !can_continue(m, &next, ctx.coins() - price) {
                return Err(RuleError::new("would_get_stuck"));
            }
            ctx.debit("upgrade", price, format!("upgrade:{}:{}", u.id, have + 1))?;
            *s = next;
            s.stats.invested += price;
            ctx.emit(
                "UpgradeBought",
                ctx.now,
                json!({ "upgrade": u.id, "level": have + 1, "price": price }),
            );
        }
    }
    Ok(())
}

/// Convert a version 1 game (rounds with customers). Unused stock is paid
/// back at the v1 prices (1 coin each); cups in the jug, or being made, stay
/// in the jug. Played rounds are not carried over.
pub fn convert_v1(m: &Manifest, old: &Value, ctx: &mut RuleCtx) -> RuleResult<State> {
    if old.get("schema").and_then(Value::as_u64) != Some(1) {
        return Err(RuleError::new("bad_state"));
    }
    const V1_STOCK_PRICE: i64 = 1;
    let count = |v: Option<&Value>| v.and_then(Value::as_i64).unwrap_or(0).max(0);
    let stock = old.get("stock");
    let refund = (count(stock.and_then(|s| s.get("lemon")))
        + count(stock.and_then(|s| s.get("sugar"))))
        * V1_STOCK_PRICE;
    let jug = old.get("jug");
    let making = jug
        .and_then(|j| j.get("making"))
        .is_some_and(|v| !v.is_null());
    let mut s = initial(m);
    s.jug_left = count(jug.and_then(|j| j.get("cups"))) + if making { m.recipe.cups } else { 0 };
    s.settled_to = Some(ctx.now);
    if refund > 0 {
        ctx.credit("conversion", refund, "convert:v1:stock".into());
    }
    ctx.emit(
        "GameConverted",
        ctx.now,
        json!({ "refund": refund, "jugLeft": s.jug_left }),
    );
    Ok(s)
}

/// What the child should do next: tap, or buy the cheapest upgrade they can
/// afford once they have sold their first jug.
pub fn next_step(m: &Manifest, s: &State, coins: i64) -> String {
    if s.stats.cups_sold < m.recipe.cups {
        return "tap".into();
    }
    m.upgrades
        .iter()
        .filter_map(|u| {
            let have = level(s, &u.id);
            let price = *u.prices.get(have as usize)?;
            let mut next = s.clone();
            next.upgrades.insert(u.id.clone(), have + 1);
            (coins >= price && can_continue(m, &next, coins - price)).then_some((price, &u.id))
        })
        .min()
        .map_or_else(|| "tap".into(), |(_, id)| format!("upgrade:{id}"))
}

pub fn view(m: &Manifest, s: &State, coins: i64, _now: DateTime<Utc>) -> Value {
    let upgrades: Vec<Value> = m
        .upgrades
        .iter()
        .map(|u| {
            let have = level(s, &u.id);
            json!({
                "id": u.id,
                "level": have,
                "maxLevel": u.prices.len(),
                "nextPrice": u.prices.get(have as usize),
            })
        })
        .collect();
    let rate = helper_rate(m, s);
    let cost = jug_cost(m, s);
    // Coins per minute from helpers, after ingredients (rounded down).
    let per_minute = rate * 60 * (m.cup_price * m.recipe.cups - cost) / (1000 * m.recipe.cups);
    json!({
        "coins": coins,
        "cupPrice": m.cup_price,
        "jugCost": cost,
        "cupsPerJug": m.recipe.cups,
        "cupsPerTap": cups_per_tap(m, s),
        "helperMilliCupsPerSecond": rate,
        "perMinute": per_minute,
        "jugLeft": s.jug_left,
        "upgrades": upgrades,
        "stats": {
            "cupsSold": s.stats.cups_sold,
            "cupsByHelpers": s.stats.cups_by_helpers,
            "revenue": s.stats.revenue,
            "materials": s.stats.materials,
            "profit": s.stats.revenue - s.stats.materials,
            "invested": s.stats.invested,
        },
        "nextStep": next_step(m, s, coins),
        "awayCapMs": m.away_cap_ms,
    })
}
