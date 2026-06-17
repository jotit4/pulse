import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/hooks/useNotifications";
import { notificationsApi } from "@/api/client";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/** Texto descriptivo según tipo de notificación. */
function notifTexto(type: "follow" | "like" | "reply"): string {
  switch (type) {
    case "follow":
      return "te empezó a seguir";
    case "like":
      return "le gustó tu tweet";
    case "reply":
      return "respondió tu tweet";
  }
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotifications();

  // Marcar como leídas al montar la página
  useEffect(() => {
    notificationsApi.markRead().then(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    }).catch(() => {
      // Silenciar errores no críticos
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll sentinel
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const sentinel = document.getElementById("notif-sentinel");
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-8">
        <ErrorMessage message={(error as Error).message} />
      </div>
    );
  }

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];

  return (
    <div>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-x-bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-x-border)",
        }}
      >
        <h1 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
          Notificaciones
        </h1>
      </header>

      {notifications.length === 0 ? (
        <div
          className="px-4 py-12 text-center text-sm"
          style={{ color: "var(--color-x-muted)" }}
        >
          <p>No tenés notificaciones todavía.</p>
        </div>
      ) : (
        <>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="px-4 py-3 transition-colors"
              style={{
                borderBottom: "1px solid var(--color-x-border)",
                backgroundColor: notif.read ? undefined : "color-mix(in srgb, var(--color-x-brand) 8%, transparent)",
                cursor: notif.tweet ? "pointer" : "default",
              }}
              onClick={() => {
                if (notif.tweet) void navigate(`/tweet/${notif.tweet.id}`);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--color-x-surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = notif.read
                  ? ""
                  : "color-mix(in srgb, var(--color-x-brand) 8%, transparent)";
              }}
            >
              <div className="flex gap-3">
                <UserAvatar
                  name={notif.actor.name}
                  avatarUrl={notif.actor.avatarUrl ?? null}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "var(--color-x-text)" }}>
                    <span className="font-bold">{notif.actor.name}</span>{" "}
                    {notifTexto(notif.type)}
                  </p>
                  {notif.tweet && (
                    <p
                      className="mt-1 text-sm truncate"
                      style={{ color: "var(--color-x-muted)" }}
                    >
                      {notif.tweet.content}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs" style={{ color: "var(--color-x-muted)" }}>
                    {new Date(notif.createdAt).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                {!notif.read && (
                  <div
                    className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--color-x-brand)" }}
                    aria-label="No leída"
                  />
                )}
              </div>
            </div>
          ))}

          <div id="notif-sentinel" className="h-4" aria-hidden="true" />

          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Spinner className="h-6 w-6" />
            </div>
          )}

          {!hasNextPage && notifications.length > 0 && (
            <p
              className="py-6 text-center text-sm"
              style={{ color: "var(--color-x-muted)" }}
            >
              Ya viste todo por ahora.
            </p>
          )}
        </>
      )}
    </div>
  );
}
