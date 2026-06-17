# Pulse — Guía para Claude Code

Clon funcional de **Twitter/X** (challenge full-stack). Monorepo **pnpm** (Node 22).
Este archivo es el contexto operativo para retomar el trabajo en cualquier sesión
(local o cloud) conectada a este repo.

## Cómo retomar en 30 segundos

```bash
pnpm install
pnpm --filter @pulse/api test     # backend (Vitest + PGlite en memoria)
git log --oneline                 # ver la historia del desarrollo
```

- **Backend:** `apps/api` — Hono + Drizzle + PostgreSQL (PGlite en memoria para tests).
- **Frontend:** `apps/web` — React + Vite + Tailwind v4 + TanStack Query.
- **Compartido:** `packages/shared` — schemas Zod + tipos (contrato API ↔ web).

## Convenciones NO NEGOCIABLES (el challenge evalúa el proceso)

- **Commits granulares, SIN squash**, en español, estilo conventional commits
  (`feat:`, `chore:`, `docs:`, `test:`…). Cada commit cierra con el trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Tests junto a cada feature**, nunca todos al final. Objetivo de cobertura backend **≥85%**.
- Antes de commitear: `pnpm --filter @pulse/api typecheck` + `vitest run` en **verde**.
  Pushear cada commit a `origin/main` (cuenta gh `jotit4`, repo `jotit4/pulse`).
- Idioma de comentarios y mensajes: **español** (con acentos correctos).

## Patrones del backend (seguir EXACTO para mantener consistencia)

- Un módulo por feature: `src/<modulo>/{service.ts, routes.ts, <modulo>.test.ts}`.
- `service.ts`: lógica pura; funciones que reciben `db: Database`. Errores de negocio
  con `HttpError(message, status)` (`src/http/errors.ts`); el handler global los traduce.
- `routes.ts`: `export function createXRoutes({ db, config }: AppDeps): Hono<AppEnv>`.
  Auth con `requireAuth(db, config.auth)`; validación de body con `validateJson(schema)`
  (`src/http/validation.ts`), schemas desde `@pulse/shared`.
- `createApp(deps)` (`src/app.ts`) inyecta `{ db, config }`. Los tests usan
  `createTestApp()` (`test/helpers/app.ts`) contra **PGlite**, con `registerAndAuth`.
- Reutilizables clave: `tweetViewSelect`/`rowToTweetView` (`src/tweets/service.ts`) para
  proyectar tweets con autor + likesCount + likedByMe; `encodeCursor`/`decodeCursor`
  (`src/timeline/service.ts`) para paginación keyset.
- Auth: sesión por token opaco (256 bits) en cookie httpOnly; en la DB sólo su SHA-256.
  Passwords con Argon2id. Timeline y listados por cursor keyset (sin offset).

## Estado actual

**COMPLETO — entregable.** 137 tests backend (cobertura 93.85%) + 21 tests frontend de
integración + 2 E2E Playwright (registro/login/logout). Cero fallos.

Features implementadas: scaffold monorepo · server Hono + healthcheck · schema Drizzle
(users/sessions/tweets/follows/likes) + migraciones · `@pulse/shared` · auth
(registro/login/logout/me) · tweets CRUD · social (follows + likes + listados) ·
timeline (cursor keyset) · módulo users (búsqueda, perfil, tweets de usuario) · seed
(12 usuarios con tweets, follows y likes cruzados) · frontend React completo (auth UI,
timeline + infinite scroll, composer, perfil + follow/tabs, búsqueda) · SSE real-time
(event-bus, Hono streaming, consumido por el cliente) · `docker-compose` (pg + api +
web, un solo comando) · README/Runbook completo.

### Endpoints implementados

```
GET    /health
POST   /auth/register      POST /auth/login      POST /auth/logout     GET /auth/me
POST   /tweets             GET  /tweets/:id      DELETE /tweets/:id
POST   /tweets/:id/like    DELETE /tweets/:id/like
POST   /users/:username/follow      DELETE /users/:username/follow
GET    /users/:username/followers   GET /users/:username/following
GET    /users/search?q=&limit=
GET    /users/:username
GET    /users/:username/tweets?cursor=&limit=
GET    /timeline?cursor=&limit=
GET    /timeline/stream   (SSE)
```

## Estado: entregable

El proyecto está completo. No hay trabajo pendiente de implementación. Para levantar
el stack completo en un comando ver el README (`docker compose up --build`) o el
Runbook de desarrollo (`pnpm install && pnpm --filter @pulse/api dev`).

## Modo de trabajo

Orquestar con subagentes Sonnet para implementación cuando convenga (cuidar contexto);
paralelizar sólo cuando los módulos no comparten archivos (p. ej. el frontend). El
orquestador conserva el control de los commits y verifica con typecheck + tests.
