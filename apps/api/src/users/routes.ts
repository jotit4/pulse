import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { getUserProfile, getUserSuggestions, getUserTweets, searchUsers } from "./service";

/**
 * Rutas de usuarios: búsqueda, perfil y tweets de un usuario.
 * Se monta en `/users` desde app.ts. IMPORTANTE: `/search` se registra ANTES
 * que `/:username` para que el comodín no capture la palabra "search".
 * Convive con las rutas sociales (`/users/:username/follow`, etc.) montadas
 * aparte: sus sub-paths no se solapan con los de este módulo.
 */
export function createUserRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  /**
   * GET /users/search?q=&limit=
   * Busca por coincidencia parcial en username o name (case-insensitive).
   */
  r.get("/search", auth, async (c) => {
    const q = c.req.query("q") ?? "";
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    const result = await searchUsers(db, q, c.get("user").id, limit);
    return c.json({ users: result });
  });

  /**
   * GET /users/suggestions?limit=
   * "A quién seguir": usuarios que el viewer no sigue, ordenados por followers DESC.
   * DEBE registrarse ANTES que /:username para que Hono no lo capture como parámetro.
   */
  r.get("/suggestions", auth, async (c) => {
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    const suggestions = await getUserSuggestions(db, c.get("user").id, limit);
    return c.json({ users: suggestions });
  });

  /** GET /users/:username → perfil con contadores + isFollowing */
  r.get("/:username", auth, async (c) => {
    const profile = await getUserProfile(db, c.req.param("username"), c.get("user").id);
    return c.json({ user: profile });
  });

  /**
   * GET /users/:username/tweets?cursor=&limit=
   * Tweets del usuario, paginados por cursor keyset (más nuevo primero).
   */
  r.get("/:username/tweets", auth, async (c) => {
    const cursor = c.req.query("cursor") ?? undefined;
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    const page = await getUserTweets(db, c.req.param("username"), c.get("user").id, {
      cursor,
      limit,
    });
    return c.json(page);
  });

  return r;
}
