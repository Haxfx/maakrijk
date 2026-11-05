#!/usr/bin/env bash
# Preview API on 8802 against maakrijk_preview, serving the preview build.
# Never touches the dev database or the dev build folder.
source "$(dirname "$0")/lib.sh"
require_free_port 8802
cd "$ROOT/services/api"
export DATABASE_URL="$DB_BASE/maakrijk_preview" BIND_ADDR=127.0.0.1:8802
WEB="$ROOT/apps/web/.output-preview/public"
export WEB_DIR=""; [ -f "$WEB/200.html" ] && WEB_DIR="$WEB"
# Separate cargo target folder, so a preview build never replaces the dev binary.
export CARGO_TARGET_DIR="$ROOT/services/api/target-preview"
exec cargo run --quiet --bin maakrijk-api
