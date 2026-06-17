import { z } from "zod";
import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { AppEnv } from "../http/types";
import { validateJson } from "../http/validation";
import { getChatReply } from "./service";

/** Schema de validación del body de /chat */
const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1, "El contenido del mensaje no puede estar vacío"),
      }),
    )
    .min(1, "Se requiere al menos un mensaje")
    .max(20, "El historial no puede superar los 20 mensajes"),
});

export function createChatRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  r.post("/", auth, validateJson(chatSchema), async (c) => {
    const { messages } = c.req.valid("json");
    const result = await getChatReply(messages, config.groq.apiKey, config.groq.model);
    return c.json(result);
  });

  return r;
}
