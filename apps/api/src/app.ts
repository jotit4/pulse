import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { createAuthRoutes } from "./auth/routes";
import { createBookmarkRoutes, createTweetBookmarkRoutes } from "./bookmarks/routes";
import type { AppDeps } from "./config";
import { createExploreRoutes } from "./explore/routes";
import { HttpError } from "./http/errors";
import type { AppEnv } from "./http/types";
import { createNotificationRoutes } from "./notifications/routes";
import { createRealtimeRoutes } from "./realtime/routes";
import { createReplyRoutes } from "./replies/routes";
import { health } from "./routes/health";
import { createSocialRoutes } from "./social/routes";
import { createTimelineRoutes } from "./timeline/routes";
import { createTweetRoutes } from "./tweets/routes";
import { createUserRoutes } from "./users/routes";

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
  app.route("/tweets", createTweetRoutes(deps));
  // Replies e hilos bajo /tweets
  app.route("/tweets", createReplyRoutes(deps));
  // Bookmark/unbookmark de tweets bajo /tweets
  app.route("/tweets", createTweetBookmarkRoutes(deps));
  app.route("/timeline", createTimelineRoutes(deps));
  app.route("/explore", createExploreRoutes(deps));
  app.route("/users", createUserRoutes(deps));
  app.route("/", createSocialRoutes(deps));
  app.route("/realtime", createRealtimeRoutes(deps));
  // Bookmarks del viewer
  app.route("/bookmarks", createBookmarkRoutes(deps));
  // Notificaciones
  app.route("/notifications", createNotificationRoutes(deps));

  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as 400);
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
