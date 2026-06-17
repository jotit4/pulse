import { useInfiniteQuery } from "@tanstack/react-query";
import { repliesApi } from "@/api/client";

/** Hook de respuestas a un tweet con paginación infinita. */
export function useReplies(tweetId: string) {
  return useInfiniteQuery({
    queryKey: ["replies", tweetId],
    queryFn: ({ pageParam }) => repliesApi.list(tweetId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!tweetId,
  });
}
