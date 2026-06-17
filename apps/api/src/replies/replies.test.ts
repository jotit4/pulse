import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

interface TweetBody {
  tweet: {
    id: string;
    content: string;
    parentId?: string | null;
    replyCount?: number;
    bookmarkedByMe?: boolean;
    likesCount: number;
    likedByMe: boolean;
    author: { username: string };
  };
}

interface TweetPageBody {
  tweets: Array<{
    id: string;
    content: string;
    parentId?: string | null;
    author: { username: string };
  }>;
  nextCursor: string | null;
}

interface ThreadBody {
  tweet: TweetBody["tweet"];
  parent: TweetBody["tweet"] | null;
}

interface NotifPageBody {
  notifications: Array<{
    id: string;
    type: string;
    actor: { username: string };
    tweet?: { id: string } | null;
    read: boolean;
  }>;
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function postTweet(app: TestApp["app"], cookie: string, content = "tweet raíz") {
  const res = await app.request("/tweets", {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({ content }),
  });
  return (await res.json()) as TweetBody;
}

// ---------------------------------------------------------------------------
// Suite de replies / hilos
// ---------------------------------------------------------------------------

describe("replies", () => {
  let ctx: TestApp;
  let aliceCookie: string;
  let bobCookie: string;
  let rootTweetId: string;

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

    const root = await postTweet(ctx.app, aliceCookie, "tweet raíz de alice");
    rootTweetId = root.tweet.id;
  });

  afterEach(async () => {
    await ctx.close();
  });

  // -------------------------------------------------------------------------
  // POST /tweets/:id/reply
  // -------------------------------------------------------------------------

  it("bob puede responder al tweet de alice (201, parentId correcto)", async () => {
    const res = await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "respuesta de bob" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as TweetBody;
    expect(body.tweet.content).toBe("respuesta de bob");
    expect(body.tweet.parentId).toBe(rootTweetId);
    expect(body.tweet.author.username).toBe("bob");
  });

  it("responder a un tweet inexistente devuelve 404", async () => {
    const res = await ctx.app.request(`/tweets/${crypto.randomUUID()}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "respuesta" }),
    });
    expect(res.status).toBe(404);
  });

  it("responder con id no-uuid devuelve 404", async () => {
    const res = await ctx.app.request("/tweets/no-es-uuid/reply", {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "respuesta" }),
    });
    expect(res.status).toBe(404);
  });

  it("responder sin sesión devuelve 401", async () => {
    const res = await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ content: "respuesta" }),
    });
    expect(res.status).toBe(401);
  });

  it("responder con contenido vacío devuelve 400", async () => {
    const res = await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "" }),
    });
    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // replyCount en el TweetView
  // -------------------------------------------------------------------------

  it("replyCount en el tweet raíz se incrementa tras una respuesta", async () => {
    // Antes de la respuesta
    const before = await ctx.app.request(`/tweets/${rootTweetId}`, {
      headers: { cookie: aliceCookie },
    });
    const beforeBody = (await before.json()) as TweetBody;
    expect(beforeBody.tweet.replyCount).toBe(0);

    // Responder
    await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "respuesta" }),
    });

    // Después
    const after = await ctx.app.request(`/tweets/${rootTweetId}`, {
      headers: { cookie: aliceCookie },
    });
    const afterBody = (await after.json()) as TweetBody;
    expect(afterBody.tweet.replyCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // GET /tweets/:id/replies
  // -------------------------------------------------------------------------

  it("GET replies devuelve lista vacía cuando no hay respuestas", async () => {
    const res = await ctx.app.request(`/tweets/${rootTweetId}/replies`, {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TweetPageBody;
    expect(body.tweets).toHaveLength(0);
    expect(body.nextCursor).toBeNull();
  });

  it("GET replies devuelve las respuestas en orden cronológico ascendente", async () => {
    await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: aliceCookie },
      body: JSON.stringify({ content: "respuesta 1" }),
    });
    await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "respuesta 2" }),
    });

    const res = await ctx.app.request(`/tweets/${rootTweetId}/replies`, {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TweetPageBody;
    expect(body.tweets).toHaveLength(2);
    // Orden ascendente: primera respuesta primero
    expect(body.tweets[0]?.content).toBe("respuesta 1");
    expect(body.tweets[1]?.content).toBe("respuesta 2");
  });

  it("GET replies de tweet inexistente devuelve 404", async () => {
    const res = await ctx.app.request(`/tweets/${crypto.randomUUID()}/replies`, {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(404);
  });

  it("GET replies sin sesión devuelve 401", async () => {
    const res = await ctx.app.request(`/tweets/${rootTweetId}/replies`);
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // GET /tweets/:id/thread
  // -------------------------------------------------------------------------

  it("GET thread de un tweet raíz devuelve parent null", async () => {
    const res = await ctx.app.request(`/tweets/${rootTweetId}/thread`, {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ThreadBody;
    expect(body.tweet.id).toBe(rootTweetId);
    expect(body.parent).toBeNull();
  });

  it("GET thread de una respuesta devuelve el tweet padre", async () => {
    const replyRes = await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "respuesta hilo" }),
    });
    const replyBody = (await replyRes.json()) as TweetBody;
    const replyId = replyBody.tweet.id;

    const res = await ctx.app.request(`/tweets/${replyId}/thread`, {
      headers: { cookie: bobCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ThreadBody;
    expect(body.tweet.id).toBe(replyId);
    expect(body.parent).not.toBeNull();
    expect(body.parent?.id).toBe(rootTweetId);
  });

  it("GET thread de tweet inexistente devuelve 404", async () => {
    const res = await ctx.app.request(`/tweets/${crypto.randomUUID()}/thread`, {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(404);
  });

  it("GET thread sin sesión devuelve 401", async () => {
    const res = await ctx.app.request(`/tweets/${rootTweetId}/thread`);
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Notificación de reply al autor del tweet padre
  // -------------------------------------------------------------------------

  it("crear reply genera notificación tipo 'reply' para el autor del padre", async () => {
    await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "notif reply test" }),
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as NotifPageBody;
    const replyNotif = body.notifications.find((n) => n.type === "reply");
    expect(replyNotif).toBeDefined();
    expect(replyNotif?.actor.username).toBe("bob");
  });

  it("reply propio NO genera notificación para uno mismo", async () => {
    // Alice responde su propio tweet
    await ctx.app.request(`/tweets/${rootTweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: aliceCookie },
      body: JSON.stringify({ content: "alice se responde a sí misma" }),
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as NotifPageBody;
    const replyNotif = body.notifications.find((n) => n.type === "reply");
    expect(replyNotif).toBeUndefined();
  });
});
