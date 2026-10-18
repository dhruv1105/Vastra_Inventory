#!/usr/bin/env bash
# Create the first owner or reset an owner's password in the running dev stack:
#   ./scripts/create-owner.sh --name "Krishna Sindha" --phone 98765 43210
#   OWNER_PASSWORD='…' ./scripts/create-owner.sh --phone 9876543210 --reset-password
source "$(dirname "$0")/_common.sh"
compose exec -e OWNER_PASSWORD="${OWNER_PASSWORD:-}" app node scripts/create-owner.mjs "$@"
