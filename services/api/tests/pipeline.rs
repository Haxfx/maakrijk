//! Platform command pipeline, tested with the test-only counter scenario.

mod common;

use axum::Router;
use axum::http::StatusCode;
use chrono::Duration;
use common::{Client, Res};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

async fn setup() -> (
    Router,
    PgPool,
    std::sync::Arc<maakrijk_api::platform::clock::ManualClock>,
    Client,
    String,
) {
    let (app, db, clock) = common::game_app().await;
    let c = Client::browser(&app).await;
    let p = c.create(&app, "Speler").await;
    let pid = p.body["id"].as_str().unwrap().to_string();
    let g = c
        .call(
            &app,
            "POST",
            &format!("/api/profiles/{pid}/games"),
            Some(json!({"scenarioId": "test-counter"})),
        )
        .await;
    assert_eq!(g.status, StatusCode::OK, "{:?}", g.body);
    let gid = g.body["id"].as_str().unwrap().to_string();
    (app, db, clock, c, gid)
}

async fn cmd(app: &Router, c: &Client, gid: &str, id: Uuid, command: Value) -> Res {
    c.call(
        app,
        "POST",
        &format!("/api/games/{gid}/commands"),
        Some(json!({"commandId": id, "command": command})),
    )
    .await
}

async fn ledger(db: &PgPool, gid: &str) -> (i64, i64, i64) {
    let id: Uuid = gid.parse().unwrap();
    let (sum, n): (i64, i64) =
        sqlx::query_as("SELECT COALESCE(SUM(amount),0)::bigint, count(*) FROM economy_transactions WHERE instance_id = $1")
            .bind(id)
            .fetch_one(db)
            .await
            .unwrap();
    let coins: i64 = sqlx::query_scalar("SELECT coins FROM game_instances WHERE id = $1")
        .bind(id)
        .fetch_one(db)
        .await
        .unwrap();
    (sum, n, coins)
}

#[tokio::test]
async fn start_books_starting_coins_once() {
    let (app, db, _clock, c, gid) = setup().await;
    assert_eq!(ledger(&db, &gid).await, (10, 1, 10));
    // Starting again returns the same game and books nothing.
    let pid: Uuid = sqlx::query_scalar("SELECT profile_id FROM game_instances WHERE id = $1")
        .bind(gid.parse::<Uuid>().unwrap())
        .fetch_one(&db)
        .await
        .unwrap();
    let again = c
        .call(
            &app,
            "POST",
            &format!("/api/profiles/{pid}/games"),
            Some(json!({"scenarioId": "test-counter"})),
        )
        .await;
    assert_eq!(again.body["id"], gid.as_str());
    assert_eq!(ledger(&db, &gid).await, (10, 1, 10));
}

#[tokio::test]
async fn command_changes_state_and_ledger_together() {
    let (app, db, _clock, c, gid) = setup().await;
    let r = cmd(
        &app,
        &c,
        &gid,
        Uuid::now_v7(),
        json!({"type": "buy", "n": 2}),
    )
    .await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.body["revision"], 1);
    assert_eq!(r.body["coins"], 6);
    assert_eq!(r.body["view"]["items"], 2);
    assert_eq!(ledger(&db, &gid).await, (6, 2, 6));
}

#[tokio::test]
async fn same_id_same_payload_returns_stored_answer() {
    let (app, db, _clock, c, gid) = setup().await;
    let id = Uuid::now_v7();
    let a = cmd(&app, &c, &gid, id, json!({"type": "buy", "n": 1})).await;
    let b = cmd(&app, &c, &gid, id, json!({"type": "buy", "n": 1})).await;
    assert_eq!(a.status, StatusCode::OK);
    assert_eq!(a.body, b.body);
    assert_eq!(ledger(&db, &gid).await, (8, 2, 8));
}

#[tokio::test]
async fn same_id_other_payload_is_a_conflict() {
    let (app, db, _clock, c, gid) = setup().await;
    let id = Uuid::now_v7();
    cmd(&app, &c, &gid, id, json!({"type": "buy", "n": 1})).await;
    let b = cmd(&app, &c, &gid, id, json!({"type": "buy", "n": 2})).await;
    assert_eq!(b.status, StatusCode::CONFLICT);
    assert_eq!(b.body["code"], "command_conflict");
    assert_eq!(ledger(&db, &gid).await, (8, 2, 8));
}

#[tokio::test]
async fn parallel_retries_have_one_effect() {
    let (app, db, _clock, c, gid) = setup().await;
    let id = Uuid::now_v7();
    let handles: Vec<_> = (0..5)
        .map(|_| {
            let req = c.req(
                "POST",
                &format!("/api/games/{gid}/commands"),
                Some(json!({"commandId": id, "command": {"type": "buy", "n": 1}})),
            );
            let app = app.clone();
            tokio::spawn(async move { common::send(&app, req).await })
        })
        .collect();
    for h in handles {
        assert_eq!(h.await.unwrap().status, StatusCode::OK);
    }
    assert_eq!(ledger(&db, &gid).await, (8, 2, 8));
}

#[tokio::test]
async fn parallel_different_commands_are_serialized() {
    let (app, db, _clock, c, gid) = setup().await;
    // 10 coins, each buy costs 2: exactly five of eight succeed.
    let handles: Vec<_> = (0..8)
        .map(|_| {
            let req = c.req(
                "POST",
                &format!("/api/games/{gid}/commands"),
                Some(json!({"commandId": Uuid::now_v7(), "command": {"type": "buy", "n": 1}})),
            );
            let app = app.clone();
            tokio::spawn(async move { common::send(&app, req).await })
        })
        .collect();
    let mut ok = 0;
    for h in handles {
        let r = h.await.unwrap();
        if r.status == StatusCode::OK {
            ok += 1;
        } else {
            assert_eq!(r.body["code"], "not_enough_coins");
        }
    }
    assert_eq!(ok, 5);
    assert_eq!(ledger(&db, &gid).await, (0, 6, 0));
}

#[tokio::test]
async fn refusal_changes_nothing_and_can_be_retried_later() {
    let (app, db, _clock, c, gid) = setup().await;
    let id = Uuid::now_v7();
    let r = cmd(&app, &c, &gid, id, json!({"type": "sell"})).await;
    assert_eq!(r.status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(r.body["code"], "nothing_to_sell");
    assert_eq!(ledger(&db, &gid).await, (10, 1, 10));
    let g = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await;
    assert_eq!(g.body["revision"], 0);
    // A refused id is not stored: after buying, the same id may sell.
    cmd(
        &app,
        &c,
        &gid,
        Uuid::now_v7(),
        json!({"type": "buy", "n": 1}),
    )
    .await;
    let again = cmd(&app, &c, &gid, id, json!({"type": "sell"})).await;
    assert_eq!(again.status, StatusCode::OK);
}

#[tokio::test]
async fn time_settles_on_read_and_on_next_command() {
    let (app, _db, clock, c, gid) = setup().await;
    cmd(&app, &c, &gid, Uuid::now_v7(), json!({"type": "wait"})).await;
    let g = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await;
    assert_eq!(g.body["view"]["busy"], true);
    clock.advance(Duration::seconds(3));
    let g = c
        .call(&app, "GET", &format!("/api/games/{gid}"), None)
        .await;
    assert_eq!(g.body["view"]["busy"], false);
    assert_eq!(g.body["view"]["jobsDone"], 1);
    assert_eq!(g.body["revision"], 1, "reading does not save");
    let r = cmd(&app, &c, &gid, Uuid::now_v7(), json!({"type": "wait"})).await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.body["events"][0]["type"], "JobDone");
    assert_eq!(r.body["view"]["jobsDone"], 1);
}

#[tokio::test]
async fn a_rule_that_books_twice_is_rolled_back() {
    let (app, db, _clock, c, gid) = setup().await;
    let r = cmd(
        &app,
        &c,
        &gid,
        Uuid::now_v7(),
        json!({"type": "doubleBook"}),
    )
    .await;
    assert_eq!(r.status, StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(ledger(&db, &gid).await, (10, 1, 10));
}

#[tokio::test]
async fn other_household_gets_404() {
    let (app, _db, _clock, _c, gid) = setup().await;
    let other = Client::browser(&app).await;
    assert_eq!(
        other
            .call(&app, "GET", &format!("/api/games/{gid}"), None)
            .await
            .status,
        StatusCode::NOT_FOUND
    );
    let r = cmd(
        &app,
        &other,
        &gid,
        Uuid::now_v7(),
        json!({"type": "buy", "n": 1}),
    )
    .await;
    assert_eq!(r.status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn unknown_scenario_is_refused() {
    let (app, _db, _clock) = common::game_app().await;
    let c = Client::browser(&app).await;
    let p = c.create(&app, "X").await;
    let pid = p.body["id"].as_str().unwrap();
    let r = c
        .call(
            &app,
            "POST",
            &format!("/api/profiles/{pid}/games"),
            Some(json!({"scenarioId": "nope"})),
        )
        .await;
    assert_eq!(r.body["code"], "unknown_scenario");
}

#[tokio::test]
async fn deleting_the_profile_removes_its_games() {
    let (app, db, _clock, c, gid) = setup().await;
    let pid: Uuid = sqlx::query_scalar("SELECT profile_id FROM game_instances WHERE id = $1")
        .bind(gid.parse::<Uuid>().unwrap())
        .fetch_one(&db)
        .await
        .unwrap();
    c.call(&app, "DELETE", &format!("/api/profiles/{pid}"), None)
        .await;
    let n: i64 =
        sqlx::query_scalar("SELECT count(*) FROM economy_transactions WHERE instance_id = $1")
            .bind(gid.parse::<Uuid>().unwrap())
            .fetch_one(&db)
            .await
            .unwrap();
    assert_eq!(n, 0);
}
