#!/bin/sh

MAX_RETRIES=3
i=0
SUCCESS=false

while [ $i -lt $MAX_RETRIES ]; do
  i=$((i + 1))
  echo "[Entrypoint] Running Prisma migrations (attempt $i of $MAX_RETRIES)..."

  DEPLOY_OUT=$(npx prisma migrate deploy --schema prisma/schema.prisma 2>&1)
  DEPLOY_RC=$?
  echo "$DEPLOY_OUT"

  if [ $DEPLOY_RC -eq 0 ]; then
    echo "[Entrypoint] Migrations applied successfully."
    SUCCESS=true
    break
  fi

  # P3009: a prior migration is marked failed — resolve it and retry
  if echo "$DEPLOY_OUT" | grep -q "P3009"; then
    FAILED=$(echo "$DEPLOY_OUT" | sed -n 's/.*The `\([^`]*\)` migration .* failed.*/\1/p' | head -1)
    if [ -n "$FAILED" ]; then
      echo "[Entrypoint] Resolving failed migration as rolled-back: $FAILED"
      npx prisma migrate resolve --rolled-back "$FAILED" --schema prisma/schema.prisma 2>&1 || true
    else
      echo "[Entrypoint] P3009 detected but could not extract migration name. Exiting."
      exit 1
    fi
  else
    echo "[Entrypoint] Migration failed with unexpected error. Exiting."
    exit 1
  fi
done

if [ "$SUCCESS" != "true" ]; then
  echo "[Entrypoint] Failed to apply migrations after $MAX_RETRIES attempts. Exiting."
  exit 1
fi

echo "[Entrypoint] Starting application..."
exec node dist/main.js
