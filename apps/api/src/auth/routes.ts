import { loginSchema, registerSchema } from "@pulse/shared";
import { Hono } from "hono";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { validateJson } from "../http/validation";
import { clearSessionCookie, setSessionCookie } from "./cookies";
import { requireAuth } from "./middleware";
import { createSession, destroySession, loginUser, registerUser, toPublicUser } from "./service";

export function createAuthRoutes({ db, config }: AppDeps) {
  const auth = new Hono<AppEnv>();

  auth.post("/register", validateJson(registerSchema), async (c) => {
    const input = c.req.valid("json");
    const user = await registerUser(db, input);
    const token = await createSession(db, user.id, config.auth.sessionTtlDays);
    setSessionCookie(c, config.auth, token);
    return c.json({ user: toPublicUser(user) }, 201);
  });

  auth.post("/login", validateJson(loginSchema), async (c) => {
    const { identifier, password } = c.req.valid("json");
    const user = await loginUser(db, identifier, password);
    const token = await createSession(db, user.id, config.auth.sessionTtlDays);
    setSessionCookie(c, config.auth, token);
    return c.json({ user: toPublicUser(user) });
  });

  auth.post("/logout", requireAuth(db, config.auth), async (c) => {
    await destroySession(db, c.get("sessionToken"));
    clearSessionCookie(c, config.auth);
    return c.json({ ok: true });
  });

  auth.get("/me", requireAuth(db, config.auth), (c) => {
    return c.json({ user: c.get("user") });
  });

  return auth;
}
