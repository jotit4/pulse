#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# entrypoint.sh — aplica migraciones, opcionalmente hace seed y arranca la API
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "⏳ Aplicando migraciones de base de datos..."
pnpm --filter @pulse/api db:migrate

# Si SEED_ON_START=true, ejecuta el seed (útil para demo / primera vez)
if [ "${SEED_ON_START}" = "true" ]; then
  echo "🌱 Ejecutando seed de datos de ejemplo..."
  pnpm --filter @pulse/api db:seed
fi

echo "🚀 Arrancando la API..."
exec pnpm --filter @pulse/api start
