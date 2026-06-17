import { useState } from "react";
import { Link } from "react-router";
import type { PublicUser } from "@pulse/shared";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/auth/useAuth";
import { useFollow } from "@/hooks/useFollow";

interface UserCardProps {
  user: PublicUser & { isFollowing?: boolean };
}

/**
 * Tarjeta de usuario con avatar, nombre, username, bio y botón de seguir.
 * El botón de seguir se muestra solo si el usuario no es el autenticado.
 * Si `user.isFollowing` viene del servidor (ej: resultado de búsqueda),
 * se usa como estado inicial real; de lo contrario arranca en false.
 */
export function UserCard({ user }: UserCardProps) {
  const { user: currentUser } = useAuth();
  const { follow, unfollow, isPending } = useFollow(user.username);

  // Estado local que refleja si el viewer sigue a este usuario.
  // Se inicializa con el valor del servidor (isFollowing) si está disponible.
  const [siguiendo, setSiguiendo] = useState<boolean>(user.isFollowing ?? false);

  const esMiPerfil = currentUser?.username === user.username;

  function handleFollow() {
    follow.mutate(undefined, {
      onSuccess: () => setSiguiendo(true),
    });
  }

  function handleUnfollow() {
    unfollow.mutate(undefined, {
      onSuccess: () => setSiguiendo(false),
    });
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <Link to={`/${user.username}`} className="shrink-0">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/${user.username}`} className="group min-w-0">
            <p className="font-semibold text-gray-900 truncate group-hover:underline">
              {user.name}
            </p>
            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
          </Link>

          {/* Botón de seguir/dejar de seguir, solo si no es el perfil propio */}
          {!esMiPerfil && (
            <div className="shrink-0">
              {siguiendo ? (
                <Button
                  variant="secondary"
                  onClick={handleUnfollow}
                  isLoading={isPending}
                  className="text-xs px-3 py-1"
                >
                  Siguiendo
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleFollow}
                  isLoading={isPending}
                  className="text-xs px-3 py-1"
                >
                  Seguir
                </Button>
              )}
            </div>
          )}
        </div>

        {user.bio && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{user.bio}</p>}
      </div>
    </div>
  );
}
