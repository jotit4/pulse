# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — Pulse API (Hono + Drizzle + Node 22)
# Contexto de build: RAÍZ del monorepo (para incluir packages/shared y lockfile)
# ─────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: instalación de dependencias ─────────────────────────────────────
FROM node:22-slim AS deps

# Habilitar corepack para usar la versión de pnpm declarada en package.json
RUN corepack enable

WORKDIR /app

# Copiar manifiestos del workspace y lockfile primero (aprovecha cache de capas)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Instalar SOLO las dependencias de producción del workspace
# --frozen-lockfile garantiza reproducibilidad; --ignore-scripts evita binarios
# que no correspondan al host (argon2 usa binarios precompilados por @node-rs/argon2)
RUN pnpm install --frozen-lockfile

# ── Etapa 2: imagen de runtime ────────────────────────────────────────────────
FROM node:22-slim AS runtime

# Habilitar corepack en la imagen final también
RUN corepack enable

# Usuario sin privilegios para mayor seguridad
RUN groupadd --system pulse && useradd --system --gid pulse --no-create-home pulse

WORKDIR /app

# Copiar node_modules ya instalados desde la etapa anterior. Con pnpm, cada
# workspace tiene su propio node_modules (symlinks al store de la raíz), por eso
# se copian los tres niveles para preservar la resolución de módulos.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copiar código fuente del monorepo relevante para la API
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# El entrypoint necesita ser ejecutable
RUN chmod +x ./apps/api/entrypoint.sh

# Cambiar al usuario sin privilegios
USER pulse

# Puerto que expone la API (coincide con API_PORT default = 3001)
EXPOSE 3001

# Punto de entrada: aplica migraciones, seed opcional y arranca el server
ENTRYPOINT ["./apps/api/entrypoint.sh"]
