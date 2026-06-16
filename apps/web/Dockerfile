# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — Pulse Web (React + Vite → bundle estático servido por nginx)
# Contexto de build: RAÍZ del monorepo (para incluir packages/shared y lockfile)
# ─────────────────────────────────────────────────────────────────────────────

# ── Etapa 1: build del bundle estático ───────────────────────────────────────
FROM node:22-slim AS builder

# Habilitar corepack para usar la versión de pnpm declarada en package.json
RUN corepack enable

WORKDIR /app

# URL base de la API en producción (build-time).
# En prod el frontend habla a sí mismo en /api/, que nginx proxea hacia la API.
ARG VITE_API_BASE=/api

# Copiar manifiestos del workspace y lockfile primero (aprovecha cache de capas)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Instalar todas las dependencias (incluyendo devDependencies para el build de Vite)
RUN pnpm install --frozen-lockfile

# Copiar el código fuente del workspace necesario para el build
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

# Ejecutar el build de Vite; VITE_API_BASE se inyecta como variable de entorno
# en tiempo de compilación → queda embebida en el bundle JS
RUN VITE_API_BASE=${VITE_API_BASE} pnpm --filter @pulse/web build

# ── Etapa 2: servidor nginx con los assets estáticos ─────────────────────────
FROM nginx:alpine AS runtime

# Copiar la configuración personalizada de nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el bundle generado por Vite al directorio que sirve nginx
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# nginx:alpine ya corre como root internamente para bindear el puerto 80,
# pero el worker process usa el usuario "nginx" por defecto (configurado en nginx.conf base)

# Puerto expuesto hacia Docker Compose
EXPOSE 80
