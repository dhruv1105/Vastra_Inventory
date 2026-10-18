#!/usr/bin/env bash
# Stop the stack. Data is kept.
source "$(dirname "$0")/_common.sh"
compose down
