mod common;

use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use serde_json::json;

use common::Client;

#[tokio::test]
async fn profiles_need_a_session() {
    let (app, _db) = common::app().await;
    let res = common::send(&app, common::get("/api/profiles")).await;
    assert_eq!(res.status, StatusCode::UNAUTHORIZED);
    assert_eq!(res.body["code"], "unauthorized");
}

#[tokio::test]
async fn existing_session_is_reused() {
    let (app, _db) = common::app().await;
    let c = Client::browser(&app).await;
    let res = c.call(&app, "POST", "/api/session", None).await;
    assert_eq!(res.status, StatusCode::OK);
    assert_eq!(res.body["created"], false);
}

#[tokio::test]
async fn create_list_rename_delete() {
    let (app, _db) = common::app().await;
    let c = Client::browser(&app).await;

    let a = c.create(&app, "  Testkind   A ").await;
    assert_eq!(a.status, StatusCode::CREATED);
    assert_eq!(a.body["nickname"], "Testkind A");
    let b = c.create(&app, "Testkind B").await;
    assert_eq!(b.status, StatusCode::CREATED);

    let list = c.call(&app, "GET", "/api/profiles", None).await;
    let names: Vec<_> = list
        .body
        .as_array()
        .unwrap()
        .iter()
        .map(|p| p["nickname"].clone())
        .collect();
    assert_eq!(names, vec![json!("Testkind A"), json!("Testkind B")]);

    let id = a.body["id"].as_str().unwrap();
    let renamed = c
        .call(
            &app,
            "PATCH",
            &format!("/api/profiles/{id}"),
            Some(json!({"nickname": "Noor", "avatar": "kid-3"})),
        )
        .await;
    assert_eq!(renamed.status, StatusCode::OK);
    assert_eq!(renamed.body["nickname"], "Noor");
    assert_eq!(renamed.body["avatar"], "kid-3");

    let del = c
        .call(
            &app,
            "DELETE",
            &format!("/api/profiles/{}", b.body["id"].as_str().unwrap()),
            None,
        )
        .await;
    assert_eq!(del.status, StatusCode::NO_CONTENT);
    let list = c.call(&app, "GET", "/api/profiles", None).await;
    assert_eq!(list.body.as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn invalid_input_changes_nothing() {
    let (app, _db) = common::app().await;
    let c = Client::browser(&app).await;

    let long = c.create(&app, &"a".repeat(25)).await;
    assert_eq!(long.status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(long.body["code"], "nickname_length");
    assert_eq!(long.body["field"], "nickname");

    let bad_avatar = c
        .call(
            &app,
            "POST",
            "/api/profiles",
            Some(json!({"nickname": "X", "avatar": "evil"})),
        )
        .await;
    assert_eq!(bad_avatar.body["code"], "avatar_invalid");

    assert_eq!(c.create(&app, "Sam").await.status, StatusCode::CREATED);
    let dup = c.create(&app, "sam").await;
    assert_eq!(dup.status, StatusCode::CONFLICT);
    assert_eq!(dup.body["code"], "nickname_taken");

    let list = c.call(&app, "GET", "/api/profiles", None).await;
    assert_eq!(list.body.as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn ninth_profile_is_refused_even_in_parallel() {
    let (app, _db) = common::app().await;
    let c = Client::browser(&app).await;
    for i in 0..6 {
        assert_eq!(
            c.create(&app, &format!("Kind {i}")).await.status,
            StatusCode::CREATED
        );
    }
    // Four parallel requests for the last two places: exactly two may succeed.
    let handles: Vec<_> = (0..4)
        .map(|i| {
            let req = c.req(
                "POST",
                "/api/profiles",
                Some(json!({"nickname": format!("Extra {i}"), "avatar": "kid-2"})),
            );
            let app = app.clone();
            tokio::spawn(async move { common::send(&app, req).await })
        })
        .collect();
    let mut results = Vec::new();
    for h in handles {
        results.push(h.await.unwrap());
    }
    let ok = results
        .iter()
        .filter(|r| r.status == StatusCode::CREATED)
        .count();
    let limit = results
        .iter()
        .filter(|r| r.body["code"] == "profile_limit")
        .count();
    assert_eq!((ok, limit), (2, 2));
    let list = c.call(&app, "GET", "/api/profiles", None).await;
    assert_eq!(list.body.as_array().unwrap().len(), 8);
}

#[tokio::test]
async fn other_household_cannot_see_or_change_profiles() {
    let (app, _db) = common::app().await;
    let a = Client::browser(&app).await;
    let b = Client::browser(&app).await;
    let p = a.create(&app, "Mila").await;
    let id = p.body["id"].as_str().unwrap();

    let list = b.call(&app, "GET", "/api/profiles", None).await;
    assert_eq!(list.body.as_array().unwrap().len(), 0);
    let patch = b
        .call(
            &app,
            "PATCH",
            &format!("/api/profiles/{id}"),
            Some(json!({"nickname": "Hack"})),
        )
        .await;
    assert_eq!(patch.status, StatusCode::NOT_FOUND);
    let del = b
        .call(&app, "DELETE", &format!("/api/profiles/{id}"), None)
        .await;
    assert_eq!(del.status, StatusCode::NOT_FOUND);

    let still = a.call(&app, "GET", "/api/profiles", None).await;
    assert_eq!(still.body[0]["nickname"], "Mila");
}

#[tokio::test]
async fn cookie_write_without_csrf_header_is_refused() {
    let (app, _db) = common::app().await;
    let c = Client::browser(&app).await;
    let req = Request::post("/api/profiles")
        .header(header::COOKIE, c.cookie.as_ref().unwrap())
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({"nickname": "X", "avatar": "kid-1"}).to_string(),
        ))
        .unwrap();
    let res = common::send(&app, req).await;
    assert_eq!(res.status, StatusCode::FORBIDDEN);
    assert_eq!(res.body["code"], "csrf");
}

#[tokio::test]
async fn native_shell_uses_bearer_token() {
    let (app, _db) = common::app().await;
    let c = Client::native(&app).await;
    assert_eq!(c.create(&app, "Luca").await.status, StatusCode::CREATED);
    let list = c.call(&app, "GET", "/api/profiles", None).await;
    assert_eq!(list.body[0]["nickname"], "Luca");

    let wrong = Client {
        cookie: None,
        bearer: Some("not-a-token".into()),
    };
    assert_eq!(
        wrong.call(&app, "GET", "/api/profiles", None).await.status,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn session_without_our_header_is_refused() {
    let (app, _db) = common::app().await;
    let req = Request::post("/api/session").body(Body::empty()).unwrap();
    let res = common::send(&app, req).await;
    assert_eq!(res.status, StatusCode::FORBIDDEN);
    assert_eq!(res.body["code"], "csrf");
    assert!(res.headers.get(header::SET_COOKIE).is_none());
}

#[tokio::test]
async fn malformed_body_gets_a_structured_error() {
    let (app, _db) = common::app().await;
    let c = Client::browser(&app).await;
    let res = c
        .call(
            &app,
            "POST",
            "/api/profiles",
            Some(json!({"nickname": "X", "avatar": "kid-1", "extra": 1})),
        )
        .await;
    assert_eq!(res.status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(res.body["code"], "invalid_body");
}
