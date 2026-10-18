#!/usr/bin/env bash
# Type check + lint inside the app container (no local Node needed). Add "build" to also build.
source "$(dirname "$0")/_common.sh"
compose exec app npx tsc --noEmit
compose exec app npm run lint
if [[ "${1:-}" == "build" ]]; then compose exec app npm run build; fi
