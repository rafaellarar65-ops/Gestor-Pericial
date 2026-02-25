#!/bin/sh
set -e

echo "[Entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo "[Entrypoint] Starting application..."
exec node dist/main.js
