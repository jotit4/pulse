import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/client";
import { useEffect } from "react";
import { useLocation } from "react-router";

/** Hook para el contador de notificaciones no leídas. Se refresca cada 30s y al navegar. */
export function useUnreadCount() {
  const queryClient = useQueryClient();
  const location = useLocation();

  // Refetch al navegar
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
  }, [location.pathname, queryClient]);

  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
