import { createTweetSchema } from "@pulse/shared";
import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { validateJson } from "../http/validation";
import { createTweet, deleteTweet, getTweetViewById } from "./service";

export function createTweetRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  r.post("/", auth, validateJson(createTweetSchema), async (c) => {
    const { content } = c.req.valid("json");
    const tweet = await createTweet(db, c.get("user").id, content);
    return c.json({ tweet }, 201);
  });

  r.get("/:id", auth, async (c) => {
    const tweet = await getTweetViewById(db, c.req.param("id"), c.get("user").id);
    if (!tweet) return c.json({ error: "Tweet no encontrado" }, 404);
    return c.json({ tweet });
  });

  r.delete("/:id", auth, async (c) => {
    await deleteTweet(db, c.req.param("id"), c.get("user").id);
    return c.json({ ok: true });
  });

  return r;
}
