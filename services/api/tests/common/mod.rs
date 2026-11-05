//! Test helpers: a router on the test database, and request shortcuts.
//! Integration tests need TEST_DATABASE_URL (see .env.example) and refuse any
//! database whose name does not end in `_test`.

#![allow(dead_code)]

pub mod client;
pub mod counter;

#[allow(unused_imports)]
pub use client::Client;

use std::sync::Arc;

use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use maakrijk_api::app::{AppState, router};
use maakrijk_api::config::{Config, database_name};
use maakrijk_api::platform::clock::ManualClock;
use maakrijk_api::platform::games::sync_definitions;
use maakrijk_api::platform::scenario::Registry;
use serde_json::Value;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

pub async fn test_pool() -> PgPool {
    let _ = dotenvy::from_path(concat!(env!("CARGO_MANIFEST_DIR"), "/../../.env"));
    let url = std::env::var("TEST_DATABASE_URL")
        .expect("TEST_DATABASE_URL must be set for integration tests");
    assert!(
        database_name(&url).ends_with("_test"),
        "refusing to run tests against {}",
        database_name(&url)
    );
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await
        .expect("connect to test database");
    maakrijk_api::db::migrate(&pool)
        .await
        .expect("migrate test database");
    pool
}

pub fn test_config(url: &str) -> Config {
    Config {
        database_url: url.to_string(),
        bind_addr: "127.0.0.1:0".parse().unwrap(),
        web_dir: None,
        cookie_secure: false,
    }
}

pub async fn app() -> (Router, PgPool) {
    app_with(|_| {}).await
}

/// Router on the test database with an adjusted config.
pub async fn app_with(adjust: impl FnOnce(&mut Config)) -> (Router, PgPool) {
    let (app, db, _) = game_app_with(adjust).await;
    (app, db)
}

/// Registry used by tests: the real scenarios plus the test-only counter.
pub fn test_registry() -> Registry {
    maakrijk_api::scenarios::registry().with(Arc::new(counter::Counter))
}

/// Router with a manual clock, for game tests.
pub async fn game_app() -> (Router, PgPool, Arc<ManualClock>) {
    game_app_with(|_| {}).await
}

pub async fn game_app_with(adjust: impl FnOnce(&mut Config)) -> (Router, PgPool, Arc<ManualClock>) {
    let db = test_pool().await;
    let url = std::env::var("TEST_DATABASE_URL").unwrap();
    let mut config = test_config(&url);
    adjust(&mut config);
    let registry = test_registry();
    sync_definitions(&db, &registry)
        .await
        .expect("sync definitions");
    let clock = Arc::new(ManualClock::new(chrono::Utc::now()));
    let state = AppState {
        db: db.clone(),
        config: Arc::new(config),
        clock: clock.clone(),
        registry: Arc::new(registry),
    };
    (router(state), db, clock)
}

pub struct Res {
    pub status: StatusCode,
    pub headers: axum::http::HeaderMap,
    pub body: Value,
}

pub async fn send(app: &Router, req: Request<Body>) -> Res {
    let res = app.clone().oneshot(req).await.expect("request");
    let status = res.status();
    let headers = res.headers().clone();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let body = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap_or(Value::Null)
    };
    Res {
        status,
        headers,
        body,
    }
}

pub fn get(uri: &str) -> Request<Body> {
    Request::get(uri).body(Body::empty()).unwrap()
}

pub fn json(method: &str, uri: &str, body: Value) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}
