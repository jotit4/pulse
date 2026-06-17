import { useState } from "react";
import { useParams, Navigate } from "react-router";
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

type Tab = "tweets" | "seguidores" | "seguidos";

function ProfileContent({ username }: { username: string }) {
  const { user: currentUser } = useAuth();
  const [tabActiva, setTabActiva] = useState<Tab>("tweets");

  const { data: profileData, isLoading, error } = useProfile(username);
  const user = profileData?.user;

  const { follow, unfollow, isPending: followPending } = useFollow(username);

  const tweetsQuery = useUserTweets(username);

  const followersQuery = useQuery({
    queryKey: ["followers", username],
    queryFn: () => socialApi.followers(username),
    enabled: tabActiva === "seguidores",
  });

  const followingQuery = useQuery({
    queryKey: ["following", username],
    queryFn: () => socialApi.following(username),
    enabled: tabActiva === "seguidos",
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="px-4 py-12 text-center text-sm" style={{ color: "var(--color-x-muted)" }}>
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

  const tabBase: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: "0.875rem",
    fontWeight: 500,
    transition: "background-color 150ms, border-color 150ms, color 150ms",
    color: "var(--color-x-muted)",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
  };
  const tabActivaStyle: React.CSSProperties = {
    ...tabBase,
    borderBottom: "2px solid var(--color-x-brand)",
    color: "var(--color-x-text)",
    fontWeight: 700,
  };

  return (
    <div>
      {/* Header sticky */}
      <header
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-x-bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-x-border)",
        }}
      >
        <h1 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
          {user.name}
        </h1>
        <p className="text-xs" style={{ color: "var(--color-x-muted)" }}>
          {user.tweetsCount} tweets
        </p>
      </header>

      {/* Header del perfil */}
      <div className="px-4 pt-6 pb-4" style={{ borderBottom: "1px solid var(--color-x-border)" }}>
        <div className="flex items-start justify-between gap-4">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />

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
                <Button variant="primary" onClick={() => follow.mutate()} isLoading={followPending}>
                  Seguir
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-bold" style={{ color: "var(--color-x-text)" }}>
            {user.name}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-x-muted)" }}>
            @{user.username}
          </p>
        </div>

        {user.bio && (
          <p className="mt-2 text-sm" style={{ color: "var(--color-x-text)" }}>
            {user.bio}
          </p>
        )}

        <div className="mt-3 flex gap-4 text-sm" style={{ color: "var(--color-x-muted)" }}>
          <span>
            <strong className="font-bold" style={{ color: "var(--color-x-text)" }}>
              {user.tweetsCount}
            </strong>{" "}
            tweets
          </span>
          <span>
            <strong className="font-bold" style={{ color: "var(--color-x-text)" }}>
              {user.followersCount}
            </strong>{" "}
            seguidores
          </span>
          <span>
            <strong className="font-bold" style={{ color: "var(--color-x-text)" }}>
              {user.followingCount}
            </strong>{" "}
            seguidos
          </span>
        </div>
      </div>

      {/* Tabs */}
      {/* Fix #6: roles ARIA para accesibilidad de tabs */}
      <div
        className="flex"
        role="tablist"
        style={{ borderBottom: "1px solid var(--color-x-border)" }}
      >
        <button
          role="tab"
          aria-selected={tabActiva === "tweets"}
          style={tabActiva === "tweets" ? tabActivaStyle : tabBase}
          onClick={() => setTabActiva("tweets")}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-x-surface)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "";
          }}
        >
          Tweets
        </button>
        <button
          role="tab"
          aria-selected={tabActiva === "seguidores"}
          style={tabActiva === "seguidores" ? tabActivaStyle : tabBase}
          onClick={() => setTabActiva("seguidores")}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-x-surface)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "";
          }}
        >
          Seguidores
        </button>
        <button
          role="tab"
          aria-selected={tabActiva === "seguidos"}
          style={tabActiva === "seguidos" ? tabActivaStyle : tabBase}
          onClick={() => setTabActiva("seguidos")}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-x-surface)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "";
          }}
        >
          Seguidos
        </button>
      </div>

      {/* Fix #6: panel con role="tabpanel" */}
      <div role="tabpanel">
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
              <p
                className="px-4 py-8 text-center text-sm"
                style={{ color: "var(--color-x-muted)" }}
              >
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
              <p
                className="px-4 py-8 text-center text-sm"
                style={{ color: "var(--color-x-muted)" }}
              >
                Este usuario aún no sigue a nadie.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Pagina de perfil de usuario.
 * Fix #1: si useParams no devuelve username (ruta mal configurada), redirige al inicio.
 */
export function ProfilePage() {
  const { username } = useParams<{ username: string }>();

  if (!username) {
    return <Navigate to="/" replace />;
  }

  return <ProfileContent username={username} />;
}
