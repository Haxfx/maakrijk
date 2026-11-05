//! Item counts with optional capacities. Never negative.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::platform::scenario::{RuleError, RuleResult};

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Inventory(BTreeMap<String, i64>);

impl Inventory {
    pub fn get(&self, item: &str) -> i64 {
        self.0.get(item).copied().unwrap_or(0)
    }

    /// Add `n` (> 0). Refused with `storage_full` when it would exceed `cap`.
    pub fn add(&mut self, item: &str, n: i64, cap: Option<i64>) -> RuleResult<()> {
        if n <= 0 {
            return Err(RuleError::new("invalid_command"));
        }
        let next = self.get(item) + n;
        if cap.is_some_and(|c| next > c) {
            return Err(RuleError::new("storage_full"));
        }
        self.0.insert(item.to_string(), next);
        Ok(())
    }

    /// Take `n` (> 0). Refused with `not_enough_stock` when there is too little.
    pub fn take(&mut self, item: &str, n: i64) -> RuleResult<()> {
        if n <= 0 {
            return Err(RuleError::new("invalid_command"));
        }
        let have = self.get(item);
        if have < n {
            return Err(RuleError::new("not_enough_stock"));
        }
        self.0.insert(item.to_string(), have - n);
        Ok(())
    }

    pub fn has_all(&self, needs: &[(&str, i64)]) -> bool {
        needs.iter().all(|(i, n)| self.get(i) >= *n)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_respects_capacity() {
        let mut inv = Inventory::default();
        inv.add("lemon", 10, Some(12)).unwrap();
        assert_eq!(
            inv.add("lemon", 3, Some(12)).unwrap_err().code,
            "storage_full"
        );
        assert_eq!(inv.get("lemon"), 10);
    }

    #[test]
    fn take_never_goes_negative() {
        let mut inv = Inventory::default();
        inv.add("sugar", 1, None).unwrap();
        assert_eq!(inv.take("sugar", 2).unwrap_err().code, "not_enough_stock");
        assert_eq!(inv.get("sugar"), 1);
        inv.take("sugar", 1).unwrap();
        assert_eq!(inv.get("sugar"), 0);
    }

    #[test]
    fn zero_or_negative_amounts_are_invalid() {
        let mut inv = Inventory::default();
        assert!(inv.add("x", 0, None).is_err());
        assert!(inv.take("x", -1).is_err());
    }
}
