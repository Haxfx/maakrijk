//! A tiny test-only scenario to exercise the platform pipeline without game
//! rules: `buy` spends coins and adds items, `sell` earns, `wait` starts a
//! timed job that `settle` finishes.

use chrono::{DateTime, Duration, Utc};
use maakrijk_api::platform::scenario::{RuleCtx, RuleError, RuleResult, Ruleset, Start};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

pub struct Counter;

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct State {
    items: i64,
    job_done_at: Option<DateTime<Utc>>,
    jobs_done: i64,
    sales: i64,
}

fn load(v: &Value) -> RuleResult<State> {
    serde_json::from_value(v.clone()).map_err(|_| RuleError::new("bad_state"))
}

fn store(s: &State, v: &mut Value) {
    *v = serde_json::to_value(s).unwrap();
}

impl Ruleset for Counter {
    fn scenario_id(&self) -> &'static str {
        "test-counter"
    }
    fn definition_version(&self) -> i32 {
        1
    }
    fn ruleset_id(&self) -> &'static str {
        "test-counter"
    }
    fn ruleset_version(&self) -> i32 {
        1
    }
    fn manifest(&self) -> Value {
        json!({"scenarioId": "test-counter", "price": 2})
    }
    fn start(&self) -> Start {
        Start {
            coins: 10,
            state: serde_json::to_value(State::default()).unwrap(),
        }
    }

    fn settle(&self, state: &mut Value, ctx: &mut RuleCtx) -> RuleResult<()> {
        let mut s = load(state)?;
        if let Some(t) = s.job_done_at
            && t <= ctx.now
        {
            s.job_done_at = None;
            s.jobs_done += 1;
            ctx.emit("JobDone", t, Value::Null);
        }
        store(&s, state);
        Ok(())
    }

    fn apply(&self, state: &mut Value, cmd: &Value, ctx: &mut RuleCtx) -> RuleResult<()> {
        let mut s = load(state)?;
        let id = ctx.command_id.unwrap();
        match cmd["type"].as_str() {
            Some("buy") => {
                let n = cmd["n"]
                    .as_i64()
                    .filter(|n| *n > 0)
                    .ok_or(RuleError::new("invalid_command"))?;
                ctx.debit("purchase", n * 2, format!("buy:{id}"))?;
                s.items += n;
            }
            Some("sell") => {
                if s.items == 0 {
                    return Err(RuleError::new("nothing_to_sell"));
                }
                s.items -= 1;
                s.sales += 1;
                ctx.credit("sale", 3, format!("sale:{}", s.sales));
            }
            Some("wait") => {
                if s.job_done_at.is_some() {
                    return Err(RuleError::new("busy"));
                }
                s.job_done_at = Some(ctx.now + Duration::seconds(3));
            }
            Some("doubleBook") => {
                // A buggy rule: books the same reference twice.
                ctx.credit("sale", 1, "same".into());
                ctx.credit("sale", 1, "same".into());
            }
            _ => return Err(RuleError::new("invalid_command")),
        }
        store(&s, state);
        Ok(())
    }

    fn view(&self, state: &Value, coins: i64, _now: DateTime<Utc>) -> RuleResult<Value> {
        let s = load(state)?;
        Ok(
            json!({"items": s.items, "jobsDone": s.jobs_done, "busy": s.job_done_at.is_some(), "coins": coins}),
        )
    }
}
