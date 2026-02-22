#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "==> Installing backend dependencies..."
cd "$REPO_ROOT/backend"
npm install

echo "==> Generating Prisma client..."
npx prisma generate --schema prisma/schema.prisma

echo "==> Installing frontend dependencies..."
cd "$REPO_ROOT/frontend"
npm install

echo "==> Setup complete."
