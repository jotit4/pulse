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
  // Override explícito del flag `Secure` de la cookie. Si no se define, se deriva
  // de NODE_ENV. Permite correr en modo producción detrás de HTTP plano (p. ej.
  // el docker-compose de demo sirviendo por http://localhost) sin romper el login.
  SECURE_COOKIE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  // ── Groq AI (Pulse AI chatbot) ─────────────────────────────────────────────
  // Clave de API de Groq. Opcional: sin ella el chatbot responde con un aviso.
  // Obtené una gratis en https://console.groq.com
  GROQ_API_KEY: z.string().min(1).optional(),
  // Modelo a usar. Por defecto usa el modelo LLaMA 3.3 70B versátil de Groq.
  GROQ_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
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
