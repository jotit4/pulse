#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# entrypoint.sh — aplica migraciones, opcionalmente hace seed y arranca la API.
#
# En runtime NO usamos pnpm/corepack: el contenedor corre como usuario sin
# privilegios y corepack no puede escribir su caché en $HOME. Invocamos `tsx`
# directamente desde node_modules, que es todo lo que la app necesita para correr.
# ─────────────────────────────────────────────────────────────────────────────
set -e

# Ubicarse en el paquete de la API (este script vive en /app/apps/api).
cd "$(dirname "$0")"

TSX="node_modules/.bin/tsx"

echo "⏳ Aplicando migraciones de base de datos..."
"$TSX" src/db/migrate.ts

# Si SEED_ON_START=true, ejecuta el seed (útil para demo / primera vez).
if [ "${SEED_ON_START}" = "true" ]; then
  echo "🌱 Ejecutando seed de datos de ejemplo..."
  "$TSX" src/db/seed.ts
fi

echo "🚀 Arrancando la API..."
exec "$TSX" src/index.ts
