#!/bin/sh
set -e

echo "[Entrypoint] Checking for failed Prisma migrations..."

# Get migration status and extract names of any failed migrations
STATUS_OUTPUT=$(npx prisma migrate status --schema prisma/schema.prisma 2>&1 || true)
FAILED_MIGRATIONS=$(echo "$STATUS_OUTPUT" | grep -oE "The \`[^\`]+\` migration started at.*failed" | grep -oE "\`[^\`]+\`" | tr -d '`' || true)

if [ -n "$FAILED_MIGRATIONS" ]; then
  for MIGRATION in $FAILED_MIGRATIONS; do
    echo "[Entrypoint] Resolving failed migration as rolled-back: $MIGRATION"
    npx prisma migrate resolve --rolled-back "$MIGRATION" --schema prisma/schema.prisma || true
  done
fi

echo "[Entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo "[Entrypoint] Starting application..."
exec node dist/main.js
