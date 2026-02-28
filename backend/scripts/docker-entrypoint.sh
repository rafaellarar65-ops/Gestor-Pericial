#!/bin/sh
set -e

echo "[Entrypoint] Checking for failed Prisma migrations..."

# Get migration status (capture both stdout and stderr)
STATUS_OUTPUT=$(npx prisma migrate status --schema prisma/schema.prisma 2>&1 || true)

# Check if there are failed migrations by looking for the P3009 error or "failed" keyword
if echo "$STATUS_OUTPUT" | grep -q "failed"; then
  echo "[Entrypoint] Detected failed migration(s). Extracting names..."

  # Extract migration names from lines like:
  # The `202602281200_telepericia_queue` migration started at ... failed
  FAILED_MIGRATIONS=$(echo "$STATUS_OUTPUT" | sed -n 's/.*The `\([^`]*\)` migration .* failed.*/\1/p')

  if [ -n "$FAILED_MIGRATIONS" ]; then
    for MIGRATION in $FAILED_MIGRATIONS; do
      echo "[Entrypoint] Resolving failed migration as rolled-back: $MIGRATION"
      npx prisma migrate resolve --rolled-back "$MIGRATION" --schema prisma/schema.prisma 2>&1 || true
    done
  else
    echo "[Entrypoint] Warning: Failed migration detected but could not extract name from output:"
    echo "$STATUS_OUTPUT"
  fi

  # Re-check status after resolving
  echo "[Entrypoint] Re-checking migration status after resolve..."
  STATUS_RECHECK=$(npx prisma migrate status --schema prisma/schema.prisma 2>&1 || true)
  if echo "$STATUS_RECHECK" | grep -q "P3009"; then
    echo "[Entrypoint] Error: Failed migrations still present after resolve attempt."
    echo "$STATUS_RECHECK"
    exit 1
  fi
fi

echo "[Entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo "[Entrypoint] Starting application..."
exec node dist/main.js
