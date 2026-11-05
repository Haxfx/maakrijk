//! Scenario modules. Each one registers a ruleset here (compile-time registry).

pub mod lemonade;

use std::sync::Arc;

use crate::platform::scenario::Registry;

pub fn registry() -> Registry {
    Registry::default().with(Arc::new(lemonade::Lemonade::new()))
}
