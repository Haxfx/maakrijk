//! Router and shared state.

use std::sync::Arc;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::routing::get;
use sqlx::PgPool;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;

use crate::config::Config;
use crate::http;

/// Request bodies above this size are refused before any handler runs.
pub const BODY_LIMIT_BYTES: usize = 64 * 1024;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
}

pub fn router(state: AppState) -> Router {
    let api = Router::new().route("/health", get(http::health::health));

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
