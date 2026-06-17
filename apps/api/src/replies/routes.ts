import { createTweetSchema } from "@pulse/shared";
import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { validateJson } from "../http/validation";
import { createReply, getReplies, getThread } from "./service";

/**
 * Rutas de replies e hilos. Se montan bajo /tweets en app.ts.
 * Todas requieren autenticación.
 */
export function createReplyRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  /** Crear una respuesta a un tweet */
  r.post("/:id/reply", auth, validateJson(createTweetSchema), async (c) => {
    const { content } = c.req.valid("json");
    const reply = await createReply(db, c.get("user").id, c.req.param("id"), content);
    return c.json({ tweet: reply }, 201);
  });

  /** Listar respuestas de un tweet (orden cronológico ascendente) */
  r.get("/:id/replies", auth, async (c) => {
    const cursor = c.req.query("cursor") ?? undefined;
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const page = await getReplies(db, c.req.param("id"), c.get("user").id, { cursor, limit });
    return c.json(page);
  });

  /** Obtener el hilo de un tweet: el tweet y su padre directo */
  r.get("/:id/thread", auth, async (c) => {
    const result = await getThread(db, c.req.param("id"), c.get("user").id);
    return c.json(result);
  });

  return r;
}
