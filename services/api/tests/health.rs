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

#[tokio::test]
async fn version_names_database_but_not_credentials() {
    let (app, _db) = common::app().await;
    let res = common::send(&app, common::get("/api/version")).await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.body["database"], "maakrijk_test");
    assert_eq!(res.body["contract"], 1);
    assert!(!res.body.to_string().contains("maakrijk_dev_only"));
}

#[tokio::test]
async fn with_web_build_unknown_api_path_is_still_404_and_pages_fall_back() {
    let dir = std::env::temp_dir().join(format!("maakrijk-web-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(dir.join("200.html"), "<div id=\"__nuxt\"></div>").unwrap();
    let web = dir.clone();
    let (app, _db) = common::app_with(move |c| c.web_dir = Some(web)).await;

    let api = common::send(&app, common::get("/api/nope")).await;
    assert_eq!(api.status, StatusCode::NOT_FOUND);
    assert_eq!(api.body["code"], "not_found");

    let page = common::send(&app, common::get("/spelers/abc")).await;
    assert_eq!(page.status, StatusCode::OK);
    std::fs::remove_dir_all(dir).ok();
}
