import type { QueryClient, InfiniteData } from "@tanstack/react-query";
import type { TweetPage, TweetView } from "@pulse/shared";

/** Nombres de las claves de query que almacenan InfiniteData<TweetPage>. */
const INFINITE_FEED_KEYS = ["timeline", "explore", "bookmarks", "userTweets", "replies"] as const;

type InfiniteFeedKey = (typeof INFINITE_FEED_KEYS)[number];

type ThreadData = { tweet: TweetView; parent: TweetView | null };

/**
 * Aplica un parche parcial a todos los tweets que coincidan con `tweetId` en
 * cada caché conocida del cliente:
 *
 * - InfiniteData<TweetPage>: timeline, explore, bookmarks, userTweets, replies
 * - Detalle de hilo ["thread", id]: data.tweet y data.parent
 */
export function patchTweetEverywhere(
  queryClient: QueryClient,
  tweetId: string,
  patch: Partial<TweetView>,
): void {
  // --- feeds paginados (InfiniteData) ---
  queryClient.setQueriesData<InfiniteData<TweetPage>>(
    {
      predicate: (query) => {
        const key = query.queryKey[0];
        return INFINITE_FEED_KEYS.includes(key as InfiniteFeedKey);
      },
    },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          tweets: page.tweets.map((t) => (t.id === tweetId ? { ...t, ...patch } : t)),
        })),
      };
    },
  );

  // --- detalle de hilo ["thread", id] ---
  queryClient.setQueriesData<ThreadData>(
    {
      predicate: (query) => query.queryKey[0] === "thread",
    },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        tweet: old.tweet.id === tweetId ? { ...old.tweet, ...patch } : old.tweet,
        parent: old.parent?.id === tweetId ? { ...old.parent, ...patch } : old.parent,
      };
    },
  );
}

/**
 * Invalida todas las queries de tweets para forzar un refetch desde el
 * servidor. Se usa en el `onError` para revertir a estado real.
 */
export function invalidateTweetQueries(queryClient: QueryClient): void {
  for (const key of INFINITE_FEED_KEYS) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
  void queryClient.invalidateQueries({ queryKey: ["thread"] });
}
