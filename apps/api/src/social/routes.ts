import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import {
  followUser,
  likeTweet,
  listFollowers,
  listFollowing,
  unfollowUser,
  unlikeTweet,
} from "./service";

/**
 * Rutas sociales: likes sobre tweets y follows entre usuarios.
 * Todas requieren autenticación.
 */
export function createSocialRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  // -------------------------------------------------------------------------
  // Likes
  // -------------------------------------------------------------------------

  /** Da like al tweet :id */
  r.post("/tweets/:id/like", auth, async (c) => {
    const result = await likeTweet(db, c.get("user").id, c.req.param("id"));
    return c.json(result);
  });

  /** Quita el like al tweet :id */
  r.delete("/tweets/:id/like", auth, async (c) => {
    const result = await unlikeTweet(db, c.get("user").id, c.req.param("id"));
    return c.json(result);
  });

  // -------------------------------------------------------------------------
  // Follows
  // -------------------------------------------------------------------------

  /** Sigue al usuario :username */
  r.post("/users/:username/follow", auth, async (c) => {
    const result = await followUser(db, c.get("user").id, c.req.param("username"));
    return c.json(result);
  });

  /** Deja de seguir al usuario :username */
  r.delete("/users/:username/follow", auth, async (c) => {
    const result = await unfollowUser(db, c.get("user").id, c.req.param("username"));
    return c.json(result);
  });

  /** Devuelve los seguidores del usuario :username */
  r.get("/users/:username/followers", auth, async (c) => {
    const followers = await listFollowers(db, c.req.param("username"));
    return c.json({ users: followers });
  });

  /** Devuelve los usuarios que sigue :username */
  r.get("/users/:username/following", auth, async (c) => {
    const following = await listFollowing(db, c.req.param("username"));
    return c.json({ users: following });
  });

  return r;
}
