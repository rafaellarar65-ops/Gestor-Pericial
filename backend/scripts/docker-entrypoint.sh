#!/bin/sh
set -e

MAX_RETRIES=3
RETRY_DELAY=5

echo "[Entrypoint] Running Prisma migrations..."

attempt=1
while [ "$attempt" -le "$MAX_RETRIES" ]; do
  if npx prisma migrate deploy --schema prisma/schema.prisma; then
    echo "[Entrypoint] Migrations applied successfully."
    break
  fi

  if [ "$attempt" -eq "$MAX_RETRIES" ]; then
    echo "[Entrypoint] WARNING: Migrations failed after $MAX_RETRIES attempts."
    echo "[Entrypoint] Possible causes:"
    echo "[Entrypoint]   - Supabase project is paused (free tier pauses after 7 days)"
    echo "[Entrypoint]   - DIRECT_DATABASE_URL not set (required for migrations)"
    echo "[Entrypoint]   - Network/firewall blocking outbound connections"
    echo "[Entrypoint] Starting application anyway — it will retry DB connection on its own."
    break
  fi

  delay=$((RETRY_DELAY * attempt))
  echo "[Entrypoint] Migration attempt $attempt/$MAX_RETRIES failed. Retrying in ${delay}s..."
  sleep "$delay"
  attempt=$((attempt + 1))
done

echo "[Entrypoint] Starting application..."
exec node dist/main.js
