#!/bin/sh
set -e

echo "[Entrypoint] Attempting Prisma migrate deploy..."

# Try deploy first. If it succeeds, skip straight to app start.
DEPLOY_OUTPUT=$(npx prisma migrate deploy --schema prisma/schema.prisma 2>&1) && {
  echo "$DEPLOY_OUTPUT"
  echo "[Entrypoint] Migrations applied successfully."
  echo "[Entrypoint] Starting application..."
  exec node dist/main.js
}

# Deploy failed – check if it's a P3009 (failed migration blocking)
echo "[Entrypoint] Deploy failed. Output:"
echo "$DEPLOY_OUTPUT"

if echo "$DEPLOY_OUTPUT" | grep -q "P3009"; then
  # Extract the failed migration name from the error message.
  # Prisma outputs: "The `<migration_name>` migration started at ..."
  FAILED_MIGRATION=$(echo "$DEPLOY_OUTPUT" | grep -oE 'The `[^`]+` migration' | head -1 | sed 's/The `//;s/` migration//')

  if [ -z "$FAILED_MIGRATION" ]; then
    # Fallback: extract any timestamp_name pattern near "failed"
    FAILED_MIGRATION=$(echo "$DEPLOY_OUTPUT" | grep -i "failed" | grep -oE '[0-9]{12,}_[a-zA-Z_]+' | head -1)
  fi

  if [ -n "$FAILED_MIGRATION" ]; then
    echo "[Entrypoint] Resolving failed migration: $FAILED_MIGRATION"

    # Try --rolled-back first (marks as rolled back, will re-run)
    npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" --schema prisma/schema.prisma 2>&1 && {
      echo "[Entrypoint] Marked '$FAILED_MIGRATION' as rolled-back. Retrying deploy..."
      npx prisma migrate deploy --schema prisma/schema.prisma
      echo "[Entrypoint] Starting application..."
      exec node dist/main.js
    }

    # If --rolled-back didn't work, try --applied (marks as applied, skips it)
    echo "[Entrypoint] rolled-back resolution failed, trying --applied..."
    npx prisma migrate resolve --applied "$FAILED_MIGRATION" --schema prisma/schema.prisma 2>&1 && {
      echo "[Entrypoint] Marked '$FAILED_MIGRATION' as applied. Retrying deploy..."
      npx prisma migrate deploy --schema prisma/schema.prisma
      echo "[Entrypoint] Starting application..."
      exec node dist/main.js
    }

    echo "[Entrypoint] ERROR: Could not resolve migration '$FAILED_MIGRATION'"
    exit 1
  else
    echo "[Entrypoint] ERROR: P3009 detected but could not extract migration name"
    exit 1
  fi
else
  echo "[Entrypoint] ERROR: Deploy failed with a non-P3009 error"
  exit 1
fi
