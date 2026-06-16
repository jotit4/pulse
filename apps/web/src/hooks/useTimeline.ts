import { useInfiniteQuery } from "@tanstack/react-query";
import { timelineApi } from "@/api/client";

/** Hook de timeline con paginación infinita por cursor. */
export function useTimeline() {
  return useInfiniteQuery({
    queryKey: ["timeline"],
    queryFn: ({ pageParam }) => timelineApi.get(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
