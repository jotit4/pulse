import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/client";

/**
 * Hook para buscar usuarios por nombre o username.
 * Incluye un debounce interno de 350 ms para no disparar una request por
 * cada tecla. Solo se activa cuando la búsqueda tiene al menos 2 caracteres.
 */
export function useSearch(rawQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(rawQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [rawQuery]);

  return useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => usersApi.search(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    retry: false,
  });
}
