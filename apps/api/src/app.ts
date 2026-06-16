import { Hono } from "hono";
import { logger } from "hono/logger";
import { health } from "./routes/health";

/**
 * Factory de la app Hono. Se exporta como función (no como singleton) para que
 * los tests puedan instanciar una app limpia y ejercitarla con `app.request(...)`
 * sin levantar un servidor HTTP real.
 */
export function createApp() {
  const app = new Hono();

  // Logger ruidoso en consola: lo omitimos durante los tests.
  if (process.env.NODE_ENV !== "test") {
    app.use("*", logger());
  }

  app.route("/health", health);

  return app;
}

export type App = ReturnType<typeof createApp>;
