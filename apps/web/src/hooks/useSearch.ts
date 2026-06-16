import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/client";

/**
 * Hook para buscar usuarios por nombre o username.
 * Solo se activa cuando la búsqueda tiene al menos 2 caracteres.
 */
export function useSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () => usersApi.search(q),
    enabled: q.trim().length >= 2,
    retry: false,
  });
}
