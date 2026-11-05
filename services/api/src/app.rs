//! Router and shared state.

use std::sync::Arc;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::routing::{get, patch, post};
use sqlx::PgPool;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;

use crate::config::Config;
use crate::http;
use crate::platform::clock::Clock;
use crate::platform::scenario::Registry;

/// Request bodies above this size are refused before any handler runs.
pub const BODY_LIMIT_BYTES: usize = 64 * 1024;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub clock: Arc<dyn Clock>,
    pub registry: Arc<Registry>,
}

pub fn router(state: AppState) -> Router {
    let api = Router::new()
        .route("/health", get(http::health::health))
        .route("/version", get(http::version::version))
        .route("/session", post(http::session::ensure_session))
        .route(
            "/profiles",
            get(http::profiles::list).post(http::profiles::create),
        )
        .route(
            "/profiles/{id}",
            patch(http::profiles::update).delete(http::profiles::delete),
        )
        .route(
            "/profiles/{id}/games",
            get(http::games::list).post(http::games::start),
        )
        .route("/games/{id}", get(http::games::get))
        .route("/games/{id}/commands", post(http::games::command))
        // Without this, unknown /api paths would fall through to the SPA page.
        .fallback(|| async { http::error::ApiError::NotFound });

    let mut app = Router::new().nest("/api", api);

    // One-origin mode: serve the static Nuxt build, with the SPA fallback page
    // for client-side routes. Unknown /api paths still return 404 from the API.
    if let Some(dir) = &state.config.web_dir {
        let fallback = ServeFile::new(dir.join("200.html"));
        app = app.fallback_service(ServeDir::new(dir).fallback(fallback));
    }

    app.layer(DefaultBodyLimit::max(BODY_LIMIT_BYTES))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
