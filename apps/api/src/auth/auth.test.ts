import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestApp,
  extractCookie,
  registerAndAuth,
  type TestApp,
} from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

interface AuthBody {
  user: { id: string; username: string; name: string };
  issues?: Record<string, string[]>;
}

describe("auth", () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.close();
  });

  describe("POST /auth/register", () => {
    it("registra un usuario, devuelve 201 con su forma pública y setea la cookie", async () => {
      const res = await ctx.app.request("/auth/register", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          username: "alice",
          name: "Alice",
          email: "alice@example.com",
          password: "password123",
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as AuthBody;
      expect(body.user).toMatchObject({ username: "alice", name: "Alice" });
      expect(body.user).not.toHaveProperty("passwordHash");
      expect(body.user).not.toHaveProperty("email");
      expect(extractCookie(res)).toBeTruthy();
    });

    it("normaliza username y email a minúsculas", async () => {
      const { body } = await registerAndAuth(ctx.app, {
        username: "BoB",
        email: "BOB@Example.com",
      });

      expect(body.user.username).toBe("bob");
    });

    it("rechaza un username duplicado con 409", async () => {
      await registerAndAuth(ctx.app, { username: "carol", email: "carol@example.com" });

      const res = await ctx.app.request("/auth/register", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          username: "carol",
          name: "Otra",
          email: "otra@example.com",
          password: "password123",
        }),
      });

      expect(res.status).toBe(409);
    });

    it("rechaza un email duplicado con 409 aunque el username sea distinto", async () => {
      // Registramos a carol con su email.
      await registerAndAuth(ctx.app, { username: "carol", email: "carol@example.com" });

      // Intentamos registrar un usuario con distinto username pero el mismo email.
      const res = await ctx.app.request("/auth/register", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          username: "otracarol",
          name: "Otra Carol",
          email: "carol@example.com",
          password: "password123",
        }),
      });

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("email");
    });

    it("rechaza datos inválidos con 400", async () => {
      const res = await ctx.app.request("/auth/register", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ username: "x", name: "", email: "no-email", password: "123" }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as AuthBody;
      expect(body.issues).toBeDefined();
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await registerAndAuth(ctx.app, {
        username: "dave",
        email: "dave@example.com",
        password: "password123",
      });
    });

    it("inicia sesión con email correcto", async () => {
      const res = await ctx.app.request("/auth/login", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ identifier: "dave@example.com", password: "password123" }),
      });

      expect(res.status).toBe(200);
      expect(extractCookie(res)).toBeTruthy();
    });

    it("inicia sesión con username (case-insensitive)", async () => {
      const res = await ctx.app.request("/auth/login", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ identifier: "DAVE", password: "password123" }),
      });

      expect(res.status).toBe(200);
    });

    it("rechaza contraseña incorrecta con 401", async () => {
      const res = await ctx.app.request("/auth/login", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ identifier: "dave@example.com", password: "incorrecta" }),
      });

      expect(res.status).toBe(401);
    });

    it("rechaza usuario inexistente con 401", async () => {
      const res = await ctx.app.request("/auth/login", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ identifier: "fantasma@example.com", password: "password123" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("rutas protegidas y logout", () => {
    it("GET /auth/me sin cookie devuelve 401", async () => {
      const res = await ctx.app.request("/auth/me");
      expect(res.status).toBe(401);
    });

    it("GET /auth/me con sesión devuelve el usuario actual", async () => {
      const { cookieHeader } = await registerAndAuth(ctx.app, {
        username: "erin",
        email: "erin@example.com",
      });

      const res = await ctx.app.request("/auth/me", { headers: { cookie: cookieHeader } });

      expect(res.status).toBe(200);
      const body = (await res.json()) as AuthBody;
      expect(body.user.username).toBe("erin");
    });

    it("logout invalida la sesión: /auth/me deja de funcionar", async () => {
      const { cookieHeader } = await registerAndAuth(ctx.app, {
        username: "frank",
        email: "frank@example.com",
      });

      const logout = await ctx.app.request("/auth/logout", {
        method: "POST",
        headers: { cookie: cookieHeader },
      });
      expect(logout.status).toBe(200);

      const me = await ctx.app.request("/auth/me", { headers: { cookie: cookieHeader } });
      expect(me.status).toBe(401);
    });
  });
});
