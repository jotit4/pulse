import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadEnv } from "./env";

const env = loadEnv();
const app = createApp();

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`🚀 Pulse API escuchando en http://localhost:${info.port}`);
});
