# Pulse

Un clon funcional de **Twitter/X**, construido como challenge full-stack.

> 🚧 **En construcción.** El **Runbook** operativo completo (prerrequisitos, instalación,
> seed, ejecución en dev, suite de tests y variables de entorno) vivirá en este README
> a medida que el proyecto avanza.

## Stack (resumen)

| Capa     | Tecnología                                              |
| -------- | ------------------------------------------------------- |
| Monorepo | pnpm workspaces · TypeScript estricto                   |
| Backend  | Hono · Drizzle ORM · PostgreSQL                         |
| Frontend | React · Vite · TanStack Query · Tailwind CSS            |
| Auth     | Propia, por sesión (cookie httpOnly + tabla `sessions`) |
| Tests    | Vitest · Playwright · PGlite (Postgres en proceso)      |
| Infra    | Docker Compose                                          |

La **justificación del stack** y las **decisiones de arquitectura** (modelo del timeline,
grafo de follows, manejo de auth, trade-offs) se documentan al final de este README.

## Estructura

```
pulse/
├─ apps/
│  ├─ api/        # Backend Hono + Drizzle
│  └─ web/        # Frontend React + Vite
├─ packages/
│  └─ shared/     # Tipos y schemas de validación compartidos (API ↔ web)
└─ docker-compose.yml
```
