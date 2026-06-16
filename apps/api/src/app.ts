import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { createAuthRoutes } from "./auth/routes";
import { AuthError } from "./auth/service";
import type { AppDeps } from "./config";
import type { AppEnv } from "./http/types";
import { health } from "./routes/health";

/**
 * Factory de la app Hono. Recibe sus dependencias (db + config) por inyección
 * para que los tests instancien una app contra PGlite sin abrir un socket.
 */
export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  if (process.env.NODE_ENV !== "test") {
    app.use("*", logger());
  }

  app.use("*", cors({ origin: deps.config.webOrigin, credentials: true }));

  app.route("/health", health);
  app.route("/auth", createAuthRoutes(deps));

  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json({ error: err.message }, err.status);
    }
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    console.error("Error no controlado:", err);
    return c.json({ error: "Error interno del servidor" }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
