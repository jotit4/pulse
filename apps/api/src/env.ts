import { z } from "zod";

/**
 * Esquema de variables de entorno de la API.
 * Se valida al arrancar el server (fail-fast): si falta algo o tiene un valor
 * inválido, el proceso no levanta y el error es explícito.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  // Requerida en runtime real; en tests usamos PGlite en memoria, por eso es opcional aquí.
  DATABASE_URL: z.string().min(1).optional(),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_COOKIE_NAME: z.string().min(1).default("pulse_session"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors;
    console.error("❌ Variables de entorno inválidas:", issues);
    throw new Error("Configuración de entorno inválida");
  }
  return parsed.data;
}
