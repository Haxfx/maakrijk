#!/usr/bin/env bash
# Static web build for one target: dev | preview | e2e | release.
# Each target writes to its own folder (apps/web/.output-<target>).
source "$(dirname "$0")/lib.sh"
target="${1:?usage: build-web.sh dev|preview|e2e|release}"
cd "$ROOT/apps/web"
MAAKRIJK_BUILD_TARGET="$target" npx nuxt generate
