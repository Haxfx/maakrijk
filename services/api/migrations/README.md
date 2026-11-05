# Migrations

SQL migrations, compiled into the API binary and applied on start.

- Name: `YYYYMMDDHHMMSS_description.sql`.
- Never edit a migration that has been applied anywhere; add a new one.
- Run new migrations on `maakrijk_test` and `maakrijk_preview` before `maakrijk_dev`.
