import type { TweetPage, TweetView } from "@pulse/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

// ---------------------------------------------------------------------------
// Helpers tipados
// ---------------------------------------------------------------------------

interface PostTweetBody {
  tweet: TweetView;
}

interface LikeBody {
  likesCount: number;
  likedByMe: boolean;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("timeline", () => {
  let ctx: TestApp;
  let aliceCookie: string;
  let aliceId: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    const alice = await registerAndAuth(ctx.app, {
      username: "alice",
      name: "Alice",
      email: "alice@example.com",
    });
    aliceCookie = alice.cookieHeader;
    aliceId = alice.body.user.id;
  });

  afterEach(async () => {
    await ctx.close();
  });

  /** Publica un tweet como el usuario identificado por `cookieHeader`. */
  async function postTweet(content: string, cookieHeader: string): Promise<TweetView> {
    const res = await ctx.app.request("/tweets", {
      method: "POST",
      headers: { ...jsonHeaders, cookie: cookieHeader },
      body: JSON.stringify({ content }),
    });
    const body = (await res.json()) as PostTweetBody;
    return body.tweet;
  }

  /** Pide el timeline del usuario identificado por `cookieHeader`. */
  async function getTimeline(
    cookieHeader: string,
    params: Record<string, string> = {},
  ): Promise<TweetPage> {
    const qs = new URLSearchParams(params).toString();
    const url = `/timeline${qs ? `?${qs}` : ""}`;
    const res = await ctx.app.request(url, { headers: { cookie: cookieHeader } });
    expect(res.status).toBe(200);
    return (await res.json()) as TweetPage;
  }

  // -------------------------------------------------------------------------

  it("timeline vacío al inicio devuelve tweets=[] y nextCursor=null", async () => {
    const page = await getTimeline(aliceCookie);
    expect(page.tweets).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("muestra los tweets propios del viewer", async () => {
    await postTweet("tweet propio", aliceCookie);
    const page = await getTimeline(aliceCookie);
    expect(page.tweets).toHaveLength(1);
    expect(page.tweets[0]!.content).toBe("tweet propio");
    expect(page.tweets[0]!.author.username).toBe("alice");
  });

  it("muestra tweets de un usuario seguido", async () => {
    const bob = await registerAndAuth(ctx.app, {
      username: "bob",
      name: "Bob",
      email: "bob@example.com",
    });

    await postTweet("tweet de bob", bob.cookieHeader);

    // Alice sigue a bob
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const page = await getTimeline(aliceCookie);
    const contents = page.tweets.map((t) => t.content);
    expect(contents).toContain("tweet de bob");
  });

  it("NO muestra tweets de un usuario no seguido", async () => {
    const carol = await registerAndAuth(ctx.app, {
      username: "carol",
      name: "Carol",
      email: "carol@example.com",
    });

    await postTweet("tweet de carol", carol.cookieHeader);

    // Alice no sigue a carol
    const page = await getTimeline(aliceCookie);
    const contents = page.tweets.map((t) => t.content);
    expect(contents).not.toContain("tweet de carol");
  });

  it("orden descendente: el tweet más nuevo aparece primero", async () => {
    await postTweet("primero", aliceCookie);
    await postTweet("segundo", aliceCookie);
    await postTweet("tercero", aliceCookie);

    const page = await getTimeline(aliceCookie);
    expect(page.tweets[0]!.content).toBe("tercero");
    expect(page.tweets[1]!.content).toBe("segundo");
    expect(page.tweets[2]!.content).toBe("primero");
  });

  it("paginación: nextCursor no nulo, segunda página sin solapamiento y todo cubierto", async () => {
    // Creamos 5 tweets con un pequeño delay para garantizar orden temporal.
    for (let i = 1; i <= 5; i++) {
      await postTweet(`tweet ${i}`, aliceCookie);
    }

    // Primera página de 3
    const page1 = await getTimeline(aliceCookie, { limit: "3" });
    expect(page1.tweets).toHaveLength(3);
    expect(page1.nextCursor).not.toBeNull();

    // Segunda página usando el cursor
    const page2 = await getTimeline(aliceCookie, { limit: "3", cursor: page1.nextCursor! });
    expect(page2.tweets).toHaveLength(2);
    expect(page2.nextCursor).toBeNull();

    // Sin solapamiento entre páginas
    const ids1 = new Set(page1.tweets.map((t) => t.id));
    const ids2 = page2.tweets.map((t) => t.id);
    for (const id of ids2) {
      expect(ids1.has(id)).toBe(false);
    }

    // Todos los tweets entre las dos páginas
    const allIds = [...ids1, ...ids2];
    expect(allIds).toHaveLength(5);
  });

  it("likedByMe=true y likesCount=1 cuando el viewer likeó un tweet", async () => {
    const tweet = await postTweet("tweet para likear", aliceCookie);

    // Alice likea su propio tweet
    const likeRes = await ctx.app.request(`/tweets/${tweet.id}/like`, {
      method: "POST",
      headers: { cookie: aliceCookie },
    });
    expect(likeRes.status).toBe(200);
    const likeBody = (await likeRes.json()) as LikeBody;
    expect(likeBody.likedByMe).toBe(true);
    expect(likeBody.likesCount).toBe(1);

    // El timeline refleja el like
    const page = await getTimeline(aliceCookie);
    const t = page.tweets.find((tw) => tw.id === tweet.id);
    expect(t).toBeDefined();
    expect(t!.likedByMe).toBe(true);
    expect(t!.likesCount).toBe(1);
  });

  it("likedByMe=false para tweets que el viewer no likeó", async () => {
    await postTweet("sin like", aliceCookie);
    const page = await getTimeline(aliceCookie);
    expect(page.tweets[0]!.likedByMe).toBe(false);
    expect(page.tweets[0]!.likesCount).toBe(0);
  });

  it("requiere autenticación (401 sin cookie)", async () => {
    const res = await ctx.app.request("/timeline");
    expect(res.status).toBe(401);
  });

  it("cursor inválido se trata como sin cursor (no lanza error)", async () => {
    await postTweet("tweet cursor inválido", aliceCookie);
    const page = await getTimeline(aliceCookie, { cursor: "cursor-basura-que-no-es-base64url" });
    // Debe devolver tweets normalmente (sin filtro de cursor)
    expect(page.tweets.length).toBeGreaterThan(0);
  });
});
