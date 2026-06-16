import { useInfiniteQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/client";

/**
 * Hook para obtener los tweets de un usuario con paginación infinita por
 * cursor. Sigue el mismo patrón que useTimeline.
 */
export function useUserTweets(username: string) {
  return useInfiniteQuery({
    queryKey: ["userTweets", username],
    queryFn: ({ pageParam }) => usersApi.tweets(username, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
