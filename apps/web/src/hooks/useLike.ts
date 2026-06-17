import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage } from "@pulse/shared";
import { socialApi } from "@/api/client";
import { patchTweetEverywhere, invalidateTweetQueries } from "./tweetCache";

/** Tipo auxiliar para buscar el tweet actual en cualquiera de los feeds cacheados. */
type TimelineCache = InfiniteData<TweetPage>;

/** Devuelve el tweet indicado buscando en todos los feeds paginados de la caché. */
function findTweetInFeeds(queryClient: QueryClient, tweetId: string) {
  const FEED_KEYS = ["timeline", "explore", "bookmarks", "userTweets", "replies"] as const;
  for (const key of FEED_KEYS) {
    const data = queryClient.getQueryData<TimelineCache>([key]);
    const tweet = data?.pages.flatMap((p) => p.tweets).find((t) => t.id === tweetId);
    if (tweet) return tweet;
  }

  // También buscar en el detalle de hilo
  const threadKeys = queryClient
    .getQueryCache()
    .findAll({ predicate: (q) => q.queryKey[0] === "thread" });
  for (const q of threadKeys) {
    const data = q.state.data as
      | {
          tweet: import("@pulse/shared").TweetView;
          parent: import("@pulse/shared").TweetView | null;
        }
      | undefined;
    if (data?.tweet.id === tweetId) return data.tweet;
    if (data?.parent?.id === tweetId) return data.parent;
  }

  return undefined;
}

import type { QueryClient } from "@tanstack/react-query";

/** Hook para dar/quitar like con actualización optimista en toda la caché. */
export function useLike() {
  const queryClient = useQueryClient();

  const like = useMutation({
    mutationFn: (tweetId: string) => socialApi.like(tweetId),
    onMutate: async (tweetId) => {
      const tweet = findTweetInFeeds(queryClient, tweetId);
      patchTweetEverywhere(queryClient, tweetId, {
        likedByMe: true,
        likesCount: (tweet?.likesCount ?? 0) + 1,
      });
      return { tweetId, prevLikesCount: tweet?.likesCount, prevLikedByMe: tweet?.likedByMe };
    },
    onSuccess: (data, tweetId) => {
      if (data) {
        // Actualizar con el valor autoritativo del servidor
        patchTweetEverywhere(queryClient, tweetId, data);
      }
    },
    onError: (_err, _tweetId, _ctx) => {
      invalidateTweetQueries(queryClient);
    },
  });

  const unlike = useMutation({
    mutationFn: (tweetId: string) => socialApi.unlike(tweetId),
    onMutate: async (tweetId) => {
      const tweet = findTweetInFeeds(queryClient, tweetId);
      patchTweetEverywhere(queryClient, tweetId, {
        likedByMe: false,
        likesCount: Math.max(0, (tweet?.likesCount ?? 1) - 1),
      });
      return { tweetId, prevLikesCount: tweet?.likesCount, prevLikedByMe: tweet?.likedByMe };
    },
    onSuccess: (data, tweetId) => {
      if (data) {
        patchTweetEverywhere(queryClient, tweetId, data);
      }
    },
    onError: (_err, _tweetId, _ctx) => {
      invalidateTweetQueries(queryClient);
    },
  });

  return { like, unlike };
}
