#!/usr/bin/env bash
# Start Postgres + the app with live reload. Migrations and seeds run on every start.
source "$(dirname "$0")/_common.sh"
compose up -d --build
port="$(grep -E '^APP_PORT=' .env | cut -d= -f2)"; port="${port:-3000}"
echo "Waiting for the app on http://localhost:${port} …"
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://localhost:${port}/api/health"; then
    echo "Ready: http://localhost:${port}  (dev login: \"Dev Bypass Login\")"
    exit 0
  fi
  sleep 2
done
echo "The app did not answer in time. Check: ./scripts/logs.sh app" >&2
exit 1
