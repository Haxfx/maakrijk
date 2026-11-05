//! The boundary between the platform and a scenario's rules.
//!
//! A `Ruleset` never touches the database. It receives its own typed state
//! (as JSON at this boundary, so the registry stays object-safe), mutates it,
//! books coins through `RuleCtx` and emits events. The platform persists the
//! result atomically.

use std::collections::BTreeMap;
use std::sync::Arc;

use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use uuid::Uuid;

/// A refused command or invalid input. `code` is stable and shown to the
/// child as a Dutch text by the client. Nothing is saved when this is returned.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuleError {
    pub code: &'static str,
}

impl RuleError {
    pub const fn new(code: &'static str) -> Self {
        Self { code }
    }
}

pub type RuleResult<T> = Result<T, RuleError>;

/// One coin booking, written to `economy_transactions` by the platform.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct LedgerEntry {
    pub kind: &'static str,
    pub amount: i64,
    pub reference: String,
}

/// Something that happened, for animation and sound. Not authoritative.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct GameEvent {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Value::is_null")]
    pub data: Value,
}

/// What a ruleset may do besides changing its own state.
pub struct RuleCtx {
    pub now: DateTime<Utc>,
    /// The command being applied; `None` while only settling time.
    pub command_id: Option<Uuid>,
    coins: i64,
    entries: Vec<LedgerEntry>,
    events: Vec<GameEvent>,
}

impl RuleCtx {
    pub fn new(now: DateTime<Utc>, command_id: Option<Uuid>, coins: i64) -> Self {
        Self {
            now,
            command_id,
            coins,
            entries: Vec::new(),
            events: Vec::new(),
        }
    }

    pub fn coins(&self) -> i64 {
        self.coins
    }

    /// Spend coins. Refused (and nothing booked) when the balance is too low.
    pub fn debit(&mut self, kind: &'static str, amount: i64, reference: String) -> RuleResult<()> {
        assert!(amount > 0, "debit amount must be positive");
        if self.coins < amount {
            return Err(RuleError::new("not_enough_coins"));
        }
        self.coins -= amount;
        self.entries.push(LedgerEntry {
            kind,
            amount: -amount,
            reference,
        });
        Ok(())
    }

    pub fn credit(&mut self, kind: &'static str, amount: i64, reference: String) {
        assert!(amount > 0, "credit amount must be positive");
        self.coins += amount;
        self.entries.push(LedgerEntry {
            kind,
            amount,
            reference,
        });
    }

    pub fn emit(&mut self, kind: &'static str, at: DateTime<Utc>, data: Value) {
        self.events.push(GameEvent { kind, at, data });
    }

    pub fn into_parts(self) -> (i64, Vec<LedgerEntry>, Vec<GameEvent>) {
        (self.coins, self.entries, self.events)
    }
}

/// Starting point of a new game instance.
pub struct Start {
    pub coins: i64,
    pub state: Value,
}

pub trait Ruleset: Send + Sync {
    fn scenario_id(&self) -> &'static str;
    /// Version of the definition (manifest) new games start on.
    fn definition_version(&self) -> i32;
    fn ruleset_id(&self) -> &'static str;
    fn ruleset_version(&self) -> i32;
    /// The immutable definition for `definition_version`, stored with its hash.
    fn manifest(&self) -> Value;
    fn start(&self) -> Start;
    /// Bring the state up to `ctx.now`: finish due work, let customers arrive.
    fn settle(&self, state: &mut Value, ctx: &mut RuleCtx) -> RuleResult<()>;
    /// Validate and apply one command. On `Err` the platform discards everything.
    fn apply(&self, state: &mut Value, command: &Value, ctx: &mut RuleCtx) -> RuleResult<()>;
    /// Convert a game stored under an older ruleset version to the current
    /// one. May book coins (e.g. pay back stock that no longer exists).
    fn upgrade(&self, from_version: i32, _state: &mut Value, _ctx: &mut RuleCtx) -> RuleResult<()> {
        let _ = from_version;
        Err(RuleError::new("bad_state"))
    }
    /// Read model for the client, computed from a settled state.
    fn view(&self, state: &Value, coins: i64, now: DateTime<Utc>) -> RuleResult<Value>;
}

/// Compile-time list of rulesets, keyed by scenario id. Injected through
/// `AppState`, so tests can add their own.
#[derive(Clone, Default)]
pub struct Registry {
    by_scenario: BTreeMap<&'static str, Arc<dyn Ruleset>>,
}

impl Registry {
    pub fn with(mut self, r: Arc<dyn Ruleset>) -> Self {
        let id = r.scenario_id();
        assert!(
            self.by_scenario.insert(id, r).is_none(),
            "duplicate scenario {id}"
        );
        self
    }

    pub fn get(&self, scenario_id: &str) -> Option<&Arc<dyn Ruleset>> {
        self.by_scenario.get(scenario_id)
    }

    /// The ruleset for a stored instance, checking the ruleset id. Games on an
    /// older ruleset version are converted with `Ruleset::upgrade`.
    pub fn for_instance(
        &self,
        scenario_id: &str,
        ruleset_id: &str,
        ruleset_version: i32,
    ) -> Option<&Arc<dyn Ruleset>> {
        self.get(scenario_id)
            .filter(|r| r.ruleset_id() == ruleset_id && r.ruleset_version() >= ruleset_version)
    }

    pub fn all(&self) -> impl Iterator<Item = &Arc<dyn Ruleset>> {
        self.by_scenario.values()
    }
}
