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
- **Frontend:** `apps/web` — React + Vite + Tailwind v4 + TanStack Query *(pendiente)*.
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

**Hecho (62 tests verdes):** scaffold monorepo · server Hono + healthcheck · schema
Drizzle (users/sessions/tweets/follows/likes) + migraciones · `@pulse/shared` · auth
(registro/login/logout/me) · tweets CRUD · social (follows + likes + listados) ·
timeline (cursor keyset).

### Endpoints implementados
```
GET    /health
POST   /auth/register      POST /auth/login      POST /auth/logout     GET /auth/me
POST   /tweets             GET  /tweets/:id      DELETE /tweets/:id
POST   /tweets/:id/like    DELETE /tweets/:id/like
POST   /users/:username/follow      DELETE /users/:username/follow
GET    /users/:username/followers   GET /users/:username/following
GET    /timeline?cursor=&limit=
```

## Plan restante (en orden)

1. **users**: `GET /users/search?q=&limit=` (ilike username/name) ·
   `GET /users/:username` → `UserProfile` (counts + `isFollowing`) ·
   `GET /users/:username/tweets?cursor=` (paginado). Tipos `UserProfile` ya en
   `@pulse/shared`. Reutilizar `tweetViewSelect` + `encodeCursor`. Registrar `/search`
   ANTES de `/:username`. Convive con las rutas social ya montadas en `/users/...`.
2. **seed**: ≥10 usuarios con tweets, follows y likes cruzados; credenciales de ejemplo
   documentadas. Levantar y ver contenido inmediato.
3. **cobertura ≥85%** del backend (`vitest run --coverage`); cerrar gaps.
4. **frontend** `apps/web`: Vite + React + Tailwind v4 (mobile-first, breakpoints
   640/1024) + TanStack Query; auth UI + contexto de sesión + rutas protegidas;
   timeline + infinite scroll; compose/delete tweet (≤280 con contador); perfil +
   follow/like + followers/following; búsqueda. Tests de integración (login, crear
   tweet, follow) + E2E de auth con Playwright.
5. **bonus**: timeline en tiempo real vía SSE (Hono streaming) + `docker-compose`
   (pg + api + web, un solo comando) que blinde el Runbook.
6. **README/Runbook** completo: prerrequisitos, instalación, seed, dev, tests, `.env`
   (ver `.env.example`), credenciales de ejemplo, decisiones técnicas (stack, timeline,
   grafo de follows, auth, trade-offs) y herramientas de AI usadas.

## Modo de trabajo
Orquestar con subagentes Sonnet para implementación cuando convenga (cuidar contexto);
paralelizar sólo cuando los módulos no comparten archivos (p. ej. el frontend). El
orquestador conserva el control de los commits y verifica con typecheck + tests.
