//! Structured API errors. Every error has a stable machine `code` that the
//! client maps to a Dutch text; `message` is English and for developers only.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("not signed in")]
    Unauthorized,
    #[error("request refused: {0}")]
    Forbidden(&'static str),
    #[error("not found")]
    NotFound,
    #[error("invalid input: {code}")]
    Invalid {
        code: &'static str,
        field: Option<&'static str>,
    },
    #[error("conflict: {0}")]
    Conflict(&'static str),
    /// Logged with its cause; the client only sees `internal`.
    #[error("internal error")]
    Internal(Box<dyn std::error::Error + Send + Sync>),
}

impl From<sqlx::Error> for ApiError {
    fn from(e: sqlx::Error) -> Self {
        ApiError::Internal(Box::new(e))
    }
}

/// Every error response. `code` is stable and drives the Dutch text in the client.
#[derive(Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ErrorBody {
    pub code: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<&'static str>,
    pub message: String,
}

impl ApiError {
    fn parts(&self) -> (StatusCode, &'static str, Option<&'static str>) {
        match self {
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized", None),
            ApiError::Forbidden(code) => (StatusCode::FORBIDDEN, code, None),
            ApiError::NotFound => (StatusCode::NOT_FOUND, "not_found", None),
            ApiError::Invalid { code, field } => (StatusCode::UNPROCESSABLE_ENTITY, code, *field),
            ApiError::Conflict(code) => (StatusCode::CONFLICT, code, None),
            ApiError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal", None),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, code, field) = self.parts();
        if let ApiError::Internal(e) = &self {
            tracing::error!(error = %e, "internal error");
        }
        let message = match &self {
            ApiError::Internal(_) => "internal error".to_string(),
            other => other.to_string(),
        };
        (
            status,
            Json(ErrorBody {
                code,
                field,
                message,
            }),
        )
            .into_response()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
