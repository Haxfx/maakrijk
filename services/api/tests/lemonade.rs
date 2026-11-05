//! The lemonade clicker over HTTP, against PostgreSQL.

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

async fn new_game(app: &Router, c: &Client, name: &str) -> (String, Value) {
    let pid = c.create(app, name).await.body["id"]
        .as_str()
        .unwrap()
        .to_string();
    let g = c
        .call(
            app,
            "POST",
            &format!("/api/profiles/{pid}/games"),
            Some(json!({"scenarioId": "lemonade"})),
        )
        .await;
    assert_eq!(g.status, StatusCode::OK, "{:?}", g.body);
    (g.body["id"].as_str().unwrap().to_string(), g.body)
}

#[tokio::test]
async fn tapping_upgrading_and_helpers_over_http() {
    let (app, db, clock) = common::game_app().await;
    let c = Client::browser(&app).await;
    let (gid, g) = new_game(&app, &c, "Limo").await;
    assert_eq!(g["coins"], 12);
    assert_eq!(g["view"]["nextStep"], "tap");

    let t = ok(&app, &c, &gid, json!({"type": "tap", "count": 4})).await;
    assert_eq!(t["coins"], 16);
    assert_eq!(t["view"]["nextStep"], "upgrade:press");
    assert!(t["events"].to_string().contains("CupsSold"));
    ledger_ok(&db, &gid).await;

    let u = ok(
        &app,
        &c,
        &gid,
        json!({"type": "buyUpgrade", "upgrade": "press"}),
    )
    .await;
    assert_eq!(u["coins"], 6);
    assert_eq!(u["view"]["cupsPerTap"], 2);

    // Earn enough for a helper, then let it work while nobody plays.
    clock.advance(Duration::milliseconds(2000));
    ok(&app, &c, &gid, json!({"type": "tap", "count": 10})).await; // 20 cups: 6 + 40 - 20
    ok(
        &app,
        &c,
        &gid,
        json!({"type": "buyUpgrade", "upgrade": "helper"}),
    )
    .await;
    let before = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await
        .body;
    assert_eq!(before["coins"], 6);
    clock.advance(Duration::milliseconds(20_000));
    // Reading shows the helper's 10 cups (+20, minus 3 jugs of 4) without writing anything.
    let seen = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await
        .body;
    assert_eq!(seen["coins"], 14);
    assert_eq!(seen["revision"], before["revision"]);
    ledger_ok(&db, &gid).await;
    // The next command books them exactly once; its 2 cups come from the open jug.
    let next = ok(&app, &c, &gid, json!({"type": "tap", "count": 1})).await;
    assert!(next["events"].to_string().contains("HelpersSold"));
    assert_eq!(next["coins"], 14 + 4);
    ledger_ok(&db, &gid).await;
}

#[tokio::test]
async fn stuck_upgrade_is_refused_and_not_stored() {
    let (app, db, _clock) = common::game_app().await;
    let c = Client::browser(&app).await;
    let (gid, g) = new_game(&app, &c, "Vast").await;

    let r = cmd(
        &app,
        &c,
        &gid,
        json!({"type": "buyUpgrade", "upgrade": "press"}),
    )
    .await;
    assert_eq!(r.status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(r.body["code"], "would_get_stuck");
    let old = cmd(
        &app,
        &c,
        &gid,
        json!({"type": "buyStock", "lemons": 1, "sugar": 0}),
    )
    .await;
    assert_eq!(old.status, StatusCode::UNPROCESSABLE_ENTITY);
    let v = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await;
    assert_eq!(v.body["coins"], 12);
    assert_eq!(v.body["revision"], g["revision"]);
    ledger_ok(&db, &gid).await;
}

#[tokio::test]
async fn a_version_1_game_is_converted_on_its_next_command() {
    let (app, db, _clock) = common::game_app().await;
    let c = Client::browser(&app).await;
    let (gid, _) = new_game(&app, &c, "Oud").await;
    let id: Uuid = gid.parse().unwrap();
    // Make it look like a 0.2 RC 3 game: 8 coins, 3 lemons and 1 sugar in stock.
    sqlx::query(
        "INSERT INTO scenario_definitions (scenario_id, version, hash, manifest)
         VALUES ('lemonade', 1, sha256('v1'), '{}') ON CONFLICT DO NOTHING",
    )
    .execute(&db)
    .await
    .unwrap();
    sqlx::query(
        "UPDATE game_instances SET scenario_version = 1, ruleset_version = 1, coins = 8,
         state = '{\"schema\":1,\"stock\":{\"lemon\":3,\"sugar\":1},\"jug\":{\"cups\":0,\"lots\":[],\"making\":null},\"round\":null,\"roundsPlayed\":0,\"lastRound\":null,\"settledTo\":null}'
         WHERE id = $1",
    )
    .bind(id)
    .execute(&db)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO economy_transactions (id, instance_id, kind, amount, reference, revision, balance_after)
         VALUES ($1, $2, 'stock', -4, 'stock:old', 1, 8)",
    )
    .bind(Uuid::now_v7())
    .bind(id)
    .execute(&db)
    .await
    .unwrap();

    let v = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await;
    assert_eq!(v.status, StatusCode::OK, "{:?}", v.body);
    assert_eq!(v.body["coins"], 12);

    let t = ok(&app, &c, &gid, json!({"type": "tap", "count": 1})).await;
    assert_eq!(t["coins"], 10);
    assert!(t["events"].to_string().contains("GameConverted"));
    let versions: (i32, i32) = sqlx::query_as(
        "SELECT scenario_version, ruleset_version FROM game_instances WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&db)
    .await
    .unwrap();
    assert_eq!(versions, (2, 2));
    ledger_ok(&db, &gid).await;
}
