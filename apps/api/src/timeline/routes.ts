import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { getTimeline } from "./service";

/**
 * Rutas del timeline. Monta en `/timeline` desde app.ts.
 */
export function createTimelineRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  /**
   * GET /timeline
   * Query params:
   *   cursor  — cursor opaco devuelto por la respuesta anterior (opcional)
   *   limit   — número de tweets por página (1-50, por defecto 20)
   */
  r.get("/", auth, async (c) => {
    const viewerId = c.get("user").id;
    const cursor = c.req.query("cursor") ?? undefined;
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

    const page = await getTimeline(db, viewerId, { cursor, limit });
    return c.json(page);
  });

  return r;
}
