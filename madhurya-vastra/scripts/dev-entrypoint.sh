#!/bin/sh
# Dev container start (docker-compose.dev.yml). node_modules lives in a Docker volume that
# never refreshes on its own, so reinstall whenever package-lock.json changes.
set -e
hash="$(md5sum package-lock.json | cut -d' ' -f1)"
if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$hash" ]; then
  echo "package-lock.json changed — installing dependencies…"
  npm install --no-audit --no-fund
  echo "$hash" > node_modules/.lock-hash
fi
npm run db:migrate
npm run db:seed
# Test owner for the login screen (phone +919876543210 / owner@example.com, password madhurya-dev).
node scripts/create-owner.mjs --dev
exec npm run dev -- -H 0.0.0.0
