use std::sync::Arc;
use std::time::Duration;

use maakrijk_api::app::{AppState, router};
use maakrijk_api::config::Config;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = match Config::from_env() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("configuration error: {e}");
            std::process::exit(2);
        }
    };

    let db = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await
        .unwrap_or_else(|e| {
            eprintln!("cannot connect to database {}: {e}", config.database_name());
            std::process::exit(1);
        });

    tracing::info!(database = %config.database_name(), addr = %config.bind_addr, "starting");
    let listener = tokio::net::TcpListener::bind(config.bind_addr)
        .await
        .unwrap_or_else(|e| {
            eprintln!("cannot bind {}: {e}", config.bind_addr);
            std::process::exit(1);
        });

    let state = AppState {
        db,
        config: Arc::new(config),
    };
    axum::serve(listener, router(state))
        .with_graceful_shutdown(shutdown())
        .await
        .expect("server error");
}

async fn shutdown() {
    let _ = tokio::signal::ctrl_c().await;
}
