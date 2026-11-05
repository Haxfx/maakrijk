use axum::Json;
use axum::extract::{Path, State};
use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;

use crate::app::AppState;
use crate::http::error::{ApiResult, ErrorBody};
use crate::http::json::ApiJson;
use crate::platform::auth::Household;
use crate::platform::games::{self, GameResponse, GameSummary};

#[derive(Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StartGame {
    pub scenario_id: String,
}

#[derive(Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CommandRequest {
    /// Client-chosen id. Retrying with the same id and payload returns the stored answer.
    pub command_id: Uuid,
    /// `{ "type": "...", ... }`, see the scenario contract.
    #[schema(value_type = Object)]
    pub command: Value,
}

/// The profile's businesses.
#[utoipa::path(get, path = "/api/profiles/{id}/games", tag = "games", security(("cookie" = []), ("bearer" = [])),
    params(("id" = Uuid, Path)), responses((status = 200, body = Vec<GameSummary>), (status = 404, body = ErrorBody)))]
pub async fn list(
    State(s): State<AppState>,
    Household(h): Household,
    Path(profile): Path<Uuid>,
) -> ApiResult<Json<Vec<GameSummary>>> {
    Ok(Json(games::list(&s.db, h, profile).await?))
}

/// Start a business for the profile, or return the existing one.
#[utoipa::path(post, path = "/api/profiles/{id}/games", tag = "games", security(("cookie" = []), ("bearer" = [])),
    params(("id" = Uuid, Path)), request_body = StartGame,
    responses((status = 200, body = GameResponse), (status = 404, body = ErrorBody), (status = 422, body = ErrorBody)))]
pub async fn start(
    State(s): State<AppState>,
    Household(h): Household,
    Path(profile): Path<Uuid>,
    ApiJson(body): ApiJson<StartGame>,
) -> ApiResult<Json<GameResponse>> {
    let id = games::start(&s.db, &s.registry, h, profile, &body.scenario_id).await?;
    Ok(Json(
        games::view(&s.db, &s.registry, s.clock.as_ref(), h, id).await?,
    ))
}

/// Current state of a game, with time settled.
#[utoipa::path(get, path = "/api/games/{id}", tag = "games", security(("cookie" = []), ("bearer" = [])),
    params(("id" = Uuid, Path)), responses((status = 200, body = GameResponse), (status = 404, body = ErrorBody)))]
pub async fn get(
    State(s): State<AppState>,
    Household(h): Household,
    Path(game): Path<Uuid>,
) -> ApiResult<Json<GameResponse>> {
    Ok(Json(
        games::view(&s.db, &s.registry, s.clock.as_ref(), h, game).await?,
    ))
}

/// Run one command. Refusals return 422 with a stable code and change nothing.
#[utoipa::path(post, path = "/api/games/{id}/commands", tag = "games", security(("cookie" = []), ("bearer" = [])),
    params(("id" = Uuid, Path)), request_body = CommandRequest,
    responses((status = 200, body = GameResponse), (status = 404, body = ErrorBody), (status = 409, body = ErrorBody), (status = 422, body = ErrorBody)))]
pub async fn command(
    State(s): State<AppState>,
    Household(h): Household,
    Path(game): Path<Uuid>,
    ApiJson(body): ApiJson<CommandRequest>,
) -> ApiResult<Json<GameResponse>> {
    Ok(Json(
        games::execute(
            &s.db,
            &s.registry,
            s.clock.as_ref(),
            h,
            game,
            body.command_id,
            &body.command,
        )
        .await?,
    ))
}
