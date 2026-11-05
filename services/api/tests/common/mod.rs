//! Test helpers: a router on the test database, and request shortcuts.
//! Integration tests need TEST_DATABASE_URL (see .env.example) and refuse any
//! database whose name does not end in `_test`.

#![allow(dead_code)]

use std::sync::Arc;

use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use maakrijk_api::app::{AppState, router};
use maakrijk_api::config::{Config, database_name};
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
    PgPoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await
        .expect("connect to test database")
}

pub fn test_config(url: &str) -> Config {
    Config {
        database_url: url.to_string(),
        bind_addr: "127.0.0.1:0".parse().unwrap(),
        web_dir: None,
        cookie_secure: false,
        allowed_origins: vec!["capacitor://localhost".into()],
    }
}

pub async fn app() -> (Router, PgPool) {
    let db = test_pool().await;
    let url = std::env::var("TEST_DATABASE_URL").unwrap();
    let state = AppState {
        db: db.clone(),
        config: Arc::new(test_config(&url)),
    };
    (router(state), db)
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
