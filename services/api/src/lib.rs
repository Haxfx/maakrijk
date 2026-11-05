//! Maakrijk API: one Rust service that owns all game rules.
//!
//! Module layout (docs/build/decision-log.md, D5):
//! - `platform`: identity, auth, commands, time, storage (no game knowledge).
//! - `http`: thin Axum handlers and error mapping.
//!
//! Shared game systems and scenarios are added in later releases.

pub mod app;
pub mod config;
pub mod db;
pub mod http;
