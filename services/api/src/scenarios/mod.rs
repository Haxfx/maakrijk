//! Scenario modules. Each one registers a ruleset here (compile-time registry).

use crate::platform::scenario::Registry;

pub fn registry() -> Registry {
    Registry::default()
}
