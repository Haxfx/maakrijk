//! Cost basis of produced goods, first in first out.
//!
//! A batch of `units` made for `cost` coins is spread over its units with
//! integers only: each unit taken costs `remaining_cost / remaining_units`,
//! rounded down, and the last unit takes the rest. Taking all units always
//! returns exactly the batch cost, so leftovers are never booked twice and
//! nothing is lost to rounding (docs/03 §3).

use std::collections::VecDeque;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Lot {
    pub units: i64,
    pub cost: i64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct CostLots(VecDeque<Lot>);

impl CostLots {
    pub fn add(&mut self, units: i64, cost: i64) {
        assert!(units > 0 && cost >= 0, "invalid lot");
        self.0.push_back(Lot { units, cost });
    }

    pub fn units(&self) -> i64 {
        self.0.iter().map(|l| l.units).sum()
    }

    pub fn cost(&self) -> i64 {
        self.0.iter().map(|l| l.cost).sum()
    }

    /// Remove `n` units from the oldest lots and return their cost.
    /// Panics when fewer units are available: callers check `units()` first.
    pub fn take(&mut self, mut n: i64) -> i64 {
        assert!(n >= 0 && n <= self.units(), "not enough units in cost lots");
        let mut total = 0;
        while n > 0 {
            let lot = self.0.front_mut().expect("lot");
            let one = lot.cost / lot.units;
            lot.units -= 1;
            lot.cost -= one;
            total += one;
            if lot.units == 0 {
                total += lot.cost; // remainder goes with the last unit
                self.0.pop_front();
            }
            n -= 1;
        }
        total
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn even_split() {
        let mut c = CostLots::default();
        c.add(4, 4);
        assert_eq!(c.take(1), 1);
        assert_eq!(c.take(3), 3);
        assert_eq!(c.units(), 0);
    }

    #[test]
    fn uneven_split_keeps_the_total() {
        let mut c = CostLots::default();
        c.add(3, 4);
        let parts: Vec<i64> = (0..3).map(|_| c.take(1)).collect();
        assert_eq!(parts.iter().sum::<i64>(), 4);
        assert_eq!(c.cost(), 0);
    }

    #[test]
    fn fifo_over_lots() {
        let mut c = CostLots::default();
        c.add(2, 2);
        c.add(2, 6);
        assert_eq!(c.take(3), 2 + 3);
        assert_eq!(c.cost(), 3);
        assert_eq!(c.units(), 1);
    }
}
