//! Lemonade stand definition v2: the clicker core (balance 2026-11-b,
//! docs/03 §5–§8, decision D13). Immutable once stored: any change needs a
//! new `DEFINITION_VERSION`. Version 1 (rounds with customers) stays stored
//! for old games; they are converted on first use (see `rules::convert_v1`).

use serde::{Deserialize, Serialize};

pub const SCENARIO_ID: &str = "lemonade";
pub const DEFINITION_VERSION: i32 = 2;
pub const RULESET_ID: &str = "lemonade";
pub const RULESET_VERSION: i32 = 2;

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
    /// One jug: its ingredients are bought automatically when the first cup
    /// of a new jug is made.
    pub recipe: Recipe,
    pub cup_price: i64,
    /// Taps the server accepts: `per_second` refill, at most `burst` saved up.
    pub taps_per_second: i64,
    pub tap_burst: i64,
    /// Helpers keep working while the child is away, but only this long.
    pub away_cap_ms: i64,
    pub upgrades: Vec<Upgrade>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Ingredient {
    pub id: String,
    pub price: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Recipe {
    pub inputs: Vec<(String, i64)>,
    pub cups: i64,
}

/// An improvement the child buys by tapping the object it belongs to.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Upgrade {
    pub id: String,
    pub effect: Effect,
    /// Price of each level, cheapest first. Hand-tuned, not one formula (docs/03 §6).
    pub prices: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Effect {
    /// Every level adds this many cups per tap.
    #[serde(rename_all = "camelCase")]
    CupsPerTap { per_level: i64 },
    /// Every level adds a helper making this many thousandths of a cup per second.
    #[serde(rename_all = "camelCase")]
    HelperMilliCupsPerSecond { per_level: i64 },
    /// From level 1 this ingredient costs nothing (an own lemon tree).
    #[serde(rename_all = "camelCase")]
    FreeIngredient { ingredient: String },
}

pub fn v2() -> Manifest {
    Manifest {
        scenario_id: SCENARIO_ID.into(),
        definition_version: DEFINITION_VERSION,
        schema_version: 2,
        balance_version: "2026-11-b".into(),
        ruleset_id: RULESET_ID.into(),
        ruleset_version: RULESET_VERSION,
        name_key: "scenario.lemonade.name".into(),
        asset_pack_id: "lemonade-v2".into(),
        capabilities: vec!["economy".into(), "upgrades".into(), "automation".into()],
        starting_coins: 12,
        ingredients: vec![
            Ingredient {
                id: LEMON.into(),
                price: 1,
            },
            Ingredient {
                id: SUGAR.into(),
                price: 1,
            },
        ],
        recipe: Recipe {
            inputs: vec![(LEMON.into(), 3), (SUGAR.into(), 1)],
            cups: 4,
        },
        cup_price: 2,
        taps_per_second: 12,
        tap_burst: 24,
        away_cap_ms: 2 * 60 * 60 * 1000,
        upgrades: vec![
            Upgrade {
                id: "press".into(),
                effect: Effect::CupsPerTap { per_level: 1 },
                prices: vec![10, 30, 80, 200, 500],
            },
            Upgrade {
                id: "helper".into(),
                effect: Effect::HelperMilliCupsPerSecond { per_level: 500 },
                prices: vec![20, 50, 120, 300, 700],
            },
            Upgrade {
                id: "tree".into(),
                effect: Effect::FreeIngredient {
                    ingredient: LEMON.into(),
                },
                prices: vec![60],
            },
        ],
    }
}

impl Manifest {
    pub fn ingredient(&self, id: &str) -> Option<&Ingredient> {
        self.ingredients.iter().find(|i| i.id == id)
    }

    pub fn upgrade(&self, id: &str) -> Option<&Upgrade> {
        self.upgrades.iter().find(|u| u.id == id)
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
        positive("cupPrice", self.cup_price)?;
        positive("recipe.cups", self.recipe.cups)?;
        positive("tapsPerSecond", self.taps_per_second)?;
        positive("tapBurst", self.tap_burst)?;
        positive("awayCapMs", self.away_cap_ms)?;
        for i in &self.ingredients {
            positive(&format!("{}.price", i.id), i.price)?;
        }
        let mut jug_cost = 0;
        for (id, n) in &self.recipe.inputs {
            let ing = self
                .ingredient(id)
                .ok_or_else(|| format!("recipe uses unknown ingredient {id}"))?;
            positive(&format!("recipe.{id}"), *n)?;
            jug_cost += ing.price * n;
        }
        if self.starting_coins < jug_cost {
            return Err("starting coins cannot pay for the first jug".into());
        }
        if self.recipe.cups * self.cup_price <= jug_cost {
            return Err("a jug must earn more than its ingredients cost".into());
        }
        let mut ids = std::collections::BTreeSet::new();
        for u in &self.upgrades {
            if !ids.insert(&u.id) {
                return Err(format!("duplicate upgrade {}", u.id));
            }
            if u.prices.is_empty() {
                return Err(format!("upgrade {} has no levels", u.id));
            }
            if u.prices.windows(2).any(|w| w[1] <= w[0]) || u.prices[0] <= 0 {
                return Err(format!("upgrade {} prices must rise", u.id));
            }
            match &u.effect {
                Effect::CupsPerTap { per_level } => {
                    positive(&format!("{}.perLevel", u.id), *per_level)?
                }
                Effect::HelperMilliCupsPerSecond { per_level } => {
                    positive(&format!("{}.perLevel", u.id), *per_level)?
                }
                Effect::FreeIngredient { ingredient } => {
                    if self.ingredient(ingredient).is_none() {
                        return Err(format!("upgrade {} frees unknown ingredient", u.id));
                    }
                    if u.prices.len() != 1 {
                        return Err(format!("upgrade {} has exactly one level", u.id));
                    }
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn v2_is_valid_and_matches_the_balance_doc() {
        let m = v2();
        m.validate().unwrap();
        assert_eq!(m.recipe.cups * m.cup_price, 8);
        assert_eq!(m.upgrade("press").unwrap().prices[0], 10);
    }

    #[test]
    fn invalid_definitions_are_rejected() {
        let mut m = v2();
        m.recipe.inputs.push(("mint".into(), 1));
        assert!(m.validate().unwrap_err().contains("unknown ingredient"));

        let mut m = v2();
        m.starting_coins = 3;
        assert!(m.validate().is_err());

        let mut m = v2();
        m.cup_price = 1;
        assert!(m.validate().is_err());

        let mut m = v2();
        m.upgrades[0].prices = vec![10, 10];
        assert!(m.validate().unwrap_err().contains("must rise"));

        let mut m = v2();
        m.upgrades[2].prices = vec![60, 90];
        assert!(m.validate().unwrap_err().contains("exactly one level"));
    }
}
