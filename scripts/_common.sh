#!/usr/bin/env bash
# Shared by the scripts in this folder. Always the dev stack: base + dev overlay.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit it if you need other ports or passwords."
fi
compose() { docker compose -f docker-compose.yml -f docker-compose.dev.yml "$@"; }
