import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookmarksApi } from "@/api/client";
import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage, TweetView } from "@pulse/shared";

type TweetCache = InfiniteData<TweetPage>;

function updateBookmarkInCache(
  data: TweetCache | undefined,
  tweetId: string,
  bookmarkedByMe: boolean,
): TweetCache | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      tweets: page.tweets.map((t): TweetView =>
        t.id === tweetId ? { ...t, bookmarkedByMe } : t
      ),
    })),
  };
}

/** Hook para añadir/quitar bookmark con actualización optimista. */
export function useBookmark(tweetId: string) {
  const queryClient = useQueryClient();

  const toggle = useMutation({
    mutationFn: async (currentlyBookmarked: boolean) => {
      if (currentlyBookmarked) {
        return bookmarksApi.remove(tweetId);
      } else {
        return bookmarksApi.add(tweetId);
      }
    },
    onMutate: async (currentlyBookmarked) => {
      // Cancelar queries en vuelo
      await queryClient.cancelQueries({ queryKey: ["timeline"] });
      await queryClient.cancelQueries({ queryKey: ["explore"] });
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });

      const newValue = !currentlyBookmarked;

      // Actualizar optimistamente en todas las cachés relevantes
      const prevTimeline = queryClient.getQueryData<TweetCache>(["timeline"]);
      const prevExplore = queryClient.getQueryData<TweetCache>(["explore"]);
      const prevBookmarks = queryClient.getQueryData<TweetCache>(["bookmarks"]);

      queryClient.setQueryData<TweetCache>(["timeline"], (old) =>
        updateBookmarkInCache(old, tweetId, newValue)
      );
      queryClient.setQueryData<TweetCache>(["explore"], (old) =>
        updateBookmarkInCache(old, tweetId, newValue)
      );
      queryClient.setQueryData<TweetCache>(["bookmarks"], (old) =>
        updateBookmarkInCache(old, tweetId, newValue)
      );

      return { prevTimeline, prevExplore, prevBookmarks };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevTimeline) queryClient.setQueryData(["timeline"], ctx.prevTimeline);
      if (ctx?.prevExplore) queryClient.setQueryData(["explore"], ctx.prevExplore);
      if (ctx?.prevBookmarks) queryClient.setQueryData(["bookmarks"], ctx.prevBookmarks);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  return toggle;
}
