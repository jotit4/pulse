import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { bookmarkTweet, getBookmarks, unbookmarkTweet } from "./service";

/**
 * Rutas de bookmarks. Todas requieren autenticación.
 */
export function createBookmarkRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  /** Lista los tweets guardados del viewer */
  r.get("/", auth, async (c) => {
    const cursor = c.req.query("cursor") ?? undefined;
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const page = await getBookmarks(db, c.get("user").id, { cursor, limit });
    return c.json(page);
  });

  return r;
}

/**
 * Rutas de bookmark/unbookmark montadas bajo /tweets en createTweetRoutes.
 * Separadas para no circular — se re-exportan desde aquí para que app.ts las use.
 */
export function createTweetBookmarkRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  /** Guarda el tweet :id en los bookmarks del viewer */
  r.post("/:id/bookmark", auth, async (c) => {
    await bookmarkTweet(db, c.get("user").id, c.req.param("id"));
    return c.json({ ok: true });
  });

  /** Elimina el tweet :id de los bookmarks del viewer */
  r.delete("/:id/bookmark", auth, async (c) => {
    await unbookmarkTweet(db, c.get("user").id, c.req.param("id"));
    return c.json({ ok: true });
  });

  return r;
}
