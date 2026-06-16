import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../../test/helpers/app";
import type { TestApp } from "../../test/helpers/app";
import { registerAndAuth } from "../../test/helpers/app";
import { follows } from "../db/schema";
import { esTweetVisiblePara } from "./routes";
import { and, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let ctx: TestApp;

beforeEach(async () => {
  ctx = await createTestApp();
});

afterEach(async () => {
  await ctx.close();
});

// ---------------------------------------------------------------------------
// Tests de visibilidad (lógica pura + DB)
// ---------------------------------------------------------------------------

describe("esTweetVisiblePara", () => {
  it("el autor ve su propio tweet (autor == viewer)", async () => {
    const { body } = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });
    const viewerId = body.user.id;

    const visible = await esTweetVisiblePara(ctx.db, viewerId, viewerId);
    expect(visible).toBe(true);
  });

  it("un viewer que sigue al autor ve el tweet", async () => {
    // Registramos dos usuarios.
    const { body: aliceBody } = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });
    const { body: bobBody } = await registerAndAuth(ctx.app, {
      username: "bob",
      email: "bob@example.com",
    });

    const viewerId = aliceBody.user.id;
    const authorId = bobBody.user.id;

    // Alice sigue a Bob directamente en la DB.
    await ctx.db.insert(follows).values({ followerId: viewerId, followingId: authorId });

    const visible = await esTweetVisiblePara(ctx.db, viewerId, authorId);
    expect(visible).toBe(true);
  });

  it("un viewer que NO sigue al autor no ve el tweet", async () => {
    const { body: aliceBody } = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });
    const { body: bobBody } = await registerAndAuth(ctx.app, {
      username: "bob",
      email: "bob@example.com",
    });

    const viewerId = aliceBody.user.id;
    const authorId = bobBody.user.id;

    // No insertamos ningún follow.
    const visible = await esTweetVisiblePara(ctx.db, viewerId, authorId);
    expect(visible).toBe(false);
  });

  it("el follow inverso (autor sigue al viewer) NO da visibilidad", async () => {
    const { body: aliceBody } = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });
    const { body: bobBody } = await registerAndAuth(ctx.app, {
      username: "bob",
      email: "bob@example.com",
    });

    const viewerId = aliceBody.user.id;
    const authorId = bobBody.user.id;

    // Bob sigue a Alice (inverso) — Alice NO debería ver tweets de Bob.
    await ctx.db.insert(follows).values({ followerId: authorId, followingId: viewerId });

    const visible = await esTweetVisiblePara(ctx.db, viewerId, authorId);
    expect(visible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests del endpoint /realtime/stream
// ---------------------------------------------------------------------------

describe("GET /realtime/stream", () => {
  it("requiere autenticación — devuelve 401 sin cookie", async () => {
    const res = await ctx.app.request("/realtime/stream");
    expect(res.status).toBe(401);
  });

  it("con autenticación válida responde 200 y Content-Type text/event-stream", async () => {
    const { cookieHeader } = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });

    // Abrimos el stream y abortamos inmediatamente para no bloquear el test.
    const controller = new AbortController();

    const resPromise = ctx.app.request("/realtime/stream", {
      headers: { cookie: cookieHeader },
      signal: controller.signal,
    });

    // Esperamos la respuesta inicial (headers) con un timeout corto.
    const res = await Promise.race([
      resPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout esperando headers SSE")), 2000),
      ),
    ]);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);

    // Cerramos el stream.
    controller.abort();
    // Consumimos el body para que no quede pendiente.
    res.body?.cancel();
  });
});
