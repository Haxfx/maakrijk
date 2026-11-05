//! The lemonade stand over HTTP, against PostgreSQL.

mod common;

use axum::Router;
use axum::http::StatusCode;
use chrono::Duration;
use common::{Client, Res};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

async fn cmd(app: &Router, c: &Client, gid: &str, command: Value) -> Res {
    c.call(
        app,
        "POST",
        &format!("/api/games/{gid}/commands"),
        Some(json!({"commandId": Uuid::now_v7(), "command": command})),
    )
    .await
}

async fn ok(app: &Router, c: &Client, gid: &str, command: Value) -> Value {
    let r = cmd(app, c, gid, command.clone()).await;
    assert_eq!(r.status, StatusCode::OK, "{command} -> {:?}", r.body);
    r.body
}

async fn ledger_ok(db: &PgPool, gid: &str) {
    let id: Uuid = gid.parse().unwrap();
    let (sum, coins): (i64, i64) = sqlx::query_as(
        "SELECT COALESCE((SELECT SUM(amount) FROM economy_transactions WHERE instance_id = $1),0)::bigint, \
         (SELECT coins FROM game_instances WHERE id = $1)",
    )
    .bind(id)
    .fetch_one(db)
    .await
    .unwrap();
    assert_eq!(sum, coins, "ledger must match coins");
}

#[tokio::test]
async fn a_full_round_over_http() {
    let (app, db, clock) = common::game_app().await;
    let c = Client::browser(&app).await;
    let pid = c.create(&app, "Limo").await.body["id"]
        .as_str()
        .unwrap()
        .to_string();

    let g = c
        .call(
            &app,
            "POST",
            &format!("/api/profiles/{pid}/games"),
            Some(json!({"scenarioId": "lemonade"})),
        )
        .await;
    assert_eq!(g.status, StatusCode::OK, "{:?}", g.body);
    assert_eq!(g.body["coins"], 12);
    assert_eq!(g.body["view"]["nextStep"], "buy");
    let gid = g.body["id"].as_str().unwrap().to_string();

    let list = c
        .call(&app, "GET", &format!("/api/profiles/{pid}/games"), None)
        .await;
    assert!(list.body.to_string().contains("lemonade"));

    let b = ok(
        &app,
        &c,
        &gid,
        json!({"type": "buyStock", "lemons": 3, "sugar": 1}),
    )
    .await;
    assert_eq!(b["coins"], 8);
    assert_eq!(b["view"]["stock"], json!({"lemons": 3, "sugar": 1}));
    ledger_ok(&db, &gid).await;

    ok(&app, &c, &gid, json!({"type": "makeJug"})).await;
    clock.advance(Duration::milliseconds(3000));
    let v = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await;
    assert_eq!(v.body["view"]["jug"]["cups"], 4);

    ok(&app, &c, &gid, json!({"type": "openStand"})).await;
    let early = cmd(
        &app,
        &c,
        &gid,
        json!({"type": "serveCustomer", "customerId": 1}),
    )
    .await;
    assert_eq!(early.status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(early.body["code"], "customer_not_waiting");

    let mut last = Value::Null;
    for id in 1..=4 {
        clock.advance(Duration::milliseconds(if id == 1 { 1000 } else { 2500 }));
        last = ok(
            &app,
            &c,
            &gid,
            json!({"type": "serveCustomer", "customerId": id}),
        )
        .await;
        ledger_ok(&db, &gid).await;
    }
    assert_eq!(last["coins"], 16);
    let summary = &last["view"]["lastRound"];
    assert_eq!(
        (
            summary["sold"].as_i64(),
            summary["materials"].as_i64(),
            summary["left"].as_i64()
        ),
        (Some(8), Some(4), Some(4))
    );
    assert!(last["events"].to_string().contains("RoundClosed"));

    ok(&app, &c, &gid, json!({"type": "seenRound", "roundId": 1})).await;
    let v = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await;
    assert_eq!(v.body["view"]["nextStep"], "buy");
    assert_eq!(v.body["coins"], 16);
}

#[tokio::test]
async fn stuck_purchase_is_refused_and_not_stored() {
    let (app, db, _clock) = common::game_app().await;
    let c = Client::browser(&app).await;
    let pid = c.create(&app, "Vast").await.body["id"]
        .as_str()
        .unwrap()
        .to_string();
    let g = c
        .call(
            &app,
            "POST",
            &format!("/api/profiles/{pid}/games"),
            Some(json!({"scenarioId": "lemonade"})),
        )
        .await;
    let gid = g.body["id"].as_str().unwrap().to_string();

    let r = cmd(
        &app,
        &c,
        &gid,
        json!({"type": "buyStock", "lemons": 12, "sugar": 0}),
    )
    .await;
    assert_eq!(r.status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(r.body["code"], "would_get_stuck");
    let v = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await;
    assert_eq!(v.body["coins"], 12);
    assert_eq!(v.body["revision"], g.body["revision"]);
    ledger_ok(&db, &gid).await;
}
