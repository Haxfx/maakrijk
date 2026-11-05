//! Anonymous household sessions.
//!
//! A session token is 32 random bytes, sent either as an HttpOnly cookie (web,
//! same origin) or as `Authorization: Bearer` (a native app shell, D4). Only
//! its SHA-256 hash is stored. Cookie requests that change data must carry the
//! `X-Maakrijk` header: a cross-site form cannot set it, so this blocks CSRF.

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::{Method, header};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use chrono::{DateTime, Duration, Utc};
use rand::RngCore;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::app::AppState;
use crate::http::error::ApiError;

pub const COOKIE_NAME: &str = "mk_session";
pub const CSRF_HEADER: &str = "x-maakrijk";
/// A native shell asks for the token in the response body with this header.
pub const CLIENT_HEADER: &str = "x-maakrijk-client";
/// Browsers cap cookie lifetime at 400 days.
pub const SESSION_DAYS: i64 = 400;

pub fn new_token() -> String {
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn hash_token(token: &str) -> [u8; 32] {
    Sha256::digest(token.as_bytes()).into()
}

pub fn session_cookie(token: String, secure: bool) -> Cookie<'static> {
    Cookie::build((COOKIE_NAME, token))
        .http_only(true)
        .same_site(SameSite::Strict)
        .secure(secure)
        .path("/api")
        .max_age(time_days(SESSION_DAYS))
        .build()
}

fn time_days(days: i64) -> time::Duration {
    time::Duration::days(days)
}

/// How the request proved who it is.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthVia {
    Cookie,
    Bearer,
}

/// The token a request carries, before it is checked against the database.
#[derive(Debug)]
pub struct PresentedToken {
    pub token: String,
    pub via: AuthVia,
}

pub fn presented_token(parts: &Parts) -> Option<PresentedToken> {
    if let Some(value) = parts.headers.get(header::AUTHORIZATION) {
        let token = value.to_str().ok()?.strip_prefix("Bearer ")?.trim();
        return (!token.is_empty()).then(|| PresentedToken {
            token: token.to_string(),
            via: AuthVia::Bearer,
        });
    }
    let jar = CookieJar::from_headers(&parts.headers);
    jar.get(COOKIE_NAME).map(|c| PresentedToken {
        token: c.value().to_string(),
        via: AuthVia::Cookie,
    })
}

/// Reject cookie-authenticated writes without the custom header.
pub fn check_csrf(parts: &Parts, via: AuthVia) -> Result<(), ApiError> {
    let safe = matches!(parts.method, Method::GET | Method::HEAD | Method::OPTIONS);
    if via == AuthVia::Cookie && !safe && !parts.headers.contains_key(CSRF_HEADER) {
        return Err(ApiError::Forbidden("csrf"));
    }
    Ok(())
}

/// Household for a valid, unexpired token. Refreshes `last_seen_at` at most hourly.
pub async fn household_for_token(db: &PgPool, token: &str) -> Result<Option<Uuid>, ApiError> {
    let hash = hash_token(token);
    let row: Option<(Uuid, DateTime<Utc>)> = sqlx::query_as(
        "SELECT household_id, last_seen_at FROM auth_sessions WHERE token_hash = $1 AND expires_at > now()",
    )
    .bind(&hash[..])
    .fetch_optional(db)
    .await?;
    let Some((household, last_seen)) = row else {
        return Ok(None);
    };
    if Utc::now() - last_seen > Duration::hours(1) {
        sqlx::query(
            "UPDATE auth_sessions SET last_seen_at = now(), expires_at = now() + make_interval(days => $2) WHERE token_hash = $1",
        )
        .bind(&hash[..])
        .bind(SESSION_DAYS as i32)
        .execute(db)
        .await?;
    }
    Ok(Some(household))
}

/// A new household with one session. Returns the household id and the raw token.
pub async fn create_household(db: &PgPool) -> Result<(Uuid, String), ApiError> {
    let household = Uuid::now_v7();
    let token = new_token();
    let mut tx = db.begin().await?;
    sqlx::query("INSERT INTO households (id) VALUES ($1)")
        .bind(household)
        .execute(&mut *tx)
        .await?;
    sqlx::query(
        "INSERT INTO auth_sessions (token_hash, household_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))",
    )
    .bind(&hash_token(&token)[..])
    .bind(household)
    .bind(SESSION_DAYS as i32)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok((household, token))
}

/// Extractor: the signed-in household. 401 without a valid session.
#[derive(Debug, Clone, Copy)]
pub struct Household(pub Uuid);

impl FromRequestParts<AppState> for Household {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let presented = presented_token(parts).ok_or(ApiError::Unauthorized)?;
        check_csrf(parts, presented.via)?;
        household_for_token(&state.db, &presented.token)
            .await?
            .map(Household)
            .ok_or(ApiError::Unauthorized)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokens_are_random_and_hash_is_stable() {
        let a = new_token();
        let b = new_token();
        assert_ne!(a, b);
        assert_eq!(a.len(), 43);
        assert_eq!(hash_token(&a), hash_token(&a));
        assert_ne!(hash_token(&a), hash_token(&b));
    }

    #[test]
    fn cookie_is_http_only_and_strict() {
        let c = session_cookie("x".into(), true);
        assert_eq!(c.http_only(), Some(true));
        assert_eq!(c.same_site(), Some(SameSite::Strict));
        assert_eq!(c.secure(), Some(true));
        assert_eq!(c.path(), Some("/api"));
    }
}
