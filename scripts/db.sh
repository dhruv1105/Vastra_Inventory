#!/usr/bin/env bash
# Database commands inside the running app container:
#   ./scripts/db.sh migrate | seed | status     run scripts/db.mjs (seed includes dev data)
#   ./scripts/db.sh shell                       psql prompt
source "$(dirname "$0")/_common.sh"
cmd="${1:-status}"
case "$cmd" in
  shell) compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' ;;
  seed)  compose exec app node scripts/db.mjs seed --dev ;;
  migrate|status) compose exec app node scripts/db.mjs "$cmd" ;;
  *) echo "Usage: $0 migrate|seed|status|shell" >&2; exit 1 ;;
esac
