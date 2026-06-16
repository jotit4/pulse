import { useMutation, useQueryClient } from "@tanstack/react-query";
import { socialApi } from "@/api/client";
import type { UserProfile } from "@pulse/shared";

/** Tipo de la entrada en la caché del perfil. */
type ProfileCache = { user: UserProfile };

/**
 * Hook para seguir/dejar de seguir a un usuario.
 * Aplica actualización optimista sobre la caché del perfil.
 */
export function useFollow(username: string) {
  const queryClient = useQueryClient();

  const profileKey = ["profile", username];

  const follow = useMutation({
    mutationFn: () => socialApi.follow(username),

    onMutate: async () => {
      // Cancelar re-fetches en vuelo para evitar sobreescribir el optimismo
      await queryClient.cancelQueries({ queryKey: profileKey });

      // Guardar snapshot para poder revertir en caso de error
      const snapshot = queryClient.getQueryData<ProfileCache>(profileKey);

      // Actualización optimista
      queryClient.setQueryData<ProfileCache>(profileKey, (old) => {
        if (!old) return old;
        return {
          user: {
            ...old.user,
            isFollowing: true,
            followersCount: old.user.followersCount + 1,
          },
        };
      });

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      // Revertir al estado anterior si hubo error
      if (ctx?.snapshot) {
        queryClient.setQueryData<ProfileCache>(profileKey, ctx.snapshot);
      }
    },

    onSuccess: () => {
      // Invalidar para sincronizar con el servidor
      void queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });

  const unfollow = useMutation({
    mutationFn: () => socialApi.unfollow(username),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: profileKey });

      const snapshot = queryClient.getQueryData<ProfileCache>(profileKey);

      queryClient.setQueryData<ProfileCache>(profileKey, (old) => {
        if (!old) return old;
        return {
          user: {
            ...old.user,
            isFollowing: false,
            followersCount: Math.max(0, old.user.followersCount - 1),
          },
        };
      });

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData<ProfileCache>(profileKey, ctx.snapshot);
      }
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });

  const isPending = follow.isPending || unfollow.isPending;

  return { follow, unfollow, isPending };
}
