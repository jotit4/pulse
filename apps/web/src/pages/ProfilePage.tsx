import { useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage } from "@pulse/shared";
import { useProfile } from "@/hooks/useProfile";
import { useUserTweets } from "@/hooks/useUserTweets";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/auth/useAuth";
import { socialApi, ApiError } from "@/api/client";
import { UserAvatar } from "@/components/user/UserAvatar";
import { UserCard } from "@/components/user/UserCard";
import { TweetList } from "@/components/tweet/TweetList";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/** Pestañas disponibles en el perfil. */
type Tab = "tweets" | "seguidores" | "seguidos";

/** Página de perfil de usuario con tabs de tweets, seguidores y seguidos. */
export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [tabActiva, setTabActiva] = useState<Tab>("tweets");

  const { data: profileData, isLoading, error } = useProfile(username!);
  const user = profileData?.user;

  const { follow, unfollow, isPending: followPending } = useFollow(username!);

  // Tweets del usuario
  const tweetsQuery = useUserTweets(username!);

  // Seguidores del usuario
  const followersQuery = useQuery({
    queryKey: ["followers", username],
    queryFn: () => socialApi.followers(username!),
    enabled: tabActiva === "seguidores",
  });

  // Seguidos del usuario
  const followingQuery = useQuery({
    queryKey: ["following", username],
    queryFn: () => socialApi.following(username!),
    enabled: tabActiva === "seguidos",
  });

  // — Estado de carga del perfil —
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  // — Manejo de errores —
  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="px-4 py-12 text-center text-gray-500">
          Usuario no encontrado
        </div>
      );
    }
    return (
      <div className="px-4 py-8">
        <ErrorMessage message={(error as Error).message} />
      </div>
    );
  }

  if (!user) return null;

  const esMiPerfil = currentUser?.username === user.username;

  // Clases de tab activa e inactiva
  const tabBase = "px-4 py-3 text-sm font-medium border-b-2 transition-colors";
  const tabActiva_ = `${tabBase} border-brand text-brand`;
  const tabInactiva = `${tabBase} border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300`;

  return (
    <div>
      {/* — Header del perfil — */}
      <div className="px-4 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="h-16 w-16" />

          {/* Botón Seguir/Siguiendo si no es el perfil propio */}
          {!esMiPerfil && (
            <div>
              {user.isFollowing ? (
                <Button
                  variant="secondary"
                  onClick={() => unfollow.mutate()}
                  isLoading={followPending}
                >
                  Siguiendo
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => follow.mutate()}
                  isLoading={followPending}
                >
                  Seguir
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Nombre y username */}
        <div className="mt-3">
          <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-500">@{user.username}</p>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="mt-2 text-sm text-gray-700">{user.bio}</p>
        )}

        {/* Contadores */}
        <div className="mt-3 flex gap-4 text-sm text-gray-500">
          <span>
            <strong className="text-gray-900">{user.tweetsCount}</strong> tweets
          </span>
          <span>
            <strong className="text-gray-900">{user.followersCount}</strong> seguidores
          </span>
          <span>
            <strong className="text-gray-900">{user.followingCount}</strong> seguidos
          </span>
        </div>
      </div>

      {/* — Tabs — */}
      <div className="flex border-b border-gray-100">
        <button
          className={tabActiva === "tweets" ? tabActiva_ : tabInactiva}
          onClick={() => setTabActiva("tweets")}
        >
          Tweets
        </button>
        <button
          className={tabActiva === "seguidores" ? tabActiva_ : tabInactiva}
          onClick={() => setTabActiva("seguidores")}
        >
          Seguidores
        </button>
        <button
          className={tabActiva === "seguidos" ? tabActiva_ : tabInactiva}
          onClick={() => setTabActiva("seguidos")}
        >
          Seguidos
        </button>
      </div>

      {/* — Contenido de los tabs — */}
      <div>
        {tabActiva === "tweets" && (
          <>
            {tweetsQuery.isLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {tweetsQuery.error && (
              <div className="px-4 py-4">
                <ErrorMessage message={(tweetsQuery.error as Error).message} />
              </div>
            )}
            {tweetsQuery.data && (
              <TweetList
                data={tweetsQuery.data as InfiniteData<TweetPage>}
                hasNextPage={tweetsQuery.hasNextPage}
                isFetchingNextPage={tweetsQuery.isFetchingNextPage}
                fetchNextPage={tweetsQuery.fetchNextPage}
              />
            )}
          </>
        )}

        {tabActiva === "seguidores" && (
          <>
            {followersQuery.isLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {followersQuery.error && (
              <div className="px-4 py-4">
                <ErrorMessage message={(followersQuery.error as Error).message} />
              </div>
            )}
            {followersQuery.data?.users.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
            {followersQuery.data?.users.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                Este usuario aún no tiene seguidores.
              </p>
            )}
          </>
        )}

        {tabActiva === "seguidos" && (
          <>
            {followingQuery.isLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {followingQuery.error && (
              <div className="px-4 py-4">
                <ErrorMessage message={(followingQuery.error as Error).message} />
              </div>
            )}
            {followingQuery.data?.users.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
            {followingQuery.data?.users.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                Este usuario aún no sigue a nadie.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
