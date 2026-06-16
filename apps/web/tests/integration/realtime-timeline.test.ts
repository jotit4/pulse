import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage, TweetView } from "@pulse/shared";
import { describe, expect, it } from "vitest";
import { insertarTweetEnTimeline } from "@/hooks/useRealtimeTimeline";

type TimelineData = InfiniteData<TweetPage, string | undefined>;

function tweet(id: string): TweetView {
  return {
    id,
    content: `tweet ${id}`,
    createdAt: new Date().toISOString(),
    author: { id: "u1", username: "alice", name: "Alice", avatarUrl: null },
    likesCount: 0,
    likedByMe: false,
  };
}

function timeline(...ids: string[]): TimelineData {
  return {
    pages: [{ tweets: ids.map(tweet), nextCursor: null }],
    pageParams: [undefined],
  };
}

describe("insertarTweetEnTimeline", () => {
  it("inserta el tweet nuevo al principio de la primera página", () => {
    const result = insertarTweetEnTimeline(timeline("b", "a"), tweet("c"));
    expect(result?.pages[0]!.tweets.map((t) => t.id)).toEqual(["c", "b", "a"]);
  });

  it("no duplica un tweet que ya está en la caché", () => {
    const prev = timeline("b", "a");
    const result = insertarTweetEnTimeline(prev, tweet("b"));
    expect(result).toBe(prev);
    expect(result?.pages[0]!.tweets.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("devuelve undefined si no hay datos previos (timeline aún sin cargar)", () => {
    expect(insertarTweetEnTimeline(undefined, tweet("c"))).toBeUndefined();
  });

  it("preserva el resto de las páginas sin tocarlas", () => {
    const prev: TimelineData = {
      pages: [
        { tweets: [tweet("b")], nextCursor: "cur1" },
        { tweets: [tweet("a")], nextCursor: null },
      ],
      pageParams: [undefined, "cur1"],
    };
    const result = insertarTweetEnTimeline(prev, tweet("c"));
    expect(result?.pages[0]!.tweets.map((t) => t.id)).toEqual(["c", "b"]);
    expect(result?.pages[1]).toBe(prev.pages[1]);
  });
});
