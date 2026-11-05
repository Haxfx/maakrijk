//! Game instances and the command pipeline
//! (docs/build/contracts/0.2-game-core.md §3).

use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::http::error::ApiError;
use crate::platform::clock::Clock;
use crate::platform::scenario::{GameEvent, LedgerEntry, Registry, RuleCtx, RuleError, Ruleset};

/// SHA-256 of a JSON value. `serde_json::Map` keeps keys sorted, so equal
/// values always give the same bytes.
pub fn json_hash(v: &Value) -> [u8; 32] {
    Sha256::digest(serde_json::to_vec(v).expect("serialize json")).into()
}

#[derive(Debug, thiserror::Error)]
pub enum DefinitionError {
    #[error(
        "scenario {0} version {1} is already stored with different content; raise the definition version"
    )]
    Changed(&'static str, i32),
    #[error(transparent)]
    Db(#[from] sqlx::Error),
}

/// Store each ruleset's current definition. A stored definition is immutable:
/// different content under the same version stops the server.
pub async fn sync_definitions(db: &PgPool, registry: &Registry) -> Result<(), DefinitionError> {
    for r in registry.all() {
        let manifest = r.manifest();
        let hash = json_hash(&manifest);
        sqlx::query(
            "INSERT INTO scenario_definitions (scenario_id, version, hash, manifest) VALUES ($1, $2, $3, $4)
             ON CONFLICT (scenario_id, version) DO NOTHING",
        )
        .bind(r.scenario_id())
        .bind(r.definition_version())
        .bind(&hash[..])
        .bind(&manifest)
        .execute(db)
        .await?;
        let stored: Vec<u8> = sqlx::query_scalar(
            "SELECT hash FROM scenario_definitions WHERE scenario_id = $1 AND version = $2",
        )
        .bind(r.scenario_id())
        .bind(r.definition_version())
        .fetch_one(db)
        .await?;
        if stored != hash {
            return Err(DefinitionError::Changed(
                r.scenario_id(),
                r.definition_version(),
            ));
        }
    }
    Ok(())
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GameSummary {
    pub id: Uuid,
    pub scenario_id: String,
    pub coins: i64,
}

/// Full game read model.
#[derive(Debug, Clone, Serialize, serde::Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GameResponse {
    pub id: Uuid,
    pub profile_id: Uuid,
    pub scenario_id: String,
    pub revision: i64,
    pub coins: i64,
    pub server_now: DateTime<Utc>,
    /// Scenario-specific read model (see the scenario's schema).
    #[schema(value_type = Object)]
    pub view: Value,
    /// What happened in this command, oldest first. For animation only.
    #[schema(value_type = Vec<Object>)]
    pub events: Value,
}

fn rule_err(e: RuleError) -> ApiError {
    ApiError::Invalid {
        code: e.code,
        field: None,
    }
}

fn internal(msg: &str) -> ApiError {
    ApiError::Internal(msg.to_string().into())
}

async fn check_profile(db: &PgPool, household: Uuid, profile: Uuid) -> Result<(), ApiError> {
    let ok: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM profiles WHERE id = $1 AND household_id = $2)",
    )
    .bind(profile)
    .bind(household)
    .fetch_one(db)
    .await?;
    if ok { Ok(()) } else { Err(ApiError::NotFound) }
}

pub async fn list(
    db: &PgPool,
    household: Uuid,
    profile: Uuid,
) -> Result<Vec<GameSummary>, ApiError> {
    check_profile(db, household, profile).await?;
    let rows: Vec<(Uuid, String, i64)> =
        sqlx::query_as("SELECT id, scenario_id, coins FROM game_instances WHERE profile_id = $1 ORDER BY created_at")
            .bind(profile)
            .fetch_all(db)
            .await?;
    Ok(rows
        .into_iter()
        .map(|(id, scenario_id, coins)| GameSummary {
            id,
            scenario_id,
            coins,
        })
        .collect())
}

/// Start the profile's game for a scenario, or return the existing one.
pub async fn start(
    db: &PgPool,
    registry: &Registry,
    household: Uuid,
    profile: Uuid,
    scenario_id: &str,
) -> Result<Uuid, ApiError> {
    check_profile(db, household, profile).await?;
    let r = registry.get(scenario_id).ok_or(ApiError::Invalid {
        code: "unknown_scenario",
        field: Some("scenarioId"),
    })?;
    let mut tx = db.begin().await?;
    // Serialize starts for this profile, so two taps cannot both insert.
    sqlx::query("SELECT id FROM profiles WHERE id = $1 FOR UPDATE")
        .bind(profile)
        .execute(&mut *tx)
        .await?;
    let existing: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM game_instances WHERE profile_id = $1 AND scenario_id = $2",
    )
    .bind(profile)
    .bind(scenario_id)
    .fetch_optional(&mut *tx)
    .await?;
    if let Some(id) = existing {
        tx.commit().await?;
        return Ok(id);
    }
    let id = Uuid::now_v7();
    let s = r.start();
    sqlx::query(
        "INSERT INTO game_instances (id, profile_id, scenario_id, scenario_version, ruleset_id, ruleset_version, coins, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    )
    .bind(id)
    .bind(profile)
    .bind(r.scenario_id())
    .bind(r.definition_version())
    .bind(r.ruleset_id())
    .bind(r.ruleset_version())
    .bind(s.coins)
    .bind(&s.state)
    .execute(&mut *tx)
    .await?;
    if s.coins > 0 {
        let start = LedgerEntry {
            kind: "start",
            amount: s.coins,
            reference: format!("start:{id}"),
        };
        write_ledger(&mut tx, id, None, 0, 0, &[start]).await?;
    }
    check_ledger(&mut tx, id, s.coins).await?;
    tx.commit().await?;
    Ok(id)
}

struct Row {
    id: Uuid,
    profile_id: Uuid,
    scenario_id: String,
    ruleset_id: String,
    ruleset_version: i32,
    revision: i64,
    coins: i64,
    state: Value,
}

async fn load(
    tx: &mut Transaction<'_, Postgres>,
    household: Uuid,
    game: Uuid,
    lock: bool,
) -> Result<Row, ApiError> {
    let sql = format!(
        "SELECT g.profile_id, g.scenario_id, g.ruleset_id, g.ruleset_version, g.revision, g.coins, g.state
         FROM game_instances g JOIN profiles p ON p.id = g.profile_id
         WHERE g.id = $1 AND p.household_id = $2 {}",
        if lock { "FOR UPDATE OF g" } else { "" }
    );
    let row: Option<(Uuid, String, String, i32, i64, i64, Value)> = sqlx::query_as(&sql)
        .bind(game)
        .bind(household)
        .fetch_optional(&mut **tx)
        .await?;
    let (profile_id, scenario_id, ruleset_id, ruleset_version, revision, coins, state) =
        row.ok_or(ApiError::NotFound)?;
    Ok(Row {
        id: game,
        profile_id,
        scenario_id,
        ruleset_id,
        ruleset_version,
        revision,
        coins,
        state,
    })
}

fn ruleset<'a>(registry: &'a Registry, row: &Row) -> Result<&'a dyn Ruleset, ApiError> {
    registry
        .for_instance(&row.scenario_id, &row.ruleset_id, row.ruleset_version)
        .map(|r| r.as_ref())
        .ok_or_else(|| internal("no ruleset for stored game"))
}

fn response(
    row: &Row,
    r: &dyn Ruleset,
    revision: i64,
    coins: i64,
    state: &Value,
    now: DateTime<Utc>,
    events: &[GameEvent],
) -> Result<GameResponse, ApiError> {
    Ok(GameResponse {
        id: row.id,
        profile_id: row.profile_id,
        scenario_id: row.scenario_id.clone(),
        revision,
        coins,
        server_now: now,
        view: r.view(state, coins, now).map_err(rule_err)?,
        events: serde_json::to_value(events).map_err(|e| ApiError::Internal(Box::new(e)))?,
    })
}

/// Current state with time settled in memory. Nothing is written.
pub async fn view(
    db: &PgPool,
    registry: &Registry,
    clock: &dyn Clock,
    household: Uuid,
    game: Uuid,
) -> Result<GameResponse, ApiError> {
    let mut tx = db.begin().await?;
    let row = load(&mut tx, household, game, false).await?;
    tx.rollback().await?;
    let r = ruleset(registry, &row)?;
    let now = clock.now();
    let mut state = row.state.clone();
    let mut ctx = RuleCtx::new(now, None, row.coins);
    r.settle(&mut state, &mut ctx).map_err(rule_err)?;
    let (coins, entries, _) = ctx.into_parts();
    if !entries.is_empty() {
        return Err(internal("settling must not book coins"));
    }
    response(&row, r, row.revision, coins, &state, now, &[])
}

/// Run one command through the pipeline. See the contract for the steps.
pub async fn execute(
    db: &PgPool,
    registry: &Registry,
    clock: &dyn Clock,
    household: Uuid,
    game: Uuid,
    command_id: Uuid,
    command: &Value,
) -> Result<GameResponse, ApiError> {
    let mut tx = db.begin().await?;
    let row = load(&mut tx, household, game, true).await?;
    let now = clock.now();
    let hash = json_hash(command);

    let seen: Option<(Vec<u8>, Value)> =
        sqlx::query_as("SELECT payload_hash, response FROM game_commands WHERE instance_id = $1 AND command_id = $2")
            .bind(game)
            .bind(command_id)
            .fetch_optional(&mut *tx)
            .await?;
    if let Some((stored_hash, stored)) = seen {
        tx.rollback().await?;
        if stored_hash != hash {
            return Err(ApiError::Conflict("command_conflict"));
        }
        return serde_json::from_value(stored).map_err(|e| ApiError::Internal(Box::new(e)));
    }

    let r = ruleset(registry, &row)?;
    let mut state = row.state.clone();
    let mut ctx = RuleCtx::new(now, Some(command_id), row.coins);
    r.settle(&mut state, &mut ctx).map_err(rule_err)?;
    r.apply(&mut state, command, &mut ctx).map_err(rule_err)?;
    let (coins, entries, events) = ctx.into_parts();
    if coins < 0 {
        return Err(internal("negative balance"));
    }

    let revision = row.revision + 1;
    write_ledger(
        &mut tx,
        game,
        Some(command_id),
        revision,
        row.coins,
        &entries,
    )
    .await?;
    sqlx::query("UPDATE game_instances SET state = $2, coins = $3, revision = $4, updated_at = now() WHERE id = $1")
        .bind(game)
        .bind(&state)
        .bind(coins)
        .bind(revision)
        .execute(&mut *tx)
        .await?;
    check_ledger(&mut tx, game, coins).await?;

    let res = response(&row, r, revision, coins, &state, now, &events)?;
    let stored = serde_json::to_value(&res).map_err(|e| ApiError::Internal(Box::new(e)))?;
    sqlx::query("INSERT INTO game_commands (instance_id, command_id, payload_hash, response) VALUES ($1, $2, $3, $4)")
        .bind(game)
        .bind(command_id)
        .bind(&hash[..])
        .bind(&stored)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(res)
}

async fn write_ledger(
    tx: &mut Transaction<'_, Postgres>,
    game: Uuid,
    command_id: Option<Uuid>,
    revision: i64,
    mut balance: i64,
    entries: &[LedgerEntry],
) -> Result<(), ApiError> {
    for e in entries {
        balance += e.amount;
        let done = sqlx::query(
            "INSERT INTO economy_transactions (id, instance_id, kind, amount, reference, command_id, revision, balance_after)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (instance_id, reference) DO NOTHING",
        )
        .bind(Uuid::now_v7())
        .bind(game)
        .bind(e.kind)
        .bind(e.amount)
        .bind(&e.reference)
        .bind(command_id)
        .bind(revision)
        .bind(balance)
        .execute(&mut **tx)
        .await?;
        if done.rows_affected() == 0 {
            // The rules tried to book the same economic event twice.
            return Err(internal("duplicate ledger reference"));
        }
    }
    Ok(())
}

/// Invariant: the ledger reconstructs the balance.
async fn check_ledger(
    tx: &mut Transaction<'_, Postgres>,
    game: Uuid,
    coins: i64,
) -> Result<(), ApiError> {
    let sum: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(amount), 0)::bigint FROM economy_transactions WHERE instance_id = $1",
    )
    .bind(game)
    .fetch_one(&mut **tx)
    .await?;
    if sum != coins {
        tracing::error!(%game, sum, coins, "ledger does not match balance");
        return Err(internal("ledger does not match balance"));
    }
    Ok(())
}
