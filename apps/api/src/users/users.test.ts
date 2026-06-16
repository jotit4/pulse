import type { PublicUser, TweetPage, TweetView, UserProfile } from "@pulse/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

// ---------------------------------------------------------------------------
// Interfaces de respuesta tipadas
// ---------------------------------------------------------------------------

interface UsersBody {
  users: PublicUser[];
}

interface ProfileBody {
  user: UserProfile;
}

interface PostTweetBody {
  tweet: TweetView;
}

// ---------------------------------------------------------------------------
// Suite de búsqueda
// ---------------------------------------------------------------------------

describe("GET /users/search", () => {
  let ctx: TestApp;
  let cookie: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    const alice = await registerAndAuth(ctx.app, {
      username: "alice",
      name: "Alice Wonderland",
      email: "alice@example.com",
    });
    cookie = alice.cookieHeader;
    await registerAndAuth(ctx.app, {
      username: "bob",
      name: "Bob Builder",
      email: "bob@example.com",
    });
    await registerAndAuth(ctx.app, {
      username: "carol",
      name: "Carol Bobson",
      email: "carol@example.com",
    });
  });

  afterEach(async () => {
    await ctx.close();
  });

  async function search(q: string, params: Record<string, string> = {}): Promise<UsersBody> {
    const qs = new URLSearchParams({ q, ...params }).toString();
    const res = await ctx.app.request(`/users/search?${qs}`, { headers: { cookie } });
    expect(res.status).toBe(200);
    return (await res.json()) as UsersBody;
  }

  it("encuentra por coincidencia parcial en username", async () => {
    const body = await search("ali");
    expect(body.users.map((u) => u.username)).toEqual(["alice"]);
  });

  it("encuentra por coincidencia parcial en name (case-insensitive)", async () => {
    // "bob" aparece en el username de bob y en el name de carol (Carol Bobson).
    const body = await search("BOB");
    const usernames = body.users.map((u) => u.username).sort();
    expect(usernames).toEqual(["bob", "carol"]);
  });

  it("devuelve [] para una consulta vacía o de sólo espacios", async () => {
    const body = await search("   ");
    expect(body.users).toEqual([]);
  });

  it("devuelve [] cuando no hay coincidencias", async () => {
    const body = await search("zzz-no-existe");
    expect(body.users).toEqual([]);
  });

  it("respeta el parámetro limit", async () => {
    // "o" coincide con bob y carol (bobson); limit=1 acota a uno.
    const body = await search("o", { limit: "1" });
    expect(body.users).toHaveLength(1);
  });

  it("trata los comodines de LIKE como texto literal", async () => {
    const body = await search("%");
    expect(body.users).toEqual([]);
  });

  it("no expone campos sensibles (sin email ni passwordHash)", async () => {
    const body = await search("alice");
    const user = body.users[0]! as unknown as Record<string, unknown>;
    expect(user.email).toBeUndefined();
    expect(user.passwordHash).toBeUndefined();
  });

  it("requiere autenticación (401 sin cookie)", async () => {
    const res = await ctx.app.request("/users/search?q=ali");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Suite de perfil
// ---------------------------------------------------------------------------

describe("GET /users/:username", () => {
  let ctx: TestApp;
  let aliceCookie: string;
  let bobCookie: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    const alice = await registerAndAuth(ctx.app, {
      username: "alice",
      name: "Alice",
      email: "alice@example.com",
    });
    aliceCookie = alice.cookieHeader;
    const bob = await registerAndAuth(ctx.app, {
      username: "bob",
      name: "Bob",
      email: "bob@example.com",
    });
    bobCookie = bob.cookieHeader;
  });

  afterEach(async () => {
    await ctx.close();
  });

  async function profile(username: string, cookie: string): Promise<ProfileBody> {
    const res = await ctx.app.request(`/users/${username}`, { headers: { cookie } });
    expect(res.status).toBe(200);
    return (await res.json()) as ProfileBody;
  }

  async function postTweet(content: string, cookie: string): Promise<void> {
    await ctx.app.request("/tweets", {
      method: "POST",
      headers: { ...jsonHeaders, cookie },
      body: JSON.stringify({ content }),
    });
  }

  it("devuelve el perfil con contadores en cero al inicio", async () => {
    const { user } = await profile("alice", aliceCookie);
    expect(user.username).toBe("alice");
    expect(user.followersCount).toBe(0);
    expect(user.followingCount).toBe(0);
    expect(user.tweetsCount).toBe(0);
    expect(user.isFollowing).toBe(false);
  });

  it("cuenta tweets, followers y following correctamente", async () => {
    await postTweet("uno", bobCookie);
    await postTweet("dos", bobCookie);
    // Alice sigue a bob.
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const { user } = await profile("bob", aliceCookie);
    expect(user.tweetsCount).toBe(2);
    expect(user.followersCount).toBe(1);
    expect(user.followingCount).toBe(0);
  });

  it("isFollowing=true cuando el viewer sigue al usuario", async () => {
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    const { user } = await profile("bob", aliceCookie);
    expect(user.isFollowing).toBe(true);
  });

  it("isFollowing=false para el perfil propio", async () => {
    const { user } = await profile("alice", aliceCookie);
    expect(user.isFollowing).toBe(false);
  });

  it("resuelve el username de forma case-insensitive", async () => {
    const { user } = await profile("ALICE", aliceCookie);
    expect(user.username).toBe("alice");
  });

  it("404 si el usuario no existe", async () => {
    const res = await ctx.app.request("/users/nadie", { headers: { cookie: aliceCookie } });
    expect(res.status).toBe(404);
  });

  it("requiere autenticación (401 sin cookie)", async () => {
    const res = await ctx.app.request("/users/alice");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Suite de tweets de un usuario
// ---------------------------------------------------------------------------

describe("GET /users/:username/tweets", () => {
  let ctx: TestApp;
  let aliceCookie: string;
  let bobCookie: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    const alice = await registerAndAuth(ctx.app, {
      username: "alice",
      name: "Alice",
      email: "alice@example.com",
    });
    aliceCookie = alice.cookieHeader;
    const bob = await registerAndAuth(ctx.app, {
      username: "bob",
      name: "Bob",
      email: "bob@example.com",
    });
    bobCookie = bob.cookieHeader;
  });

  afterEach(async () => {
    await ctx.close();
  });

  async function postTweet(content: string, cookie: string): Promise<TweetView> {
    const res = await ctx.app.request("/tweets", {
      method: "POST",
      headers: { ...jsonHeaders, cookie },
      body: JSON.stringify({ content }),
    });
    const body = (await res.json()) as PostTweetBody;
    return body.tweet;
  }

  async function getUserTweets(
    username: string,
    cookie: string,
    params: Record<string, string> = {},
  ): Promise<TweetPage> {
    const qs = new URLSearchParams(params).toString();
    const url = `/users/${username}/tweets${qs ? `?${qs}` : ""}`;
    const res = await ctx.app.request(url, { headers: { cookie } });
    expect(res.status).toBe(200);
    return (await res.json()) as TweetPage;
  }

  it("devuelve sólo los tweets del usuario pedido", async () => {
    await postTweet("de alice", aliceCookie);
    await postTweet("de bob", bobCookie);

    const page = await getUserTweets("bob", aliceCookie);
    expect(page.tweets).toHaveLength(1);
    expect(page.tweets[0]!.content).toBe("de bob");
    expect(page.tweets[0]!.author.username).toBe("bob");
  });

  it("orden descendente: el más nuevo primero", async () => {
    await postTweet("primero", aliceCookie);
    await postTweet("segundo", aliceCookie);
    await postTweet("tercero", aliceCookie);

    const page = await getUserTweets("alice", aliceCookie);
    expect(page.tweets.map((t) => t.content)).toEqual(["tercero", "segundo", "primero"]);
  });

  it("pagina por cursor sin solapamiento y cubriendo todo", async () => {
    for (let i = 1; i <= 5; i++) {
      await postTweet(`tweet ${i}`, aliceCookie);
    }

    const page1 = await getUserTweets("alice", aliceCookie, { limit: "3" });
    expect(page1.tweets).toHaveLength(3);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await getUserTweets("alice", aliceCookie, {
      limit: "3",
      cursor: page1.nextCursor!,
    });
    expect(page2.tweets).toHaveLength(2);
    expect(page2.nextCursor).toBeNull();

    const ids1 = new Set(page1.tweets.map((t) => t.id));
    for (const t of page2.tweets) {
      expect(ids1.has(t.id)).toBe(false);
    }
    expect(new Set([...ids1, ...page2.tweets.map((t) => t.id)]).size).toBe(5);
  });

  it("refleja likedByMe según el viewer", async () => {
    const tweet = await postTweet("para likear", bobCookie);
    await ctx.app.request(`/tweets/${tweet.id}/like`, {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const page = await getUserTweets("bob", aliceCookie);
    expect(page.tweets[0]!.likedByMe).toBe(true);
    expect(page.tweets[0]!.likesCount).toBe(1);
  });

  it("usuario sin tweets devuelve tweets=[] y nextCursor=null", async () => {
    const page = await getUserTweets("alice", aliceCookie);
    expect(page.tweets).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("404 si el usuario no existe", async () => {
    const res = await ctx.app.request("/users/nadie/tweets", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(404);
  });

  it("cursor inválido se trata como sin cursor", async () => {
    await postTweet("hola", aliceCookie);
    const page = await getUserTweets("alice", aliceCookie, { cursor: "basura-no-base64url" });
    expect(page.tweets.length).toBeGreaterThan(0);
  });

  it("requiere autenticación (401 sin cookie)", async () => {
    const res = await ctx.app.request("/users/alice/tweets");
    expect(res.status).toBe(401);
  });
});
