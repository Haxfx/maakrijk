//! Lemonade stand scenario: a clicker. Tap the press to sell cups, buy
//! upgrades by tapping objects, helpers keep selling.

pub mod manifest;
pub mod rules;

#[cfg(test)]
mod tests;

use chrono::{DateTime, Utc};
use serde_json::Value;

use crate::platform::scenario::{RuleCtx, RuleError, RuleResult, Ruleset, Start};
use manifest::Manifest;
use rules::State;

pub struct Lemonade {
    manifest: Manifest,
}

impl Lemonade {
    pub fn new() -> Self {
        let manifest = manifest::v2();
        manifest
            .validate()
            .expect("lemonade manifest v2 is invalid");
        Self { manifest }
    }
}

impl Default for Lemonade {
    fn default() -> Self {
        Self::new()
    }
}

fn load(v: &Value) -> RuleResult<State> {
    let s: State = serde_json::from_value(v.clone()).map_err(|_| RuleError::new("bad_state"))?;
    if s.schema != rules::STATE_SCHEMA {
        return Err(RuleError::new("bad_state"));
    }
    Ok(s)
}

fn store(s: &State) -> RuleResult<Value> {
    serde_json::to_value(s).map_err(|_| RuleError::new("bad_state"))
}

impl Ruleset for Lemonade {
    fn scenario_id(&self) -> &'static str {
        manifest::SCENARIO_ID
    }
    fn definition_version(&self) -> i32 {
        manifest::DEFINITION_VERSION
    }
    fn ruleset_id(&self) -> &'static str {
        manifest::RULESET_ID
    }
    fn ruleset_version(&self) -> i32 {
        manifest::RULESET_VERSION
    }
    fn manifest(&self) -> Value {
        serde_json::to_value(&self.manifest).expect("serialize manifest")
    }
    fn start(&self) -> Start {
        Start {
            coins: self.manifest.starting_coins,
            state: store(&rules::initial(&self.manifest)).expect("initial state"),
        }
    }
    fn settle(&self, state: &mut Value, ctx: &mut RuleCtx) -> RuleResult<()> {
        let mut s = load(state)?;
        rules::settle(&self.manifest, &mut s, ctx)?;
        *state = store(&s)?;
        Ok(())
    }
    fn apply(&self, state: &mut Value, command: &Value, ctx: &mut RuleCtx) -> RuleResult<()> {
        let cmd = serde_json::from_value(command.clone())
            .map_err(|_| RuleError::new("invalid_command"))?;
        let mut s = load(state)?;
        rules::apply(&self.manifest, &mut s, cmd, ctx)?;
        *state = store(&s)?;
        Ok(())
    }
    fn upgrade(&self, from_version: i32, state: &mut Value, ctx: &mut RuleCtx) -> RuleResult<()> {
        if from_version != 1 {
            return Err(RuleError::new("bad_state"));
        }
        let s = rules::convert_v1(&self.manifest, state, ctx)?;
        *state = store(&s)?;
        Ok(())
    }
    fn view(&self, state: &Value, coins: i64, now: DateTime<Utc>) -> RuleResult<Value> {
        Ok(rules::view(&self.manifest, &load(state)?, coins, now))
    }
}
