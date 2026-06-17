import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { getExploreFeed } from "./service";

/**
 * Rutas de descubrimiento. Se monta en `/explore` desde app.ts.
 */
export function createExploreRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  /**
   * GET /explore?cursor=&limit=
   * Feed global de tweets recientes (todos los usuarios, sin filtrar por follows).
   * Misma paginación keyset que /timeline.
   */
  r.get("/", auth, async (c) => {
    const viewerId = c.get("user").id;
    const cursor = c.req.query("cursor") ?? undefined;
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

    const page = await getExploreFeed(db, viewerId, { cursor, limit });
    return c.json(page);
  });

  return r;
}
