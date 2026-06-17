import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

interface TweetBody {
  tweet: {
    id: string;
    content: string;
    bookmarkedByMe?: boolean;
  };
}

interface TweetPageBody {
  tweets: Array<{
    id: string;
    content: string;
    bookmarkedByMe?: boolean;
  }>;
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function postTweet(app: TestApp["app"], cookie: string, content = "tweet de prueba") {
  const res = await app.request("/tweets", {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({ content }),
  });
  return (await res.json()) as TweetBody;
}

// ---------------------------------------------------------------------------
// Suite de bookmarks
// ---------------------------------------------------------------------------

describe("bookmarks", () => {
  let ctx: TestApp;
  let aliceCookie: string;
  let bobCookie: string;
  let tweetId: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    const alice = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });
    aliceCookie = alice.cookieHeader;

    const bob = await registerAndAuth(ctx.app, {
      username: "bob",
      email: "bob@example.com",
    });
    bobCookie = bob.cookieHeader;

    // Alice crea un tweet que bob puede guardar
    const tw = await postTweet(ctx.app, aliceCookie, "tweet de alice para guardar");
    tweetId = tw.tweet.id;
  });

  afterEach(async () => {
    await ctx.close();
  });

  // -------------------------------------------------------------------------
  // POST /tweets/:id/bookmark
  // -------------------------------------------------------------------------

  it("guardar un tweet responde 200 { ok: true }", async () => {
    const res = await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("guardar dos veces es idempotente (sin error)", async () => {
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    const res = await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(200);
  });

  it("guardar un tweet inexistente devuelve 404", async () => {
    const res = await ctx.app.request(`/tweets/${crypto.randomUUID()}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(404);
  });

  it("guardar con id no-uuid devuelve 404", async () => {
    const res = await ctx.app.request("/tweets/no-es-uuid/bookmark", {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(404);
  });

  it("guardar sin sesión devuelve 401", async () => {
    const res = await ctx.app.request(`/tweets/${tweetId}/bookmark`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // DELETE /tweets/:id/bookmark
  // -------------------------------------------------------------------------

  it("eliminar bookmark responde 200 { ok: true }", async () => {
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    const res = await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "DELETE",
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("eliminar bookmark sin haberlo guardado es idempotente (sin error)", async () => {
    const res = await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "DELETE",
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(200);
  });

  it("eliminar bookmark de tweet inexistente devuelve 404", async () => {
    const res = await ctx.app.request(`/tweets/${crypto.randomUUID()}/bookmark`, {
      method: "DELETE",
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(404);
  });

  it("eliminar bookmark sin sesión devuelve 401", async () => {
    const res = await ctx.app.request(`/tweets/${tweetId}/bookmark`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // bookmarkedByMe en TweetView
  // -------------------------------------------------------------------------

  it("bookmarkedByMe es false antes de guardar y true después", async () => {
    // Antes
    const before = await ctx.app.request(`/tweets/${tweetId}`, {
      headers: { cookie: bobCookie },
    });
    const beforeBody = (await before.json()) as TweetBody;
    expect(beforeBody.tweet.bookmarkedByMe).toBe(false);

    // Guardar
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    // Después
    const after = await ctx.app.request(`/tweets/${tweetId}`, {
      headers: { cookie: bobCookie },
    });
    const afterBody = (await after.json()) as TweetBody;
    expect(afterBody.tweet.bookmarkedByMe).toBe(true);
  });

  it("bookmarkedByMe vuelve a false tras eliminar el bookmark", async () => {
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "DELETE",
      headers: { cookie: bobCookie },
    });

    const res = await ctx.app.request(`/tweets/${tweetId}`, {
      headers: { cookie: bobCookie },
    });
    const body = (await res.json()) as TweetBody;
    expect(body.tweet.bookmarkedByMe).toBe(false);
  });

  it("bookmarkedByMe de alice es false cuando bob guarda el tweet", async () => {
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    // Alice ve su propio tweet — NO está guardado por ella
    const res = await ctx.app.request(`/tweets/${tweetId}`, {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as TweetBody;
    expect(body.tweet.bookmarkedByMe).toBe(false);
  });

  // -------------------------------------------------------------------------
  // GET /bookmarks
  // -------------------------------------------------------------------------

  it("GET /bookmarks devuelve lista vacía cuando no hay bookmarks", async () => {
    const res = await ctx.app.request("/bookmarks", {
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TweetPageBody;
    expect(body.tweets).toHaveLength(0);
    expect(body.nextCursor).toBeNull();
  });

  it("GET /bookmarks devuelve el tweet guardado", async () => {
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    const res = await ctx.app.request("/bookmarks", {
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TweetPageBody;
    expect(body.tweets).toHaveLength(1);
    expect(body.tweets[0]?.id).toBe(tweetId);
  });

  it("GET /bookmarks: tweets guardados tienen bookmarkedByMe = true", async () => {
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    const res = await ctx.app.request("/bookmarks", {
      headers: { cookie: bobCookie },
    });
    const body = (await res.json()) as TweetPageBody;
    expect(body.tweets[0]?.bookmarkedByMe).toBe(true);
  });

  it("GET /bookmarks: tweets en orden descendente por fecha de guardado", async () => {
    // Alice crea dos tweets
    const tw2 = await postTweet(ctx.app, aliceCookie, "segundo tweet");
    const tw2Id = tw2.tweet.id;

    // Bob guarda ambos
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    await ctx.app.request(`/tweets/${tw2Id}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    const res = await ctx.app.request("/bookmarks", {
      headers: { cookie: bobCookie },
    });
    const body = (await res.json()) as TweetPageBody;
    expect(body.tweets).toHaveLength(2);
    // El más recientemente guardado primero
    expect(body.tweets[0]?.id).toBe(tw2Id);
    expect(body.tweets[1]?.id).toBe(tweetId);
  });

  it("GET /bookmarks sin sesión devuelve 401", async () => {
    const res = await ctx.app.request("/bookmarks");
    expect(res.status).toBe(401);
  });

  it("GET /bookmarks no devuelve tweets guardados por otro usuario", async () => {
    // Bob guarda el tweet
    await ctx.app.request(`/tweets/${tweetId}/bookmark`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    // Alice consulta sus propios bookmarks — no debe ver nada
    const res = await ctx.app.request("/bookmarks", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as TweetPageBody;
    expect(body.tweets).toHaveLength(0);
  });
});
