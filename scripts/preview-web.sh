#!/usr/bin/env bash
# Nuxt dev server on 3022 with /api proxied to the preview API (8802).
source "$(dirname "$0")/lib.sh"
require_free_port 3022
cd "$ROOT/apps/web"
export NUXT_API_PROXY=http://127.0.0.1:8802
exec npx nuxt dev --host 127.0.0.1 --port 3022
