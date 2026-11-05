mod common;

use axum::http::StatusCode;

#[tokio::test]
async fn health_reports_ok_with_database() {
    let (app, _db) = common::app().await;
    let res = common::send(&app, common::get("/api/health")).await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.body["status"], "ok");
}

#[tokio::test]
async fn unknown_api_path_is_404() {
    let (app, _db) = common::app().await;
    let res = common::send(&app, common::get("/api/nope")).await;
    assert_eq!(res.status, StatusCode::NOT_FOUND);
}
