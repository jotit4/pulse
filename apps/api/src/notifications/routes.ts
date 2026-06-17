import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { getNotifications, getUnreadCount, markAllRead } from "./service";

/**
 * Rutas de notificaciones. Todas requieren autenticación.
 */
export function createNotificationRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  /** Lista las notificaciones del viewer con paginación keyset */
  r.get("/", auth, async (c) => {
    const cursor = c.req.query("cursor") ?? undefined;
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const page = await getNotifications(db, c.get("user").id, { cursor, limit });
    return c.json(page);
  });

  /** Devuelve el conteo de notificaciones no leídas */
  r.get("/unread-count", auth, async (c) => {
    const count = await getUnreadCount(db, c.get("user").id);
    return c.json({ count });
  });

  /** Marca todas las notificaciones del viewer como leídas */
  r.post("/read", auth, async (c) => {
    await markAllRead(db, c.get("user").id);
    return c.json({ ok: true });
  });

  return r;
}
