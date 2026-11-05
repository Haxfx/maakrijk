//! `GET /api/version`: which build runs, against which database and contract.

use axum::Json;
use axum::extract::State;
use serde::Serialize;

use crate::app::AppState;
use crate::http::error::ApiResult;

/// Raise when an API change is not backward compatible. Must equal
/// `expectedContract` in `apps/web/nuxt.config.ts`.
pub const API_CONTRACT_VERSION: u32 = 1;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionInfo {
    pub api: &'static str,
    pub git_commit: &'static str,
    pub dirty: bool,
    pub build_time: &'static str,
    pub contract: u32,
    /// Database name only, never the connection URL.
    pub database: String,
    /// Latest applied migration version, if any.
    pub migration: Option<i64>,
}

pub async fn version(State(state): State<AppState>) -> ApiResult<Json<VersionInfo>> {
    let migration: Option<i64> =
        sqlx::query_scalar("SELECT max(version) FROM _sqlx_migrations WHERE success")
            .fetch_one(&state.db)
            .await?;
    Ok(Json(VersionInfo {
        api: env!("CARGO_PKG_VERSION"),
        git_commit: env!("MAAKRIJK_GIT_COMMIT"),
        dirty: env!("MAAKRIJK_GIT_DIRTY") == "true",
        build_time: env!("MAAKRIJK_BUILD_TIME"),
        contract: API_CONTRACT_VERSION,
        database: state.config.database_name(),
        migration,
    }))
}
