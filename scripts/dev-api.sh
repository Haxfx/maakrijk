#!/usr/bin/env bash
# Dev API on 8800 against maakrijk_dev. Serves apps/web/.output-dev if built.
source "$(dirname "$0")/lib.sh"
require_free_port 8800
cd "$ROOT/services/api"
export DATABASE_URL="$DB_BASE/maakrijk_dev" BIND_ADDR=127.0.0.1:8800
WEB="$ROOT/apps/web/.output-dev/public"
export WEB_DIR=""; [ -f "$WEB/200.html" ] && WEB_DIR="$WEB"
exec cargo run --quiet --bin maakrijk-api
