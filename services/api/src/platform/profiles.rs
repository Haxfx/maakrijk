//! Child profiles: a nickname and an avatar id, nothing else.

use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::http::error::ApiError;

pub const MAX_PROFILES: i64 = 8;
pub const NICKNAME_MAX_CHARS: usize = 20;
/// Avatar ids the client can draw. Unknown ids are refused.
pub const AVATARS: &[&str] = &[
    "kid-1", "kid-2", "kid-3", "kid-4", "kid-5", "kid-6", "kid-7", "kid-8",
];

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: Uuid,
    pub nickname: String,
    pub avatar: String,
    pub created_at: DateTime<Utc>,
}

/// Trim, collapse inner whitespace and check length and characters.
pub fn normalize_nickname(raw: &str) -> Result<String, ApiError> {
    let name = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    if name.chars().any(char::is_control) {
        return Err(invalid("nickname_invalid", "nickname"));
    }
    let len = name.chars().count();
    if len == 0 || len > NICKNAME_MAX_CHARS {
        return Err(invalid("nickname_length", "nickname"));
    }
    Ok(name)
}

pub fn check_avatar(avatar: &str) -> Result<(), ApiError> {
    if AVATARS.contains(&avatar) {
        Ok(())
    } else {
        Err(invalid("avatar_invalid", "avatar"))
    }
}

fn invalid(code: &'static str, field: &'static str) -> ApiError {
    ApiError::Invalid {
        code,
        field: Some(field),
    }
}

/// A unique-index violation on the nickname becomes a friendly conflict.
fn map_unique(e: sqlx::Error) -> ApiError {
    match &e {
        sqlx::Error::Database(db) if db.constraint() == Some("profiles_household_nickname_uq") => {
            ApiError::Conflict("nickname_taken")
        }
        _ => e.into(),
    }
}

pub async fn list(db: &PgPool, household: Uuid) -> Result<Vec<Profile>, ApiError> {
    Ok(sqlx::query_as(
        "SELECT id, nickname, avatar, created_at FROM profiles WHERE household_id = $1 ORDER BY created_at, id",
    )
    .bind(household)
    .fetch_all(db)
    .await?)
}

pub async fn create(
    db: &PgPool,
    household: Uuid,
    nickname: &str,
    avatar: &str,
) -> Result<Profile, ApiError> {
    let nickname = normalize_nickname(nickname)?;
    check_avatar(avatar)?;
    let mut tx = db.begin().await?;
    // Lock the household so two parallel requests cannot both pass the limit.
    sqlx::query("SELECT id FROM households WHERE id = $1 FOR UPDATE")
        .bind(household)
        .execute(&mut *tx)
        .await?;
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM profiles WHERE household_id = $1")
        .bind(household)
        .fetch_one(&mut *tx)
        .await?;
    if count >= MAX_PROFILES {
        return Err(ApiError::Conflict("profile_limit"));
    }
    let profile: Profile = sqlx::query_as(
        "INSERT INTO profiles (id, household_id, nickname, avatar) VALUES ($1, $2, $3, $4)
         RETURNING id, nickname, avatar, created_at",
    )
    .bind(Uuid::now_v7())
    .bind(household)
    .bind(&nickname)
    .bind(avatar)
    .fetch_one(&mut *tx)
    .await
    .map_err(map_unique)?;
    tx.commit().await?;
    Ok(profile)
}

pub async fn update(
    db: &PgPool,
    household: Uuid,
    id: Uuid,
    nickname: Option<&str>,
    avatar: Option<&str>,
) -> Result<Profile, ApiError> {
    let nickname = nickname.map(normalize_nickname).transpose()?;
    if let Some(a) = avatar {
        check_avatar(a)?;
    }
    sqlx::query_as(
        "UPDATE profiles SET nickname = COALESCE($3, nickname), avatar = COALESCE($4, avatar), updated_at = now()
         WHERE id = $1 AND household_id = $2
         RETURNING id, nickname, avatar, created_at",
    )
    .bind(id)
    .bind(household)
    .bind(nickname)
    .bind(avatar)
    .fetch_optional(db)
    .await
    .map_err(map_unique)?
    .ok_or(ApiError::NotFound)
}

/// Deletes the profile and, through foreign keys, all of its data.
pub async fn delete(db: &PgPool, household: Uuid, id: Uuid) -> Result<(), ApiError> {
    let done = sqlx::query("DELETE FROM profiles WHERE id = $1 AND household_id = $2")
        .bind(id)
        .bind(household)
        .execute(db)
        .await?;
    if done.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nickname_is_trimmed_and_collapsed() {
        assert_eq!(normalize_nickname("  Noor   van  ").unwrap(), "Noor van");
    }

    #[test]
    fn nickname_length_counts_characters_not_bytes() {
        assert!(normalize_nickname(&"é".repeat(20)).is_ok());
        assert!(normalize_nickname(&"a".repeat(21)).is_err());
        assert!(normalize_nickname("   ").is_err());
    }

    #[test]
    fn nickname_rejects_control_characters() {
        // Inner whitespace is collapsed first; other control characters remain.
        assert!(normalize_nickname("a\u{0007}b").is_err());
    }

    #[test]
    fn avatar_must_be_known() {
        assert!(check_avatar("kid-1").is_ok());
        assert!(check_avatar("../etc").is_err());
    }
}
