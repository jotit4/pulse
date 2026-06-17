import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookmarksApi } from "@/api/client";
import { patchTweetEverywhere, invalidateTweetQueries } from "./tweetCache";

/** Hook para añadir/quitar bookmark con actualización optimista en toda la caché. */
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
      patchTweetEverywhere(queryClient, tweetId, {
        bookmarkedByMe: !currentlyBookmarked,
      });
    },
    onError: () => {
      invalidateTweetQueries(queryClient);
    },
    onSettled: async () => {
      // La página de bookmarks siempre necesita un refetch para agregar/quitar el tweet
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  return toggle;
}
