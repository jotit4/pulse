import type { Env } from "./env";
import type { Database } from "./db";

export interface AuthConfig {
  cookieName: string;
  sessionTtlDays: number;
  /** En producción la cookie viaja sólo por HTTPS. */
  secureCookie: boolean;
  sameSite: "Lax" | "Strict" | "None";
}

export interface AppConfig {
  webOrigin: string;
  auth: AuthConfig;
}

/** Dependencias que se inyectan a la app (db + config) — facilita testear. */
export interface AppDeps {
  db: Database;
  config: AppConfig;
}

export function configFromEnv(env: Env): AppConfig {
  return {
    webOrigin: env.WEB_ORIGIN,
    auth: {
      cookieName: env.SESSION_COOKIE_NAME,
      sessionTtlDays: env.SESSION_TTL_DAYS,
      secureCookie: env.NODE_ENV === "production",
      sameSite: "Lax",
    },
  };
}
