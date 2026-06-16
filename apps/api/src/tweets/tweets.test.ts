import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAndAuth, type TestApp } from "../../test/helpers/app";

const jsonHeaders = { "content-type": "application/json" };

interface TweetBody {
  tweet: {
    id: string;
    content: string;
    likesCount: number;
    likedByMe: boolean;
    author: { username: string };
  };
}

describe("tweets", () => {
  let ctx: TestApp;
  let cookie: string;

  beforeEach(async () => {
    ctx = await createTestApp();
    const { cookieHeader } = await registerAndAuth(ctx.app, {
      username: "alice",
      email: "alice@example.com",
    });
    cookie = cookieHeader;
  });

  afterEach(async () => {
    await ctx.close();
  });

  async function postTweet(content: string, cookieHeader = cookie) {
    return ctx.app.request("/tweets", {
      method: "POST",
      headers: { ...jsonHeaders, cookie: cookieHeader },
      body: JSON.stringify({ content }),
    });
  }

  it("crea un tweet (201) con autor, likesCount 0 y likedByMe false", async () => {
    const res = await postTweet("mi primer tweet");

    expect(res.status).toBe(201);
    const body = (await res.json()) as TweetBody;
    expect(body.tweet.content).toBe("mi primer tweet");
    expect(body.tweet.author.username).toBe("alice");
    expect(body.tweet.likesCount).toBe(0);
    expect(body.tweet.likedByMe).toBe(false);
  });

  it("rechaza crear un tweet sin sesión (401)", async () => {
    const res = await ctx.app.request("/tweets", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ content: "hola" }),
    });

    expect(res.status).toBe(401);
  });

  it("rechaza un tweet vacío y uno de más de 280 caracteres (400)", async () => {
    expect((await postTweet("")).status).toBe(400);
    expect((await postTweet("a".repeat(281))).status).toBe(400);
  });

  it("permite eliminar el tweet propio y luego devuelve 404", async () => {
    const created = (await (await postTweet("a borrar")).json()) as TweetBody;

    const del = await ctx.app.request(`/tweets/${created.tweet.id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(del.status).toBe(200);

    const get = await ctx.app.request(`/tweets/${created.tweet.id}`, { headers: { cookie } });
    expect(get.status).toBe(404);
  });

  it("no permite eliminar el tweet de otra persona (403)", async () => {
    const created = (await (await postTweet("de alice")).json()) as TweetBody;

    const { cookieHeader: bobCookie } = await registerAndAuth(ctx.app, {
      username: "bob",
      email: "bob@example.com",
    });

    const del = await ctx.app.request(`/tweets/${created.tweet.id}`, {
      method: "DELETE",
      headers: { cookie: bobCookie },
    });
    expect(del.status).toBe(403);
  });

  it("devuelve 404 al eliminar un tweet inexistente", async () => {
    const del = await ctx.app.request(`/tweets/${crypto.randomUUID()}`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(del.status).toBe(404);
  });

  it("devuelve 404 al intentar eliminar con id que no es UUID", async () => {
    const del = await ctx.app.request("/tweets/no-es-un-uuid", {
      method: "DELETE",
      headers: { cookie },
    });
    expect(del.status).toBe(404);
  });

  it("GET /tweets/:id devuelve 404 cuando el tweet no existe (UUID válido)", async () => {
    const res = await ctx.app.request(`/tweets/${crypto.randomUUID()}`, {
      headers: { cookie },
    });
    expect(res.status).toBe(404);
  });

  it("GET /tweets/:id devuelve el tweet existente con su contenido", async () => {
    const created = (await (await postTweet("tweet para leer")).json()) as TweetBody;

    const res = await ctx.app.request(`/tweets/${created.tweet.id}`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TweetBody;
    expect(body.tweet.content).toBe("tweet para leer");
    expect(body.tweet.author.username).toBe("alice");
  });
});
