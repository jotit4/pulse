import { useInfiniteQuery } from "@tanstack/react-query";
import { bookmarksApi } from "@/api/client";

/** Hook de bookmarks con paginación infinita. */
export function useBookmarks() {
  return useInfiniteQuery({
    queryKey: ["bookmarks"],
    queryFn: ({ pageParam }) => bookmarksApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
