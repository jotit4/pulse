import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { configFromEnv } from "./config";
import { createDb } from "./db";
import { loadEnv } from "./env";

const env = loadEnv();
if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL es requerida para arrancar la API");
}

const { db } = createDb(env.DATABASE_URL);
const app = createApp({ db, config: configFromEnv(env) });

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`🚀 Pulse API escuchando en http://localhost:${info.port}`);
});
