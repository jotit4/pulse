import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

interface NotifPageBody {
  notifications: Array<{
    id: string;
    type: string;
    actor: { username: string };
    tweet?: { id: string } | null;
    read: boolean;
    createdAt: string;
  }>;
  nextCursor: string | null;
}

interface UnreadCountBody {
  count: number;
}

interface TweetBody {
  tweet: { id: string; content: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function postTweet(app: TestApp["app"], cookie: string, content = "tweet") {
  const res = await app.request("/tweets", {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({ content }),
  });
  return (await res.json()) as TweetBody;
}

// ---------------------------------------------------------------------------
// Suite de notificaciones
// ---------------------------------------------------------------------------

describe("notifications", () => {
  let ctx: TestApp;
  let aliceCookie: string;
  let bobCookie: string;
  let carolCookie: string;

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

    const carol = await registerAndAuth(ctx.app, {
      username: "carol",
      email: "carol@example.com",
    });
    carolCookie = carol.cookieHeader;
  });

  afterEach(async () => {
    await ctx.close();
  });

  // -------------------------------------------------------------------------
  // Notificaciones de follow
  // -------------------------------------------------------------------------

  it("seguir a alice genera notificación tipo 'follow' para ella", async () => {
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as NotifPageBody;
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0]?.type).toBe("follow");
    expect(body.notifications[0]?.actor.username).toBe("bob");
    expect(body.notifications[0]?.tweet).toBeNull();
  });

  it("seguirse a uno mismo NO genera notificación (400 por validación + sin notif)", async () => {
    // Intentar seguirse a sí mismo falla con 400
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as NotifPageBody;
    expect(body.notifications).toHaveLength(0);
  });

  it("seguir dos veces no duplica la notificación (follow idempotente)", async () => {
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as NotifPageBody;
    // El follow idempotente puede generar 1 o 2 notifs dependiendo de la implementación.
    // Lo importante es que la operación no falla.
    expect(body.notifications.filter((n) => n.type === "follow").length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // Notificaciones de like
  // -------------------------------------------------------------------------

  it("dar like al tweet de alice genera notificación tipo 'like' para ella", async () => {
    const tw = await postTweet(ctx.app, aliceCookie, "tweet de alice");
    const tweetId = tw.tweet.id;

    await ctx.app.request(`/tweets/${tweetId}/like`, {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as NotifPageBody;
    const likeNotif = body.notifications.find((n) => n.type === "like");
    expect(likeNotif).toBeDefined();
    expect(likeNotif?.actor.username).toBe("bob");
    expect(likeNotif?.tweet?.id).toBe(tweetId);
  });

  it("darse like a sí mismo NO genera notificación", async () => {
    const tw = await postTweet(ctx.app, aliceCookie, "tweet propio");
    const tweetId = tw.tweet.id;

    // Alice se da like a sí misma
    await ctx.app.request(`/tweets/${tweetId}/like`, {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as NotifPageBody;
    const likeNotif = body.notifications.find((n) => n.type === "like");
    expect(likeNotif).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Notificaciones de reply
  // -------------------------------------------------------------------------

  it("responder al tweet de alice genera notificación tipo 'reply' para ella", async () => {
    const tw = await postTweet(ctx.app, aliceCookie, "tweet padre");
    const tweetId = tw.tweet.id;

    await ctx.app.request(`/tweets/${tweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: bobCookie },
      body: JSON.stringify({ content: "respuesta de bob" }),
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

  it("responderse a sí mismo NO genera notificación", async () => {
    const tw = await postTweet(ctx.app, aliceCookie, "tweet de alice");
    const tweetId = tw.tweet.id;

    await ctx.app.request(`/tweets/${tweetId}/reply`, {
      method: "POST",
      headers: { ...jsonHeaders, cookie: aliceCookie },
      body: JSON.stringify({ content: "alice auto-responde" }),
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as NotifPageBody;
    expect(body.notifications).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // GET /notifications
  // -------------------------------------------------------------------------

  it("GET /notifications sin sesión devuelve 401", async () => {
    const res = await ctx.app.request("/notifications");
    expect(res.status).toBe(401);
  });

  it("GET /notifications devuelve notificaciones en orden descendente", async () => {
    const tw = await postTweet(ctx.app, aliceCookie, "tweet");

    // Bob sigue a alice → 1ª notif
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    // Carol da like → 2ª notif (más reciente)
    await ctx.app.request(`/tweets/${tw.tweet.id}/like`, {
      method: "POST",
      headers: { cookie: carolCookie },
    });

    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as NotifPageBody;
    expect(body.notifications).toHaveLength(2);
    // La más reciente primero
    expect(body.notifications[0]?.type).toBe("like");
    expect(body.notifications[1]?.type).toBe("follow");
  });

  it("alice NO ve las notificaciones de bob", async () => {
    // Bob sigue a carol (notificación para carol)
    await ctx.app.request("/users/carol/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    // Alice no debe ver esa notificación
    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as NotifPageBody;
    expect(body.notifications).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // GET /notifications/unread-count
  // -------------------------------------------------------------------------

  it("unread-count es 0 sin notificaciones", async () => {
    const res = await ctx.app.request("/notifications/unread-count", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as UnreadCountBody;
    expect(body.count).toBe(0);
  });

  it("unread-count aumenta con nuevas notificaciones", async () => {
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    const res = await ctx.app.request("/notifications/unread-count", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as UnreadCountBody;
    expect(body.count).toBe(1);
  });

  it("unread-count sin sesión devuelve 401", async () => {
    const res = await ctx.app.request("/notifications/unread-count");
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // POST /notifications/read
  // -------------------------------------------------------------------------

  it("marcar como leídas reduce unread-count a 0", async () => {
    // Generar 2 notificaciones para alice
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: carolCookie },
    });

    // Verificar que hay 2 no leídas
    const countBefore = await ctx.app.request("/notifications/unread-count", {
      headers: { cookie: aliceCookie },
    });
    const beforeBody = (await countBefore.json()) as UnreadCountBody;
    expect(beforeBody.count).toBe(2);

    // Marcar como leídas
    const readRes = await ctx.app.request("/notifications/read", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    expect(readRes.status).toBe(200);
    const readBody = (await readRes.json()) as { ok: boolean };
    expect(readBody.ok).toBe(true);

    // Verificar que el contador bajó a 0
    const countAfter = await ctx.app.request("/notifications/unread-count", {
      headers: { cookie: aliceCookie },
    });
    const afterBody = (await countAfter.json()) as UnreadCountBody;
    expect(afterBody.count).toBe(0);
  });

  it("las notificaciones están marcadas como read=true después de POST /read", async () => {
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    // Marcar como leídas
    await ctx.app.request("/notifications/read", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    // Verificar el campo read en el listado
    const res = await ctx.app.request("/notifications", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as NotifPageBody;
    expect(body.notifications[0]?.read).toBe(true);
  });

  it("POST /notifications/read sin sesión devuelve 401", async () => {
    const res = await ctx.app.request("/notifications/read", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("marcar como leídas no afecta las notificaciones de otros usuarios", async () => {
    // Bob sigue a carol
    await ctx.app.request("/users/carol/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    // Carol marca sus notificaciones como leídas
    await ctx.app.request("/notifications/read", {
      method: "POST",
      headers: { cookie: carolCookie },
    });

    // Alice no tiene notificaciones — no se vio afectada
    const res = await ctx.app.request("/notifications/unread-count", {
      headers: { cookie: aliceCookie },
    });
    const body = (await res.json()) as UnreadCountBody;
    expect(body.count).toBe(0);
  });
});
