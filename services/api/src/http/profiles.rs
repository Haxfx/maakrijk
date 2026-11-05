use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use uuid::Uuid;

use crate::app::AppState;
use crate::http::error::{ApiResult, ErrorBody};
use crate::http::json::ApiJson;
use crate::platform::auth::Household;
use crate::platform::profiles::{self, Profile};

#[derive(Deserialize, utoipa::ToSchema)]
#[serde(deny_unknown_fields)]
pub struct NewProfile {
    pub nickname: String,
    pub avatar: String,
}

#[derive(Deserialize, utoipa::ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ProfilePatch {
    pub nickname: Option<String>,
    pub avatar: Option<String>,
}

/// Profiles of the signed-in household, oldest first.
#[utoipa::path(get, path = "/api/profiles", tag = "profiles", security(("cookie" = []), ("bearer" = [])),
    responses((status = 200, body = Vec<Profile>), (status = 401, body = ErrorBody)))]
pub async fn list(
    State(s): State<AppState>,
    Household(h): Household,
) -> ApiResult<Json<Vec<Profile>>> {
    Ok(Json(profiles::list(&s.db, h).await?))
}

/// New profile. Errors: `nickname_length`, `nickname_invalid`, `avatar_invalid`,
/// `nickname_taken`, `profile_limit`, `invalid_body`.
#[utoipa::path(post, path = "/api/profiles", tag = "profiles", security(("cookie" = []), ("bearer" = [])),
    request_body = NewProfile,
    responses((status = 201, body = Profile), (status = 409, body = ErrorBody), (status = 422, body = ErrorBody)))]
pub async fn create(
    State(s): State<AppState>,
    Household(h): Household,
    ApiJson(body): ApiJson<NewProfile>,
) -> ApiResult<(StatusCode, Json<Profile>)> {
    let p = profiles::create(&s.db, h, &body.nickname, &body.avatar).await?;
    Ok((StatusCode::CREATED, Json(p)))
}

/// Change nickname and/or avatar.
#[utoipa::path(patch, path = "/api/profiles/{id}", tag = "profiles", security(("cookie" = []), ("bearer" = [])),
    params(("id" = Uuid, Path)), request_body = ProfilePatch,
    responses((status = 200, body = Profile), (status = 404, body = ErrorBody), (status = 409, body = ErrorBody), (status = 422, body = ErrorBody)))]
pub async fn update(
    State(s): State<AppState>,
    Household(h): Household,
    Path(id): Path<Uuid>,
    ApiJson(body): ApiJson<ProfilePatch>,
) -> ApiResult<Json<Profile>> {
    let p = profiles::update(
        &s.db,
        h,
        id,
        body.nickname.as_deref(),
        body.avatar.as_deref(),
    )
    .await?;
    Ok(Json(p))
}

/// Delete a profile and all of its data.
#[utoipa::path(delete, path = "/api/profiles/{id}", tag = "profiles", security(("cookie" = []), ("bearer" = [])),
    params(("id" = Uuid, Path)),
    responses((status = 204), (status = 404, body = ErrorBody)))]
pub async fn delete(
    State(s): State<AppState>,
    Household(h): Household,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    profiles::delete(&s.db, h, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
