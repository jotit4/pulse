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
 * Tarjeta de usuario con avatar, nombre, username, bio y boton de seguir.
 * El boton de seguir se muestra solo si el usuario no es el autenticado.
 */
export function UserCard({ user }: UserCardProps) {
  const { user: currentUser } = useAuth();
  const { follow, unfollow, isPending } = useFollow(user.username);

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
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: "1px solid var(--color-x-border)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-x-surface)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "";
      }}
    >
      <Link to={`/${user.username}`} className="shrink-0">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/${user.username}`} className="group min-w-0">
            <p
              className="font-bold text-sm truncate group-hover:underline"
              style={{ color: "var(--color-x-text)" }}
            >
              {user.name}
            </p>
            <p className="text-sm truncate" style={{ color: "var(--color-x-muted)" }}>
              @{user.username}
            </p>
          </Link>

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

        {user.bio && (
          <p className="mt-1 text-sm line-clamp-2" style={{ color: "var(--color-x-muted)" }}>
            {user.bio}
          </p>
        )}
      </div>
    </div>
  );
}
