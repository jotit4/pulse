import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/client";

/** Hook para obtener el perfil completo de un usuario por su username. */
export function useProfile(username: string) {
  return useQuery({
    queryKey: ["profile", username],
    queryFn: () => usersApi.profile(username),
    retry: false,
  });
}
