//! Lemonade stand definition v1 (balance 2026-11-a, docs/03 §5).
//! Immutable once stored: any change needs a new `DEFINITION_VERSION`.

use serde::{Deserialize, Serialize};

pub const SCENARIO_ID: &str = "lemonade";
pub const DEFINITION_VERSION: i32 = 1;
pub const RULESET_ID: &str = "lemonade";
pub const RULESET_VERSION: i32 = 1;

pub const LEMON: &str = "lemon";
pub const SUGAR: &str = "sugar";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub scenario_id: String,
    pub definition_version: i32,
    pub schema_version: i32,
    pub balance_version: String,
    pub ruleset_id: String,
    pub ruleset_version: i32,
    pub name_key: String,
    pub asset_pack_id: String,
    pub capabilities: Vec<String>,
    pub starting_coins: i64,
    pub ingredients: Vec<Ingredient>,
    pub recipe: Recipe,
    pub jug_capacity: i64,
    pub cup_price: i64,
    pub customers_per_round: u32,
    pub first_customer_ms: i64,
    pub customer_interval_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Ingredient {
    pub id: String,
    pub price: i64,
    pub capacity: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Recipe {
    pub inputs: Vec<(String, i64)>,
    pub cups: i64,
    pub duration_ms: i64,
}

pub fn v1() -> Manifest {
    Manifest {
        scenario_id: SCENARIO_ID.into(),
        definition_version: DEFINITION_VERSION,
        schema_version: 1,
        balance_version: "2026-11-a".into(),
        ruleset_id: RULESET_ID.into(),
        ruleset_version: RULESET_VERSION,
        name_key: "scenario.lemonade.name".into(),
        asset_pack_id: "lemonade-v1".into(),
        capabilities: vec![
            "inventory".into(),
            "processor".into(),
            "servicePoint".into(),
            "economy".into(),
        ],
        starting_coins: 12,
        ingredients: vec![
            Ingredient {
                id: LEMON.into(),
                price: 1,
                capacity: 12,
            },
            Ingredient {
                id: SUGAR.into(),
                price: 1,
                capacity: 4,
            },
        ],
        recipe: Recipe {
            inputs: vec![(LEMON.into(), 3), (SUGAR.into(), 1)],
            cups: 4,
            duration_ms: 3000,
        },
        jug_capacity: 4,
        cup_price: 2,
        customers_per_round: 4,
        first_customer_ms: 1000,
        customer_interval_ms: 2500,
    }
}

impl Manifest {
    pub fn ingredient(&self, id: &str) -> Option<&Ingredient> {
        self.ingredients.iter().find(|i| i.id == id)
    }

    /// Cost of the ingredients for one jug, at purchase prices.
    pub fn jug_cost(&self) -> i64 {
        self.recipe
            .inputs
            .iter()
            .map(|(id, n)| self.ingredient(id).map_or(0, |i| i.price) * n)
            .sum()
    }

    /// Reject definitions that cannot work (docs/05 §4: errors, not silence).
    pub fn validate(&self) -> Result<(), String> {
        let positive = |name: &str, v: i64| {
            if v > 0 {
                Ok(())
            } else {
                Err(format!("{name} must be positive"))
            }
        };
        positive("startingCoins", self.starting_coins)?;
        positive("jugCapacity", self.jug_capacity)?;
        positive("cupPrice", self.cup_price)?;
        positive("recipe.cups", self.recipe.cups)?;
        positive("recipe.durationMs", self.recipe.duration_ms)?;
        positive("customerIntervalMs", self.customer_interval_ms)?;
        if self.customers_per_round == 0 {
            return Err("customersPerRound must be positive".into());
        }
        for i in &self.ingredients {
            positive(&format!("{}.price", i.id), i.price)?;
            positive(&format!("{}.capacity", i.id), i.capacity)?;
        }
        for (id, n) in &self.recipe.inputs {
            let ing = self
                .ingredient(id)
                .ok_or_else(|| format!("recipe uses unknown ingredient {id}"))?;
            positive(&format!("recipe.{id}"), *n)?;
            if *n > ing.capacity {
                return Err(format!("recipe needs more {id} than fits in storage"));
            }
        }
        if self.recipe.cups > self.jug_capacity {
            return Err("one jug makes more cups than the jug holds".into());
        }
        if self.starting_coins < self.jug_cost() {
            return Err("starting coins cannot pay for the first jug".into());
        }
        if self.recipe.cups * self.cup_price <= self.jug_cost() {
            return Err("a jug must earn more than its ingredients cost".into());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn v1_is_valid_and_matches_the_balance_doc() {
        let m = v1();
        m.validate().unwrap();
        assert_eq!(m.jug_cost(), 4);
        assert_eq!(m.recipe.cups * m.cup_price, 8);
    }

    #[test]
    fn invalid_definitions_are_rejected() {
        let mut m = v1();
        m.recipe.inputs.push(("mint".into(), 1));
        assert!(m.validate().unwrap_err().contains("unknown ingredient"));

        let mut m = v1();
        m.starting_coins = 3;
        assert!(m.validate().is_err());

        let mut m = v1();
        m.cup_price = 1;
        assert!(m.validate().is_err());
    }
}
