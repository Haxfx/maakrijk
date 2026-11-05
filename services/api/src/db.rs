//! Database migrations.

use sqlx::PgPool;
use sqlx::migrate::{MigrateError, Migrator};

pub static MIGRATOR: Migrator = sqlx::migrate!();

pub async fn migrate(pool: &PgPool) -> Result<(), MigrateError> {
    MIGRATOR.run(pool).await
}
