import { useInfiniteQuery } from "@tanstack/react-query";
import { exploreApi } from "@/api/client";

/** Hook del feed global de exploración con paginación infinita por cursor. */
export function useExploreFeed() {
  return useInfiniteQuery({
    queryKey: ["explore"],
    queryFn: ({ pageParam }) => exploreApi.feed({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
