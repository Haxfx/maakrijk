//! `POST /api/session`: make sure this device has a household session.

use axum::Json;
use axum::extract::State;
use axum::http::request::Parts;
use axum::response::IntoResponse;
use axum_extra::extract::CookieJar;
use serde::Serialize;
use uuid::Uuid;

use crate::app::AppState;
use crate::http::error::{ApiError, ApiResult};
use crate::platform::auth::{
    self, CLIENT_HEADER, CSRF_HEADER, check_csrf, household_for_token, presented_token,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub household_id: Uuid,
    /// True when this request created a new household.
    pub created: bool,
    /// Only for a native shell that asked for it; web clients never see the token.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
}

/// Reuses a valid session, or creates a new household with a new session.
pub async fn ensure_session(
    State(state): State<AppState>,
    parts: Parts,
    jar: CookieJar,
) -> ApiResult<impl IntoResponse> {
    let presented = presented_token(&parts);
    match &presented {
        Some(p) => check_csrf(&parts, p.via)?,
        // Creating a session needs no credentials, but still one of our own
        // headers, so a cross-site form cannot plant a new household cookie.
        None => {
            let ours = parts.headers.contains_key(CSRF_HEADER)
                || parts.headers.contains_key(CLIENT_HEADER);
            if !ours {
                return Err(ApiError::Forbidden("csrf"));
            }
        }
    }

    if let Some(p) = &presented
        && let Some(household) = household_for_token(&state.db, &p.token).await?
    {
        let info = SessionInfo {
            household_id: household,
            created: false,
            token: None,
        };
        return Ok((jar, Json(info)));
    }

    let (household, token) = auth::create_household(&state.db).await?;
    let native = parts
        .headers
        .get(CLIENT_HEADER)
        .is_some_and(|v| v == "native");
    let jar = jar.add(auth::session_cookie(
        token.clone(),
        state.config.cookie_secure,
    ));
    let info = SessionInfo {
        household_id: household,
        created: true,
        token: native.then_some(token),
    };
    Ok((jar, Json(info)))
}
