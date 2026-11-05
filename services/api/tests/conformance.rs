//! Shared conformance suite (contract 0.2 §7). Every registered scenario must
//! have a script here; a new scenario without one fails `every_scenario_has_a_script`.

mod common;

use std::sync::Arc;

use axum::Router;
use axum::http::StatusCode;
use chrono::Duration;
use common::{Client, Res};
use maakrijk_api::platform::clock::ManualClock;
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

/// A step: move the clock forward, then send a command.
struct Step {
    wait_ms: i64,
    command: Value,
}

struct Script {
    scenario: &'static str,
    /// The complete chain from start to a finished, earning round.
    chain: Vec<Step>,
    /// A command that is refused at the start of the game.
    refused: Value,
    /// Coins after the full chain.
    final_coins: i64,
}

fn step(wait_ms: i64, command: Value) -> Step {
    Step { wait_ms, command }
}

fn scripts() -> Vec<Script> {
    vec![Script {
        scenario: "lemonade",
        chain: vec![
            step(0, json!({"type": "buyStock", "lemons": 3, "sugar": 1})),
            step(0, json!({"type": "makeJug"})),
            step(3000, json!({"type": "openStand"})),
            step(1000, json!({"type": "serveCustomer", "customerId": 1})),
            step(2500, json!({"type": "serveCustomer", "customerId": 2})),
            step(2500, json!({"type": "serveCustomer", "customerId": 3})),
            step(2500, json!({"type": "serveCustomer", "customerId": 4})),
            step(0, json!({"type": "seenRound", "roundId": 1})),
        ],
        refused: json!({"type": "openStand"}),
        final_coins: 16,
    }]
}

struct Game {
    app: Router,
    db: PgPool,
    clock: Arc<ManualClock>,
    client: Client,
    gid: String,
}

impl Game {
    async fn start(scenario: &str) -> Self {
        let (app, db, clock) = common::game_app().await;
        let client = Client::browser(&app).await;
        let pid = client.create(&app, "Proef").await.body["id"]
            .as_str()
            .unwrap()
            .to_string();
        let g = client
            .call(
                &app,
                "POST",
                &format!("/api/profiles/{pid}/games"),
                Some(json!({"scenarioId": scenario})),
            )
            .await;
        assert_eq!(g.status, StatusCode::OK, "{scenario}: {:?}", g.body);
        let gid = g.body["id"].as_str().unwrap().to_string();
        Self {
            app,
            db,
            clock,
            client,
            gid,
        }
    }

    async fn send(&self, id: Uuid, command: &Value) -> Res {
        self.client
            .call(
                &self.app,
                "POST",
                &format!("/api/games/{}/commands", self.gid),
                Some(json!({"commandId": id, "command": command})),
            )
            .await
    }

    async fn get(&self) -> Res {
        self.client
            .call(&self.app, "GET", &format!("/api/games/{}", self.gid), None)
            .await
    }

    /// (ledger sum, ledger rows, coins, revision, state) straight from the database.
    async fn stored(&self) -> (i64, i64, i64, i64, Value) {
        let id: Uuid = self.gid.parse().unwrap();
        sqlx::query_as(
            "SELECT COALESCE(SUM(t.amount),0)::bigint, count(t.id), g.coins, g.revision, g.state \
             FROM game_instances g LEFT JOIN economy_transactions t ON t.instance_id = g.id \
             WHERE g.id = $1 GROUP BY g.id",
        )
        .bind(id)
        .fetch_one(&self.db)
        .await
        .unwrap()
    }

    async fn check_invariants(&self, ctx: &str) {
        let (sum, _, coins, _, state) = self.stored().await;
        assert_eq!(sum, coins, "{ctx}: ledger must equal coins");
        assert!(coins >= 0, "{ctx}: negative coins");
        no_negative_numbers(&state, ctx);
        no_negative_numbers(&self.get().await.body, ctx);
    }
}

/// Stock, cups and counters can never go below zero anywhere in the state or view.
fn no_negative_numbers(v: &Value, ctx: &str) {
    match v {
        Value::Number(n) => assert!(n.as_f64().unwrap() >= 0.0, "{ctx}: negative number in {v}"),
        Value::Array(a) => a.iter().for_each(|x| no_negative_numbers(x, ctx)),
        Value::Object(o) => o.values().for_each(|x| no_negative_numbers(x, ctx)),
        _ => {}
    }
}

#[test]
fn every_scenario_has_a_script() {
    let scripted: Vec<_> = scripts().iter().map(|s| s.scenario).collect();
    for r in maakrijk_api::scenarios::registry().all() {
        assert!(
            scripted.contains(&r.scenario_id()),
            "no conformance script for {}",
            r.scenario_id()
        );
    }
}

#[tokio::test]
async fn full_chain_with_invariants_and_resume() {
    for s in scripts() {
        let g = Game::start(s.scenario).await;
        g.check_invariants(&format!("{} start", s.scenario)).await;
        for (i, st) in s.chain.iter().enumerate() {
            g.clock.advance(Duration::milliseconds(st.wait_ms));
            let r = g.send(Uuid::now_v7(), &st.command).await;
            let ctx = format!("{} step {i} {}", s.scenario, st.command);
            assert_eq!(r.status, StatusCode::OK, "{ctx}: {:?}", r.body);
            g.check_invariants(&ctx).await;
        }
        let before = g.get().await.body;
        assert_eq!(before["coins"], s.final_coins, "{}", s.scenario);

        // A fresh server process sees exactly the same game.
        let app2 = common::restarted_app(g.clock.clone()).await;
        let after = g
            .client
            .call(&app2, "GET", &format!("/api/games/{}", g.gid), None)
            .await;
        assert_eq!(after.status, StatusCode::OK);
        assert_eq!(after.body["coins"], before["coins"]);
        assert_eq!(after.body["revision"], before["revision"]);
        assert_eq!(
            after.body["view"], before["view"],
            "{}: resumed view differs",
            s.scenario
        );
    }
}

#[tokio::test]
async fn retry_returns_the_same_answer_and_conflicts_on_other_payload() {
    for s in scripts() {
        let g = Game::start(s.scenario).await;
        let id = Uuid::now_v7();
        let first = g.send(id, &s.chain[0].command).await;
        assert_eq!(first.status, StatusCode::OK);
        let again = g.send(id, &s.chain[0].command).await;
        assert_eq!(again.status, StatusCode::OK);
        assert_eq!(
            again.body, first.body,
            "{}: retry must replay the stored answer",
            s.scenario
        );
        let other = g.send(id, &s.chain[1].command).await;
        assert_eq!(other.status, StatusCode::CONFLICT);
        assert_eq!(other.body["code"], "command_conflict");
        let (_, rows, ..) = g.stored().await;
        assert_eq!(rows, 2, "{}: start + one booking", s.scenario);
    }
}

#[tokio::test]
async fn five_identical_concurrent_commands_have_one_effect() {
    for s in scripts() {
        let g = Game::start(s.scenario).await;
        let (.., rev0, _) = g.stored().await;
        let id = Uuid::now_v7();
        let handles: Vec<_> = (0..5)
            .map(|_| {
                let req = g.client.req(
                    "POST",
                    &format!("/api/games/{}/commands", g.gid),
                    Some(json!({"commandId": id, "command": s.chain[0].command})),
                );
                let app = g.app.clone();
                tokio::spawn(async move { common::send(&app, req).await })
            })
            .collect();
        let mut bodies = vec![];
        for h in handles {
            let r = h.await.unwrap();
            assert_eq!(r.status, StatusCode::OK, "{}: {:?}", s.scenario, r.body);
            bodies.push(r.body);
        }
        assert!(
            bodies.windows(2).all(|w| w[0] == w[1]),
            "{}: answers differ",
            s.scenario
        );
        let (sum, rows, coins, rev, _) = g.stored().await;
        assert_eq!(
            (rows, rev),
            (2, rev0 + 1),
            "{}: exactly one effect",
            s.scenario
        );
        assert_eq!(sum, coins);
    }
}

#[tokio::test]
async fn refusal_changes_nothing() {
    for s in scripts() {
        let g = Game::start(s.scenario).await;
        let before = g.stored().await;
        let r = g.send(Uuid::now_v7(), &s.refused).await;
        assert_eq!(r.status, StatusCode::UNPROCESSABLE_ENTITY, "{}", s.scenario);
        assert!(r.body["code"].is_string());
        assert_eq!(
            g.stored().await,
            before,
            "{}: refusal changed the game",
            s.scenario
        );
    }
}

#[tokio::test]
async fn other_household_gets_404() {
    for s in scripts() {
        let g = Game::start(s.scenario).await;
        let stranger = Client::browser(&g.app).await;
        let read = stranger
            .call(&g.app, "GET", &format!("/api/games/{}", g.gid), None)
            .await;
        assert_eq!(read.status, StatusCode::NOT_FOUND, "{}", s.scenario);
        let write = stranger
            .call(
                &g.app,
                "POST",
                &format!("/api/games/{}/commands", g.gid),
                Some(json!({"commandId": Uuid::now_v7(), "command": s.chain[0].command})),
            )
            .await;
        assert_eq!(write.status, StatusCode::NOT_FOUND, "{}", s.scenario);
        let (_, rows, ..) = g.stored().await;
        assert_eq!(rows, 1, "{}: stranger booked nothing", s.scenario);
    }
}
