import type { TweetPage, TweetView } from "@pulse/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

interface PostTweetBody {
  tweet: TweetView;
}

describe("GET /explore", () => {
  let ctx: TestApp;
  let aliceCookie: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    const alice = await registerAndAuth(ctx.app, {
      username: "alice",
      name: "Alice",
      email: "alice@example.com",
    });
    aliceCookie = alice.cookieHeader;
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

  /** Llama a GET /explore con los parámetros dados. */
  async function getExplore(
    cookieHeader: string,
    params: Record<string, string> = {},
  ): Promise<TweetPage> {
    const qs = new URLSearchParams(params).toString();
    const url = `/explore${qs ? `?${qs}` : ""}`;
    const res = await ctx.app.request(url, { headers: { cookie: cookieHeader } });
    expect(res.status).toBe(200);
    return (await res.json()) as TweetPage;
  }

  it("feed vacío al inicio devuelve tweets=[] y nextCursor=null", async () => {
    const page = await getExplore(aliceCookie);
    expect(page.tweets).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("muestra tweets propios del viewer", async () => {
    await postTweet("hola desde alice", aliceCookie);
    const page = await getExplore(aliceCookie);
    expect(page.tweets).toHaveLength(1);
    expect(page.tweets[0]!.content).toBe("hola desde alice");
  });

  it("muestra tweets de usuarios NO seguidos", async () => {
    // Carol no es seguida por Alice
    const carol = await registerAndAuth(ctx.app, {
      username: "carol",
      name: "Carol",
      email: "carol@example.com",
    });
    await postTweet("tweet de carol", carol.cookieHeader);

    const page = await getExplore(aliceCookie);
    const contents = page.tweets.map((t) => t.content);
    expect(contents).toContain("tweet de carol");
  });

  it("muestra tweets de usuarios seguidos Y no seguidos (feed global)", async () => {
    const bob = await registerAndAuth(ctx.app, {
      username: "bob",
      name: "Bob",
      email: "bob@example.com",
    });
    const carol = await registerAndAuth(ctx.app, {
      username: "carol",
      name: "Carol",
      email: "carol@example.com",
    });

    await postTweet("tweet alice", aliceCookie);
    await postTweet("tweet bob", bob.cookieHeader);
    await postTweet("tweet carol", carol.cookieHeader);

    // Alice sigue a bob pero no a carol
    await ctx.app.request("/users/bob/follow", {
      method: "POST",
      headers: { cookie: aliceCookie },
    });

    const page = await getExplore(aliceCookie);
    const contents = page.tweets.map((t) => t.content);
    expect(contents).toContain("tweet alice");
    expect(contents).toContain("tweet bob");
    expect(contents).toContain("tweet carol"); // no seguida pero sí aparece
  });

  it("orden descendente: el tweet más nuevo aparece primero", async () => {
    await postTweet("primero", aliceCookie);
    await postTweet("segundo", aliceCookie);
    await postTweet("tercero", aliceCookie);

    const page = await getExplore(aliceCookie);
    expect(page.tweets[0]!.content).toBe("tercero");
    expect(page.tweets[1]!.content).toBe("segundo");
    expect(page.tweets[2]!.content).toBe("primero");
  });

  it("paginación: nextCursor no nulo, segunda página sin solapamiento y cubriendo todo", async () => {
    for (let i = 1; i <= 5; i++) {
      await postTweet(`tweet ${i}`, aliceCookie);
    }

    const page1 = await getExplore(aliceCookie, { limit: "3" });
    expect(page1.tweets).toHaveLength(3);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await getExplore(aliceCookie, { limit: "3", cursor: page1.nextCursor! });
    expect(page2.tweets).toHaveLength(2);
    expect(page2.nextCursor).toBeNull();

    // Sin solapamiento
    const ids1 = new Set(page1.tweets.map((t) => t.id));
    for (const t of page2.tweets) {
      expect(ids1.has(t.id)).toBe(false);
    }

    // Todos los tweets cubiertos
    expect(new Set([...ids1, ...page2.tweets.map((t) => t.id)]).size).toBe(5);
  });

  it("cursor inválido se trata como sin cursor (no lanza error)", async () => {
    await postTweet("hola", aliceCookie);
    const page = await getExplore(aliceCookie, { cursor: "basura-no-base64url" });
    expect(page.tweets.length).toBeGreaterThan(0);
  });

  it("requiere autenticación (401 sin cookie)", async () => {
    const res = await ctx.app.request("/explore");
    expect(res.status).toBe(401);
  });
});
