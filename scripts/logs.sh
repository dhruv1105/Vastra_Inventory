#!/usr/bin/env bash
# Follow logs: ./scripts/logs.sh [app|db]
source "$(dirname "$0")/_common.sh"
compose logs -f --tail 100 "${1:-app}"
