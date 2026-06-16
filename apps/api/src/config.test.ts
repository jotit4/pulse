import { describe, expect, it } from "vitest";
import { configFromEnv } from "./config";
import type { Env } from "./env";

describe("configFromEnv", () => {
  const baseEnv: Env = {
    NODE_ENV: "development",
    API_PORT: 3001,
    DATABASE_URL: "postgresql://localhost/pulse",
    WEB_ORIGIN: "http://localhost:5173",
    SESSION_TTL_DAYS: 30,
    SESSION_COOKIE_NAME: "pulse_session",
  };

  it("mapea WEB_ORIGIN correctamente", () => {
    const config = configFromEnv(baseEnv);
    expect(config.webOrigin).toBe("http://localhost:5173");
  });

  it("asigna el nombre de cookie desde SESSION_COOKIE_NAME", () => {
    const config = configFromEnv({ ...baseEnv, SESSION_COOKIE_NAME: "mi_sesion" });
    expect(config.auth.cookieName).toBe("mi_sesion");
  });

  it("asigna el TTL de la sesión desde SESSION_TTL_DAYS", () => {
    const config = configFromEnv({ ...baseEnv, SESSION_TTL_DAYS: 7 });
    expect(config.auth.sessionTtlDays).toBe(7);
  });

  it("secureCookie es false cuando NODE_ENV es development", () => {
    const config = configFromEnv({ ...baseEnv, NODE_ENV: "development" });
    expect(config.auth.secureCookie).toBe(false);
  });

  it("secureCookie es true cuando NODE_ENV es production", () => {
    const config = configFromEnv({ ...baseEnv, NODE_ENV: "production" });
    expect(config.auth.secureCookie).toBe(true);
  });

  it("secureCookie es false cuando NODE_ENV es test", () => {
    const config = configFromEnv({ ...baseEnv, NODE_ENV: "test" });
    expect(config.auth.secureCookie).toBe(false);
  });

  it("sameSite siempre es Lax", () => {
    const config = configFromEnv(baseEnv);
    expect(config.auth.sameSite).toBe("Lax");
  });
});
