# Shared helpers for the start scripts. Source, do not run.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_BASE="postgres://maakrijk:maakrijk_dev_only@127.0.0.1:5450"

# Refuse to start when something already listens on the port. Never stops
# other processes: they may belong to another project.
require_free_port() {
  local port="$1"
  if ss -ltn "sport = :$port" 2>/dev/null | grep -q LISTEN; then
    echo "Port $port is already in use. Stop that process yourself or pick another port." >&2
    exit 1
  fi
}
