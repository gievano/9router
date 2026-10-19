#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

export PORT=30128
export DATA_DIR="$ROOT_DIR/.test-data"
export NEXT_DIST_DIR=".next-test"
export NODE_ENV=development

echo "======================================================="
echo "  9Router (Isolated Dev Instance)"
echo "======================================================="
echo "  Port:      http://127.0.0.1:$PORT"
echo "  Dashboard: http://127.0.0.1:$PORT/dashboard/prompt-injection"
echo "  Data Dir:  $DATA_DIR"
echo "  Original:  Port 20128 (Safe & Untouched)"
echo "======================================================="

npx next dev --port "$PORT" --hostname 127.0.0.1
