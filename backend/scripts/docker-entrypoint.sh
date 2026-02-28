#!/bin/sh
set -e

echo "[Entrypoint] Checking for failed Prisma migrations..."

STATUS_OUTPUT=$(npx prisma migrate status --schema prisma/schema.prisma 2>&1 || true)
echo "[Entrypoint] Migration status:"
echo "$STATUS_OUTPUT"

# Extract failed migration names using a loose pattern that handles
# various Prisma output formats (backtick-quoted or plain names)
FAILED_MIGRATIONS=$(echo "$STATUS_OUTPUT" | grep -i "failed" | grep -oE '[0-9]{12,}_[a-zA-Z_]+' || true)

if [ -n "$FAILED_MIGRATIONS" ]; then
  for MIGRATION in $FAILED_MIGRATIONS; do
    echo "[Entrypoint] Resolving failed migration: $MIGRATION"
    npx prisma migrate resolve --rolled-back "$MIGRATION" --schema prisma/schema.prisma 2>&1 || \
    npx prisma migrate resolve --applied "$MIGRATION" --schema prisma/schema.prisma 2>&1 || true
  done
fi

echo "[Entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo "[Entrypoint] Starting application..."
exec node dist/main.js
