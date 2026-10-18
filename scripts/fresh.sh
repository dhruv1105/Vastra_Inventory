#!/usr/bin/env bash
# Wipe the database and uploaded photos, then start clean (migrate + seed).
source "$(dirname "$0")/_common.sh"
read -r -p "This deletes all local data (database and photos). Type 'wipe' to continue: " ok
[[ "$ok" == "wipe" ]] || { echo "Cancelled."; exit 1; }
compose down -v
exec "$(dirname "$0")/dev-up.sh"
