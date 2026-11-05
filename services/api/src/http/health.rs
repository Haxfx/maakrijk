use axum::Json;
use axum::extract::State;
use serde::Serialize;

use crate::app::AppState;
use crate::http::error::ApiResult;

#[derive(Serialize)]
pub struct Health {
    pub status: &'static str,
}

/// Liveness plus a database round trip.
pub async fn health(State(state): State<AppState>) -> ApiResult<Json<Health>> {
    sqlx::query("SELECT 1").execute(&state.db).await?;
    Ok(Json(Health { status: "ok" }))
}
