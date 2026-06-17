import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";
import { createApp } from "../app";
import { createTestDb } from "../../test/helpers/db";
import type { AppConfig } from "../config";

const jsonHeaders = { "content-type": "application/json" };

/** Config de test con key de Groq activa (valor ficticio) */
const TEST_CONFIG_WITH_KEY: AppConfig = {
  webOrigin: "http://localhost:5173",
  auth: {
    cookieName: "pulse_session",
    sessionTtlDays: 30,
    secureCookie: false,
    sameSite: "Lax",
  },
  groq: {
    apiKey: "gsk_test_fake_key_for_tests",
    model: "llama-3.3-70b-versatile",
  },
};

describe("chat — POST /chat", () => {
  let ctx: TestApp;
  let cookie: string;

  beforeEach(async () => {
    ctx = await createTestApp(); // sin key de Groq
    const { cookieHeader } = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });
    cookie = cookieHeader;
  });

  afterEach(async () => {
    await ctx.close();
    vi.restoreAllMocks();
  });

  it("sin key → 200 con configured:false y aviso, sin llamar a Groq", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await ctx.app.request("/chat", {
      method: "POST",
      headers: { ...jsonHeaders, cookie },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hola" }] }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { reply: string; configured: boolean };
    expect(body.configured).toBe(false);
    expect(body.reply).toContain("GROQ_API_KEY");
    // No debe haber hecho ninguna llamada fetch externa
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requiere autenticación (401 sin sesión)", async () => {
    const res = await ctx.app.request("/chat", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ messages: [{ role: "user", content: "Hola" }] }),
    });

    expect(res.status).toBe(401);
  });

  it("rechaza body sin messages (400)", async () => {
    const res = await ctx.app.request("/chat", {
      method: "POST",
      headers: { ...jsonHeaders, cookie },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it("rechaza messages vacío (400)", async () => {
    const res = await ctx.app.request("/chat", {
      method: "POST",
      headers: { ...jsonHeaders, cookie },
      body: JSON.stringify({ messages: [] }),
    });

    expect(res.status).toBe(400);
  });

  it("rechaza message con content vacío (400)", async () => {
    const res = await ctx.app.request("/chat", {
      method: "POST",
      headers: { ...jsonHeaders, cookie },
      body: JSON.stringify({ messages: [{ role: "user", content: "" }] }),
    });

    expect(res.status).toBe(400);
  });

  it("rechaza más de 20 mensajes (400)", async () => {
    const messages = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `mensaje ${i}`,
    }));
    const res = await ctx.app.request("/chat", {
      method: "POST",
      headers: { ...jsonHeaders, cookie },
      body: JSON.stringify({ messages }),
    });

    expect(res.status).toBe(400);
  });

  it("con key → llama a Groq con el formato correcto y devuelve el reply (configured:true)", async () => {
    const { db, close } = await createTestDb();
    const appWithKey = createApp({ db, config: TEST_CONFIG_WITH_KEY });
    const { cookieHeader: cookieWithKey } = await registerAndAuth(appWithKey, {
      username: "bob",
      email: "bob@example.com",
    });

    const groqResponse = {
      choices: [{ message: { content: "¡Hola! Soy Pulse AI, ¿en qué te ayudo?" } }],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(groqResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const res = await appWithKey.request("/chat", {
      method: "POST",
      headers: { ...jsonHeaders, cookie: cookieWithKey },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hola" }] }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { reply: string; configured: boolean };
    expect(body.configured).toBe(true);
    expect(body.reply).toBe("¡Hola! Soy Pulse AI, ¿en qué te ayudo?");

    // Verificar que la llamada a Groq fue correcta
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer gsk_test_fake_key_for_tests",
    );
    const sentBody = JSON.parse(init.body as string) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(sentBody.model).toBe("llama-3.3-70b-versatile");
    // El primer mensaje debe ser el system prompt
    expect(sentBody.messages[0]?.role).toBe("system");
    // El segundo mensaje debe ser el del usuario
    expect(sentBody.messages[1]).toMatchObject({ role: "user", content: "Hola" });

    await close();
  });

  it("con key → Groq responde 429 → devuelve 429 al cliente", async () => {
    const { db, close } = await createTestDb();
    const appWithKey = createApp({ db, config: TEST_CONFIG_WITH_KEY });
    const { cookieHeader: cookieWithKey } = await registerAndAuth(appWithKey, {
      username: "carlos",
      email: "carlos@example.com",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 })),
    );

    const res = await appWithKey.request("/chat", {
      method: "POST",
      headers: { ...jsonHeaders, cookie: cookieWithKey },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hola" }] }),
    });

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();

    await close();
  });
});
