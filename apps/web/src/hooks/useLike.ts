import { useMutation, useQueryClient } from "@tanstack/react-query";
import { socialApi } from "@/api/client";
import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage, TweetView } from "@pulse/shared";

// InfiniteData<TweetPage> usa TPageParam = unknown, que es lo que TanStack Query v5 infiere
type TimelineCache = InfiniteData<TweetPage>;

/** Actualiza el tweet en la caché del timeline tras like/unlike. */
function updateTweetInCache(
  data: TimelineCache | undefined,
  tweetId: string,
  update: Pick<TweetView, "likesCount" | "likedByMe">,
): TimelineCache | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      tweets: page.tweets.map((t) => (t.id === tweetId ? { ...t, ...update } : t)),
    })),
  };
}

/** Hook para dar/quitar like con actualización optimista de la caché. */
export function useLike() {
  const queryClient = useQueryClient();

  const like = useMutation({
    mutationFn: (tweetId: string) => socialApi.like(tweetId),
    onMutate: async (tweetId) => {
      await queryClient.cancelQueries({ queryKey: ["timeline"] });

      const prev = queryClient.getQueryData<TimelineCache>(["timeline"]);

      queryClient.setQueryData<TimelineCache>(["timeline"], (old) => {
        const tweet = old?.pages.flatMap((p) => p.tweets).find((t) => t.id === tweetId);
        if (!tweet) return old;
        return updateTweetInCache(old, tweetId, {
          likesCount: tweet.likesCount + 1,
          likedByMe: true,
        });
      });

      return { prev };
    },
    onError: (_err, _tweetId, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["timeline"], ctx.prev);
      }
    },
    onSettled: async (_data, _err, tweetId) => {
      // Si el servidor devolvió datos reales, actualiza con el valor autoritativo
      if (_data) {
        queryClient.setQueryData<TimelineCache>(["timeline"], (old) =>
          updateTweetInCache(old, tweetId, _data),
        );
      }
    },
  });

  const unlike = useMutation({
    mutationFn: (tweetId: string) => socialApi.unlike(tweetId),
    onMutate: async (tweetId) => {
      await queryClient.cancelQueries({ queryKey: ["timeline"] });

      const prev = queryClient.getQueryData<TimelineCache>(["timeline"]);

      queryClient.setQueryData<TimelineCache>(["timeline"], (old) => {
        const tweet = old?.pages.flatMap((p) => p.tweets).find((t) => t.id === tweetId);
        if (!tweet) return old;
        return updateTweetInCache(old, tweetId, {
          likesCount: Math.max(0, tweet.likesCount - 1),
          likedByMe: false,
        });
      });

      return { prev };
    },
    onError: (_err, _tweetId, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["timeline"], ctx.prev);
      }
    },
    onSettled: async (_data, _err, tweetId) => {
      if (_data) {
        queryClient.setQueryData<TimelineCache>(["timeline"], (old) =>
          updateTweetInCache(old, tweetId, _data),
        );
      }
    },
  });

  return { like, unlike };
}
