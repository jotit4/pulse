import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { AuthConfig } from "../config";
import type { Database } from "../db";
import type { AppEnv } from "../http/types";
import { toPublicUser, validateSessionToken } from "./service";

/**
 * Middleware que exige una sesión válida. Si la hay, deja `user` y
 * `sessionToken` en el contexto; si no, corta con 401.
 */
export function requireAuth(db: Database, config: AuthConfig) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, config.cookieName);
    if (!token) {
      return c.json({ error: "No autenticado" }, 401);
    }

    const user = await validateSessionToken(db, token);
    if (!user) {
      return c.json({ error: "Sesión inválida o expirada" }, 401);
    }

    c.set("user", toPublicUser(user));
    c.set("sessionToken", token);
    await next();
  });
}
