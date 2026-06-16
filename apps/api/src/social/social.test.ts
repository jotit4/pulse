import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

// ---------------------------------------------------------------------------
// Interfaces de respuesta tipadas
// ---------------------------------------------------------------------------

interface LikeBody {
  likesCount: number;
  likedByMe: boolean;
}

interface FollowBody {
  following: boolean;
  followersCount: number;
}

interface UsersBody {
  users: Array<{ id: string; username: string; name: string }>;
}

interface TweetBody {
  tweet: { id: string; content: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function postTweet(app: TestApp["app"], cookie: string, content = "hola mundo") {
  const res = await app.request("/tweets", {
    method: "POST",
    headers: { ...jsonHeaders, cookie },
    body: JSON.stringify({ content }),
  });
  return (await res.json()) as TweetBody;
}

// ---------------------------------------------------------------------------
// Suite de likes
// ---------------------------------------------------------------------------

describe("likes", () => {
  let ctx: TestApp;
  let cookie: string;
  let tweetId: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    const { cookieHeader } = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });
    cookie = cookieHeader;
    const body = await postTweet(ctx.app, cookie);
    tweetId = body.tweet.id;
  });

  afterEach(async () => {
    await ctx.close();
  });

  it("dar like incrementa likesCount a 1 y likedByMe es true", async () => {
    const res = await ctx.app.request(`/tweets/${tweetId}/like`, {
      method: "POST",
      headers: { cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as LikeBody;
    expect(body.likesCount).toBe(1);
    expect(body.likedByMe).toBe(true);
  });

  it("dar like dos veces es idempotente (likesCount sigue en 1)", async () => {
    await ctx.app.request(`/tweets/${tweetId}/like`, { method: "POST", headers: { cookie } });
    const res = await ctx.app.request(`/tweets/${tweetId}/like`, {
      method: "POST",
      headers: { cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as LikeBody;
    expect(body.likesCount).toBe(1);
    expect(body.likedByMe).toBe(true);
  });

  it("quitar like reduce likesCount a 0 y likedByMe es false", async () => {
    await ctx.app.request(`/tweets/${tweetId}/like`, { method: "POST", headers: { cookie } });

    const res = await ctx.app.request(`/tweets/${tweetId}/like`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as LikeBody;
    expect(body.likesCount).toBe(0);
    expect(body.likedByMe).toBe(false);
  });

  it("quitar like sin haber dado like es idempotente (likesCount 0)", async () => {
    const res = await ctx.app.request(`/tweets/${tweetId}/like`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as LikeBody;
    expect(body.likesCount).toBe(0);
    expect(body.likedByMe).toBe(false);
  });

  it("like a tweet inexistente devuelve 404", async () => {
    const res = await ctx.app.request(`/tweets/${crypto.randomUUID()}/like`, {
      method: "POST",
      headers: { cookie },
    });
    expect(res.status).toBe(404);
  });

  it("like a id no-uuid devuelve 404", async () => {
    const res = await ctx.app.request("/tweets/no-es-uuid/like", {
      method: "POST",
      headers: { cookie },
    });
    expect(res.status).toBe(404);
  });

  it("unlike a tweet inexistente (uuid válido) devuelve 404", async () => {
    const res = await ctx.app.request(`/tweets/${crypto.randomUUID()}/like`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(res.status).toBe(404);
  });

  it("unlike a id no-uuid devuelve 404", async () => {
    const res = await ctx.app.request("/tweets/no-es-uuid/like", {
      method: "DELETE",
      headers: { cookie },
    });
    expect(res.status).toBe(404);
  });

  it("like sin sesión devuelve 401", async () => {
    const res = await ctx.app.request(`/tweets/${tweetId}/like`, { method: "POST" });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Suite de follows
// ---------------------------------------------------------------------------

describe("follows", () => {
  let ctx: TestApp;
  let aliceCookie: string;
  let bobCookie: string;

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
  });

  afterEach(async () => {
    await ctx.close();
  });

  it("alice sigue a bob → following true, followersCount 1", async () => {
    const res = await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as FollowBody;
    expect(body.following).toBe(true);
    expect(body.followersCount).toBe(1);
  });

  it("seguir dos veces es idempotente (followersCount sigue en 1)", async () => {
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    const res = await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as FollowBody;
    expect(body.followersCount).toBe(1);
  });

  it("dejar de seguir reduce followersCount a 0 y following es false", async () => {
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const res = await ctx.app.request("/users/bob/follow", {
      method: "DELETE",
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as FollowBody;
    expect(body.following).toBe(false);
    expect(body.followersCount).toBe(0);
  });

  it("intentar seguirse a uno mismo devuelve 400", async () => {
    const res = await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(400);
  });

  it("seguir a un usuario inexistente devuelve 404", async () => {
    const res = await ctx.app.request("/users/inexistente/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(404);
  });

  it("dejar de seguir sin haber seguido es idempotente (followersCount 0)", async () => {
    const res = await ctx.app.request("/users/bob/follow", {
      method: "DELETE",
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as FollowBody;
    expect(body.followersCount).toBe(0);
    expect(body.following).toBe(false);
  });

  it("follow sin sesión devuelve 401", async () => {
    const res = await ctx.app.request("/users/bob/follow", { method: "POST" });
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // GET /users/:username/followers y /following
  // -------------------------------------------------------------------------

  it("GET /users/bob/followers devuelve alice tras el follow", async () => {
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const res = await ctx.app.request("/users/bob/followers", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as UsersBody;
    expect(body.users).toHaveLength(1);
    expect(body.users[0]?.username).toBe("alice");
  });

  it("GET /users/alice/following devuelve bob tras el follow", async () => {
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const res = await ctx.app.request("/users/alice/following", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as UsersBody;
    expect(body.users).toHaveLength(1);
    expect(body.users[0]?.username).toBe("bob");
  });

  it("GET /users/bob/followers sin seguidores devuelve lista vacía", async () => {
    const res = await ctx.app.request("/users/bob/followers", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as UsersBody;
    expect(body.users).toHaveLength(0);
  });

  it("GET /users/:username/followers con usuario inexistente devuelve 404", async () => {
    const res = await ctx.app.request("/users/inexistente/followers", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(404);
  });

  it("GET /users/:username/following con usuario inexistente devuelve 404", async () => {
    const res = await ctx.app.request("/users/inexistente/following", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(404);
  });

  it("bob también puede seguir a alice (follows bidireccionales)", async () => {
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    await ctx.app.request("/users/alice/follow", {
      method: "POST",
      headers: { cookie: bobCookie },
    });

    const followersAlice = await ctx.app.request("/users/alice/followers", {
      headers: { cookie: aliceCookie },
    });
    const bodyAlice = (await followersAlice.json()) as UsersBody;
    expect(bodyAlice.users).toHaveLength(1);
    expect(bodyAlice.users[0]?.username).toBe("bob");
  });
});
