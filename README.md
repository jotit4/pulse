# Pulse

Clon funcional de Twitter/X construido como challenge full-stack. Cubre el ciclo
completo: autenticación propia, tweets, grafo social de follows, likes, timeline
paginado con cursor keyset, búsqueda de usuarios, perfiles, **actualizaciones en
tiempo real por SSE** y despliegue con Docker en un solo comando.

**Stack:** Node 22 · TypeScript · Hono · Drizzle ORM · PostgreSQL · React 18 ·
Vite · Tailwind CSS v4 · TanStack Query · React Router v7 · Playwright · Vitest

---

## Características

- Registro y login (email o username), logout y sesión persistente por cookie `httpOnly`.
- Tweets: crear (≤ 280 caracteres con contador), leer y eliminar los propios.
- Follows: seguir / dejar de seguir; listados de seguidores y seguidos.
- Likes: dar y quitar like; contadores por tweet.
- **Timeline dual:** pestaña "Siguiendo" (tweets propios + de usuarios seguidos) y
  pestaña "Para ti / Explorar" (feed global de todos los usuarios). Ambos con
  paginación por cursor keyset e infinite scroll en la UI.
- Búsqueda de usuarios por username o nombre (coincidencia parcial, case-insensitive).
- Perfil público con contadores (tweets / seguidores / seguidos) y botón Seguir.
- **Sugeridos "A quién seguir":** panel con usuarios que el viewer aún no sigue,
  ordenados por número de seguidores descendente.
- **Replies en hilo:** responder a un tweet, ver las respuestas en orden cronológico
  y navegar al hilo completo. Vista de tweet individual en `/tweet/:id`.
- **Bookmarks:** guardar y eliminar tweets; lista propia paginada.
- **Notificaciones:** eventos de follow, like y reply con badge de no leídas en la
  barra lateral; marcar todo como leído.
- **Dark theme** con toggle en la interfaz (persistido en `localStorage`).
- **Pulse AI:** chatbot integrado (pestaña Chat en la UI) impulsado por Groq.
  Proxy server-side: la API key nunca llega al navegador. Sin key configurada
  devuelve un aviso en lugar de fallar.
- **Actualizaciones en tiempo real** vía Server-Sent Events (`GET /realtime/stream`):
  los tweets nuevos aparecen al instante en el timeline sin recargar la página.
- Seed con 12 usuarios, 40 tweets y un grafo denso de follows/likes cruzados para
  explorar contenido desde el primer arranque.

---

## Arquitectura

```
pulse/ (monorepo pnpm)
├── apps/
│   ├── api/          Hono + Drizzle + PostgreSQL
│   └── web/          React + Vite + Tailwind v4 + TanStack Query
└── packages/
    └── shared/       schemas Zod + tipos TypeScript (contrato API ↔ web)
```

> **Bonus implementados:** real-time SSE, reply threads, sistema de notificaciones y
> docker-compose con tres servicios (db + api + web) en un solo comando.

`@pulse/shared` es el contrato entre capas: los mismos tipos `TweetView`,
`UserProfile`, `RegisterInput`, etc. los consume el backend para validar y el
frontend para tipar las respuestas. El cliente HTTP de la web
(`apps/web/src/api/client.ts`) es un wrapper tipado sobre `fetch` que envía la
cookie de sesión con `credentials: "include"`.

En Docker, nginx sirve la SPA y proxea `/api/*` → `http://api:3001/` dentro de la
red interna, por lo que el frontend y la API quedan en el mismo origen (puerto 8080)
y las cookies no necesitan `SameSite: None`.

---

## Prerrequisitos

| Requisito        | Versión mínima      | Notas                                          |
| ---------------- | ------------------- | ---------------------------------------------- |
| Node.js          | 22.x                | Declarado en `engines` del `package.json` raíz |
| pnpm             | 10.x                | `npm install -g pnpm@10` si no está instalado  |
| PostgreSQL       | 14+                 | Solo para desarrollo local; Docker lo incluye  |
| Docker + Compose | cualquiera reciente | Opcional; recomendado para demo rápida         |

---

## Puesta en marcha

### Opción A — Docker (recomendado, un solo comando)

```bash
docker compose up --build
```

Levanta tres servicios en orden:

1. `db` — PostgreSQL 16 con healthcheck.
2. `api` — Hono; espera a que `db` esté listo, ejecuta migraciones y seed
   (controlado por `SEED_ON_START=true` en el compose).
3. `web` — SPA compilada servida por nginx; espera a que `api` responda en `/health`.

**URLs:**

| Servicio | URL                     |
| -------- | ----------------------- |
| Frontend | <http://localhost:8080> |
| API      | <http://localhost:3001> |

Para detener y limpiar el volumen de datos:

```bash
docker compose down -v
```

### Opción B — Desarrollo local

```bash
# 1. Instalar dependencias del monorepo
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env si tu PostgreSQL usa credenciales distintas a las por defecto

# 3. Crear la base de datos en PostgreSQL (si no existe)
createdb pulse

# 4. Ejecutar migraciones
pnpm --filter @pulse/api db:migrate

# 5. Cargar datos de ejemplo
pnpm --filter @pulse/api db:seed

# 6. Levantar API y frontend en terminales separadas
pnpm --filter @pulse/api dev   # → http://localhost:3001
pnpm --filter @pulse/web dev   # → http://localhost:5173
```

El proxy de Vite redirige `/api` → `localhost:3001` en desarrollo, por lo que no
es necesario configurar CORS adicional para la web local.

---

## Credenciales de ejemplo (seed)

Todos los usuarios del seed comparten la misma contraseña: **`password123`**

| Username      | Email            | Perfil                |
| ------------- | ---------------- | --------------------- |
| `luna_garcia` | luna@pulse.dev   | Diseñadora UX         |
| `marcos_dev`  | marcos@pulse.dev | Desarrollador backend |
| `sofia_mm`    | sofia@pulse.dev  | Periodista digital    |

El seed carga 12 usuarios con 40 tweets y un grafo denso de follows y likes
cruzados, de modo que el timeline tiene contenido interesante desde el primer login.

---

## API — Referencia de endpoints

Todos los endpoints marcados como "Sí" en la columna Auth requieren la cookie de
sesión establecida por `POST /auth/login` o `POST /auth/register`.

### Salud

| Método | Ruta      | Descripción                        | Auth |
| ------ | --------- | ---------------------------------- | ---- |
| `GET`  | `/health` | Verificación de salud del servidor | No   |

### Autenticación

| Método | Ruta             | Descripción                             | Auth |
| ------ | ---------------- | --------------------------------------- | ---- |
| `POST` | `/auth/register` | Registra un usuario nuevo y abre sesión | No   |
| `POST` | `/auth/login`    | Inicia sesión (acepta email o username) | No   |
| `POST` | `/auth/logout`   | Cierra sesión y borra la cookie         | Sí   |
| `GET`  | `/auth/me`       | Devuelve el usuario de la sesión activa | Sí   |

### Tweets

| Método   | Ruta          | Descripción                      | Auth |
| -------- | ------------- | -------------------------------- | ---- |
| `POST`   | `/tweets`     | Crea un tweet (≤ 280 caracteres) | Sí   |
| `GET`    | `/tweets/:id` | Obtiene un tweet por UUID        | Sí   |
| `DELETE` | `/tweets/:id` | Elimina un tweet propio          | Sí   |

### Likes

| Método   | Ruta               | Descripción              | Auth |
| -------- | ------------------ | ------------------------ | ---- |
| `POST`   | `/tweets/:id/like` | Da like a un tweet       | Sí   |
| `DELETE` | `/tweets/:id/like` | Quita el like a un tweet | Sí   |

### Follows

| Método   | Ruta                         | Descripción                  | Auth |
| -------- | ---------------------------- | ---------------------------- | ---- |
| `POST`   | `/users/:username/follow`    | Sigue a un usuario           | Sí   |
| `DELETE` | `/users/:username/follow`    | Deja de seguir a un usuario  | Sí   |
| `GET`    | `/users/:username/followers` | Lista seguidores del usuario | Sí   |
| `GET`    | `/users/:username/following` | Lista usuarios que sigue     | Sí   |

### Usuarios

| Método | Ruta                                     | Descripción                                                   | Auth |
| ------ | ---------------------------------------- | ------------------------------------------------------------- | ---- |
| `GET`  | `/users/search?q=&limit=`                | Búsqueda por username o nombre (ilike)                        | Sí   |
| `GET`  | `/users/suggestions?limit=`              | Sugeridos "A quién seguir" (no seguidos, orden por followers) | Sí   |
| `GET`  | `/users/:username`                       | Perfil con contadores e `isFollowing`                         | Sí   |
| `GET`  | `/users/:username/followers`             | Lista seguidores del usuario                                  | Sí   |
| `GET`  | `/users/:username/following`             | Lista usuarios que sigue                                      | Sí   |
| `GET`  | `/users/:username/tweets?cursor=&limit=` | Tweets del usuario paginados por cursor keyset                | Sí   |

### Timeline

| Método | Ruta                       | Descripción                                                    | Auth |
| ------ | -------------------------- | -------------------------------------------------------------- | ---- |
| `GET`  | `/timeline?cursor=&limit=` | Tweets propios + de seguidos (1–50 por página, por defecto 20) | Sí   |

### Explorar

| Método | Ruta                      | Descripción                                                                                                            | Auth |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---- |
| `GET`  | `/explore?cursor=&limit=` | Feed global de tweets recientes (todos los usuarios, sin filtrar por follows); misma paginación keyset que `/timeline` | Sí   |

### Replies e hilos

| Método | Ruta                                 | Descripción                                                   | Auth |
| ------ | ------------------------------------ | ------------------------------------------------------------- | ---- |
| `POST` | `/tweets/:id/reply`                  | Crea una respuesta al tweet `:id`                             | Sí   |
| `GET`  | `/tweets/:id/replies?cursor=&limit=` | Lista las respuestas del tweet (orden cronológico ascendente) | Sí   |
| `GET`  | `/tweets/:id/thread`                 | Devuelve el tweet y su padre directo (hilo)                   | Sí   |

### Bookmarks

| Método   | Ruta                        | Descripción                                        | Auth |
| -------- | --------------------------- | -------------------------------------------------- | ---- |
| `POST`   | `/tweets/:id/bookmark`      | Guarda el tweet `:id` en los bookmarks del viewer  | Sí   |
| `DELETE` | `/tweets/:id/bookmark`      | Elimina el tweet `:id` de los bookmarks del viewer | Sí   |
| `GET`    | `/bookmarks?cursor=&limit=` | Lista los tweets guardados del viewer (paginado)   | Sí   |

### Notificaciones

| Método | Ruta                            | Descripción                                           | Auth |
| ------ | ------------------------------- | ----------------------------------------------------- | ---- |
| `GET`  | `/notifications?cursor=&limit=` | Lista las notificaciones del viewer (paginado keyset) | Sí   |
| `GET`  | `/notifications/unread-count`   | Devuelve el conteo de notificaciones no leídas        | Sí   |
| `POST` | `/notifications/read`           | Marca todas las notificaciones del viewer como leídas | Sí   |

### Chat (Pulse AI)

| Método | Ruta    | Descripción                                                                                                                                                                                                                        | Auth |
| ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `POST` | `/chat` | Envía un historial de mensajes al chatbot; devuelve la respuesta del modelo Groq. Sin `GROQ_API_KEY` configurada responde con un aviso en lugar de llamar a la IA. Body: `{ messages: [{ role, content }][] }` (máx. 20 mensajes). | Sí   |

### Tiempo real

| Método | Ruta               | Descripción                                                                  | Auth |
| ------ | ------------------ | ---------------------------------------------------------------------------- | ---- |
| `GET`  | `/realtime/stream` | Stream SSE; emite `event: tweet` por cada tweet nuevo visible para el viewer | Sí   |

El stream envía un heartbeat (`: ping`) cada 15 segundos para mantener la conexión
abierta a través de proxies y load-balancers que cierran conexiones idle.

---

## Tests

### Backend (Vitest + PGlite)

```bash
# Ejecutar todos los tests del backend
pnpm --filter @pulse/api test

# Con informe de cobertura
pnpm --filter @pulse/api test:coverage
```

Los tests no necesitan PostgreSQL externo: usan **PGlite** (Postgres compilado a
WebAssembly) en memoria. Cada suite crea su propia instancia aislada, lo que los
hace deterministas e instantáneos. Son **220 casos** con cobertura por encima del
**85 % en todas las métricas** (statements/lines ~94 %, functions ~98 %, branches
~86 %), que cubren auth, tweets, social, timeline, usuarios, explore, replies,
bookmarks, notificaciones, chat, realtime, seed, config y el event-bus.

### Frontend — integración (Vitest + Testing Library)

Tests de integración de los flujos principales (login, crear tweet, follow,
notificaciones, bookmarks, búsqueda y el modal de composición), que ejercitan el
stack del cliente (contexto de sesión + TanStack Query + routing) interceptando
`fetch` en vez de mockear módulos:

```bash
pnpm --filter @pulse/web test
```

Son **58 casos** de integración.

### Frontend — E2E con Playwright

Los tests E2E requieren que el stack completo esté corriendo:

```bash
# Opción rápida: todo en un comando
docker compose up

# Luego, en otra terminal:
pnpm --filter @pulse/web test:e2e
```

Los casos E2E cubren: registro de usuario nuevo → home autenticada → logout →
redirección a login, y login con usuario del seed (`luna_garcia / password123`).

### Todos los workspaces

```bash
pnpm test            # corre los tests de todos los paquetes
pnpm test:coverage   # con cobertura en todos
```

---

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar según el entorno.

| Variable              | Valor por defecto                               | Descripción                                                                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | `postgresql://pulse:pulse@localhost:5432/pulse` | Connection string de PostgreSQL                                                                                                                                                                                                                 |
| `API_PORT`            | `3001`                                          | Puerto en que escucha la API                                                                                                                                                                                                                    |
| `NODE_ENV`            | `development`                                   | Modo de ejecución (`development` / `production` / `test`)                                                                                                                                                                                       |
| `WEB_ORIGIN`          | `http://localhost:5173`                         | Origen permitido para CORS y cookies                                                                                                                                                                                                            |
| `SESSION_TTL_DAYS`    | `30`                                            | Días de validez de la sesión                                                                                                                                                                                                                    |
| `SESSION_COOKIE_NAME` | `pulse_session`                                 | Nombre de la cookie httpOnly                                                                                                                                                                                                                    |
| `SECURE_COOKIE`       | _(derivado de NODE_ENV)_                        | `true` fuerza el flag Secure; `false` lo desactiva (necesario para HTTP plano en localhost)                                                                                                                                                     |
| `VITE_API_BASE`       | `/api`                                          | Prefijo de ruta que usa el cliente web para llamar a la API                                                                                                                                                                                     |
| `POSTGRES_USER`       | `pulse`                                         | Usuario de PostgreSQL (usado por Docker Compose)                                                                                                                                                                                                |
| `POSTGRES_PASSWORD`   | `pulse`                                         | Contraseña de PostgreSQL (usado por Docker Compose)                                                                                                                                                                                             |
| `POSTGRES_DB`         | `pulse`                                         | Nombre de la base de datos (usado por Docker Compose)                                                                                                                                                                                           |
| `SEED_ON_START`       | `true`                                          | Si es `true`, el contenedor de la API ejecuta `db:seed` al arrancar                                                                                                                                                                             |
| `GROQ_API_KEY`        | _(opcional, sin valor por defecto)_             | Clave de API de Groq para el chatbot Pulse AI. Obtené una **gratis** en [console.groq.com](https://console.groq.com). Sin esta variable el endpoint `/chat` devuelve un aviso en lugar de llamar a la IA; el resto de la app no se ve afectado. |
| `GROQ_MODEL`          | `llama-3.3-70b-versatile`                       | Modelo Groq a usar para Pulse AI. Se puede cambiar por cualquier modelo disponible en la plataforma.                                                                                                                                            |

En producción detrás de HTTPS, omitir `SECURE_COOKIE` para que el flag se active
automáticamente desde `NODE_ENV=production`.

La clave `GROQ_API_KEY` nunca llega al navegador: la API la consume server-side y
retorna solo el texto de respuesta. Esto evita exponer credenciales en el cliente.

---

## Decisiones técnicas y trade-offs

### Hono + Drizzle + PostgreSQL

**Hono** es un framework web ultra-liviano con tipado de primera clase; su middleware
de streaming SSE está integrado sin dependencias adicionales. **Drizzle ORM** genera
queries completamente tipadas sin ocultar el SQL, lo que facilita optimizar índices
y subconsultas. El schema en TypeScript es la única fuente de verdad tanto para las
migraciones como para los tipos de la capa de servicio. PostgreSQL fue la elección
natural para un grafo relacional con constraints y subconsultas correlacionadas.

### PGlite en tests — sin Docker para el backend

Los tests del backend usan **PGlite** (`@electric-sql/pglite`), PostgreSQL compilado
a WebAssembly que corre en proceso. Cada suite crea su propia instancia en memoria:
aislamiento total, velocidad (milisegundos) y reproducibilidad en CI sin
infraestructura externa. El schema de Pulse (uuid, timestamps, check constraints,
índices compuestos) es 100 % compatible con PGlite.

### Autenticación propia: token opaco + SHA-256 + Argon2id

Se descartó JWT deliberadamente:

- JWT sin lista de revocación hace imposible el logout real.
- La rotación de secretos invalida todas las sesiones activas.
- El tamaño del token crece con los claims.

En cambio, el backend genera un **token aleatorio de 256 bits** (`randomBytes(32)`)
que viaja en la cookie del cliente. La base de datos almacena solo su **SHA-256**:
si la DB se filtra, los hashes no son reutilizables sin el token en claro. El logout
es un simple `DELETE` de la fila de sesión. Las contraseñas se hashean con
**Argon2id** (ganador de la Password Hashing Competition), resistente a ataques GPU
y side-channel.

La cookie es `httpOnly` (inaccesible desde JavaScript), `SameSite: Lax` (protección
CSRF estándar) y el flag `Secure` se activa automáticamente en producción o mediante
`SECURE_COOKIE=true`.

### Paginación keyset vs offset

El timeline y los listados de tweets usan **cursor keyset** en lugar de
`LIMIT / OFFSET`. Con offset, cada página N requiere saltar N × tamaño filas en el
índice, lo que degrada linealmente con el volumen. El cursor codifica `(createdAt, id)`
en base64url; la query filtra con:

```sql
WHERE (created_at, id) < (cursor_t, cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT n
```

Esto es O(log n) usando el índice compuesto `tweets_created_id_idx` y no produce
resultados duplicados si se insertan tweets entre páginas. Un cursor inválido se
trata silenciosamente como "sin cursor" para no romper la paginación.

### Modelo del grafo de follows

La tabla `follows` usa **clave primaria compuesta** `(follower_id, following_id)`,
que impide a nivel de base de datos crear el mismo follow dos veces (sin necesidad
de lógica de aplicación adicional). Un `CHECK` evita que un usuario se siga a sí
mismo. El índice `follows_following_idx` sobre `following_id` acelera la consulta
inversa ("¿quién sigue a este usuario?").

### Likes idempotentes

La tabla `likes` tiene la misma estructura: PK compuesta `(user_id, tweet_id)`.
Un segundo like al mismo tweet falla en la DB con violación de clave primaria, que
el servicio convierte en una respuesta limpia. Quitar un like que no existe devuelve
el estado actual sin error.

### Timeline en tiempo real — event-bus en proceso

Al publicar un tweet, `createTweet` emite un evento al **`TweetBus`**, un singleton
basado en el `EventEmitter` de Node.js. El endpoint SSE suscribe un listener que
evalúa si el tweet es visible para el viewer (es el autor, o el viewer sigue al
autor) y lo envía por el stream. La limpieza ocurre en `stream.onAbort()` al
desconectarse el cliente. `setMaxListeners(0)` evita los warnings de Node cuando
hay muchos viewers conectados.

**Trade-off:** Esta arquitectura funciona perfectamente con una sola instancia de
la API. Con escalado horizontal, los eventos no cruzan entre procesos. La solución
estándar es reemplazar el EventEmitter por **Redis Pub/Sub**: cada instancia
suscribe al canal y retransmite los eventos a sus clientes SSE conectados.

### `tweetViewSelect` / `rowToTweetView` — proyección reutilizable

En lugar de denormalizar contadores (guardar `likes_count` en la tabla `tweets`), se
usan **subconsultas correlacionadas** en el `SELECT`:

```sql
(SELECT count(*)::int FROM likes WHERE tweet_id = tweets.id)      AS likes_count,
EXISTS (SELECT 1 FROM likes WHERE tweet_id = tweets.id AND user_id = ?) AS liked_by_me
```

Esto garantiza consistencia sin mantener un campo extra en cada like/unlike.
`tweetViewSelect(db, viewerId)` devuelve un query builder `.$dynamic()` que el
módulo de timeline, el de tweets y el de usuarios encadenan con sus propios filtros,
reutilizando exactamente la misma proyección y el mismo mapper `rowToTweetView`.

### Tailwind CSS v4 — sin archivo de configuración

Tailwind v4 elimina `tailwind.config.js`; el tema se declara en CSS con variables
custom (`--color-brand`, etc.). El plugin `@tailwindcss/vite` integra el
procesamiento directamente en el pipeline de Vite sin PostCSS adicional.

---

## Herramientas de IA usadas

### Claude Code — orquestador de subagentes

El desarrollo se realizó con **Claude Code** (CLI de Anthropic) usando un modelo
orquestador que coordinó subagentes **Claude Sonnet** para la implementación de
cada módulo. El flujo fue:

1. El orquestador planificó los módulos y los asignó a subagentes en paralelo cuando
   no compartían archivos (frontend e infraestructura Docker, por ejemplo).
2. Cada subagente implementó la feature completa con su test (`service.ts`,
   `routes.ts`, `<modulo>.test.ts`) y typecheck en verde antes de terminar.
3. El orquestador verificó `typecheck + vitest run` y realizó los commits granulares
   en español con conventional commits.

Los commits del repositorio reflejan este proceso: cada feature tiene su commit
atómico con el trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
Los mensajes en español y la granularidad de los commits son parte deliberada del
challenge para evidenciar el proceso de desarrollo.

### Pulse AI — chatbot en producción (Groq)

La feature **Pulse AI** integra un LLM directamente en la app usando la API de
**Groq** (inferencia ultrarrápida sobre modelos open-source como LLaMA 3.3 70B).
Decisiones de diseño:

- **Proxy server-side:** el frontend envía el historial al endpoint `POST /chat`; la
  API llama a Groq con la key y retorna solo la respuesta. La clave nunca viaja al
  navegador.
- **Fallback sin key:** si `GROQ_API_KEY` no está configurada, el endpoint responde
  con un aviso descriptivo. Ningún otro módulo del sistema se ve afectado.
- **Modelo configurable:** `GROQ_MODEL` permite cambiar el modelo sin recompilar
  (por defecto `llama-3.3-70b-versatile`).

---

## Estructura de carpetas

```
pulse/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/          # registro, login, sesiones, cookies, middleware
│   │   │   ├── bookmarks/     # guardar/eliminar tweets; lista paginada
│   │   │   ├── chat/          # Pulse AI — proxy Groq server-side
│   │   │   ├── db/            # schema Drizzle, migraciones, seed
│   │   │   ├── events/        # TweetBus (event-bus en proceso para SSE)
│   │   │   ├── explore/       # feed global (Para ti / Explorar)
│   │   │   ├── http/          # errores, validación, tipos de Hono env
│   │   │   ├── notifications/ # follows, likes y replies; unread-count; mark-read
│   │   │   ├── realtime/      # rutas SSE y lógica de visibilidad
│   │   │   ├── replies/       # reply threads; vista de hilo
│   │   │   ├── routes/        # health
│   │   │   ├── social/        # follows y likes
│   │   │   ├── timeline/      # timeline keyset (Siguiendo)
│   │   │   ├── tweets/        # CRUD de tweets
│   │   │   ├── users/         # búsqueda, sugeridos, perfil, tweets de usuario
│   │   │   ├── app.ts         # factory de la app Hono (inyección de deps)
│   │   │   ├── config.ts      # configuración desde variables de entorno
│   │   │   └── index.ts       # entrypoint del servidor HTTP
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── api/           # cliente HTTP tipado (fetch wrapper)
│       │   ├── auth/          # AuthContext, ProtectedRoute, hook useAuth
│       │   ├── components/    # UI: layout, tweet cards, formularios, usuarios
│       │   ├── hooks/         # TanStack Query (timeline, tweets, social, users)
│       │   └── pages/         # HomePage, ProfilePage, SearchPage, TweetDetailPage,
│       │                      #   BookmarksPage, NotificationsPage, ChatPage,
│       │                      #   LoginPage, RegisterPage
│       ├── tests/e2e/         # tests Playwright
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared/
│       └── src/
│           ├── schemas/       # schemas Zod (auth, tweet)
│           └── types/         # tipos TypeScript (user, tweet)
├── docker-compose.yml
├── .env.example
└── package.json
```
