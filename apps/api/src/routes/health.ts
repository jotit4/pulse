import { Hono } from "hono";

/** Healthcheck — usado por Docker/compose y como smoke test de arranque. */
export const health = new Hono();

health.get("/", (c) => c.json({ status: "ok", service: "pulse-api" }));
