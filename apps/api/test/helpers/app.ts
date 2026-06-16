import { createApp } from "../../src/app";
import type { AppConfig } from "../../src/config";
import type { Database } from "../../src/db";
import { createTestDb } from "./db";

export const TEST_CONFIG: AppConfig = {
  webOrigin: "http://localhost:5173",
  auth: {
    cookieName: "pulse_session",
    sessionTtlDays: 30,
    secureCookie: false,
    sameSite: "Lax",
  },
};

export interface TestApp {
  app: ReturnType<typeof createApp>;
  db: Database;
  close: () => Promise<void>;
}

/** App Hono lista para `app.request(...)`, respaldada por una DB PGlite aislada. */
export async function createTestApp(): Promise<TestApp> {
  const { db, close } = await createTestDb();
  const app = createApp({ db, config: TEST_CONFIG });
  return { app, db, close };
}

/** Extrae el valor de una cookie de la respuesta (header Set-Cookie). */
export function extractCookie(res: Response, name = TEST_CONFIG.auth.cookieName): string | null {
  const header = res.headers.get("set-cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? null;
}

/** Helper para registrar un usuario y devolver su cookie de sesión ya lista. */
export async function registerAndAuth(
  app: TestApp["app"],
  overrides: Partial<{ username: string; name: string; email: string; password: string }> = {},
): Promise<{ cookieHeader: string; body: { user: { id: string; username: string } } }> {
  const payload = {
    username: "alice",
    name: "Alice",
    email: "alice@example.com",
    password: "password123",
    ...overrides,
  };
  const res = await app.request("/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const token = extractCookie(res);
  return {
    cookieHeader: `${TEST_CONFIG.auth.cookieName}=${token}`,
    body: (await res.json()) as { user: { id: string; username: string } },
  };
}
