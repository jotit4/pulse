import { describe, expect, it, vi } from "vitest";
import type { TweetEvent } from "./bus";
import { TweetBus, tweetBus } from "./bus";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTweetEvent(overrides: Partial<TweetEvent> = {}): TweetEvent {
  return {
    authorId: "author-1",
    tweet: {
      id: "tweet-1",
      content: "Hola mundo",
      createdAt: new Date().toISOString(),
      author: {
        id: "author-1",
        username: "alice",
        name: "Alice",
        avatarUrl: null,
      },
      likesCount: 0,
      likedByMe: false,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests del bus
// ---------------------------------------------------------------------------

describe("TweetBus", () => {
  it("un listener recibe el evento publicado", () => {
    const bus = new TweetBus();
    const listener = vi.fn();

    bus.subscribe(listener);
    const event = makeTweetEvent();
    bus.publishTweet(event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("múltiples listeners reciben el mismo evento", () => {
    const bus = new TweetBus();
    const l1 = vi.fn();
    const l2 = vi.fn();

    bus.subscribe(l1);
    bus.subscribe(l2);
    bus.publishTweet(makeTweetEvent());

    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();
  });

  it("unsubscribe elimina el listener y deja de recibir eventos", () => {
    const bus = new TweetBus();
    const listener = vi.fn();

    bus.subscribe(listener);
    bus.publishTweet(makeTweetEvent());
    expect(listener).toHaveBeenCalledOnce();

    bus.unsubscribe(listener);
    bus.publishTweet(makeTweetEvent());

    // Sigue en 1 — el segundo publish no llegó.
    expect(listener).toHaveBeenCalledOnce();
  });

  it("el payload llega íntegro al listener", () => {
    const bus = new TweetBus();
    let received: TweetEvent | null = null;
    const listener = (e: TweetEvent) => {
      received = e;
    };

    bus.subscribe(listener);
    const event = makeTweetEvent({ authorId: "custom-author" });
    bus.publishTweet(event);

    expect(received).toEqual(event);
    expect((received as TweetEvent | null)?.authorId).toBe("custom-author");
  });

  it("el singleton tweetBus existe y funciona", () => {
    expect(tweetBus).toBeDefined();
    const listener = vi.fn();
    tweetBus.subscribe(listener);
    tweetBus.publishTweet(makeTweetEvent());
    tweetBus.unsubscribe(listener);
    expect(listener).toHaveBeenCalledOnce();
  });
});
