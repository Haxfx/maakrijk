use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use uuid::Uuid;

use crate::app::AppState;
use crate::http::error::ApiResult;
use crate::platform::auth::Household;
use crate::platform::profiles::{self, Profile};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NewProfile {
    pub nickname: String,
    pub avatar: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProfilePatch {
    pub nickname: Option<String>,
    pub avatar: Option<String>,
}

pub async fn list(
    State(s): State<AppState>,
    Household(h): Household,
) -> ApiResult<Json<Vec<Profile>>> {
    Ok(Json(profiles::list(&s.db, h).await?))
}

pub async fn create(
    State(s): State<AppState>,
    Household(h): Household,
    Json(body): Json<NewProfile>,
) -> ApiResult<(StatusCode, Json<Profile>)> {
    let p = profiles::create(&s.db, h, &body.nickname, &body.avatar).await?;
    Ok((StatusCode::CREATED, Json(p)))
}

pub async fn update(
    State(s): State<AppState>,
    Household(h): Household,
    Path(id): Path<Uuid>,
    Json(body): Json<ProfilePatch>,
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

pub async fn delete(
    State(s): State<AppState>,
    Household(h): Household,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    profiles::delete(&s.db, h, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
