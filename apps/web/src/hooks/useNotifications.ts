import { useInfiniteQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/api/client";

/** Hook de notificaciones con paginación infinita. */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
