#!/bin/sh
set -e

echo "[Entrypoint] Running Prisma migrations..."
if npx prisma migrate deploy --schema prisma/schema.prisma; then
  echo "[Entrypoint] Migrations applied successfully."
else
  echo "[Entrypoint] ERROR: Migration failed!"
  echo "[Entrypoint] If using Supabase, make sure you have set DIRECT_DATABASE_URL"
  echo "[Entrypoint]   to the direct connection (db.<ref>.supabase.co:5432) with ?sslmode=require"
  echo "[Entrypoint] The pooler URL (pooler.supabase.com) does NOT support migrations."
  exit 1
fi

echo "[Entrypoint] Starting application..."
exec node dist/main.js
