import { useState } from "react";
import type { TweetView } from "@pulse/shared";
import { useAuth } from "@/auth/useAuth";
import { useLike } from "@/hooks/useLike";
import { useDeleteTweet } from "@/hooks/useDeleteTweet";
import { UserAvatar } from "@/components/user/UserAvatar";

interface TweetCardProps {
  tweet: TweetView;
}

/** Formatea una fecha ISO a texto relativo simple en espanol. */
function fechaRelativa(isoString: string): string {
  const ahora = Date.now();
  const fecha = new Date(isoString).getTime();
  const diffMs = ahora - fecha;

  const segundos = Math.floor(diffMs / 1_000);
  if (segundos < 60) return `${segundos}s`;

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos}m`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;

  const dias = Math.floor(horas / 24);
  if (dias < 7) return `${dias}d`;

  return new Date(isoString).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

/** Tarjeta de un tweet estilo X — avatar izquierda, acciones con hover de color. */
export function TweetCard({ tweet }: TweetCardProps) {
  const { user } = useAuth();
  const { like, unlike } = useLike();
  const deleteMutation = useDeleteTweet();

  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);

  const esMio = user?.username === tweet.author.username;
  const isPendingLike = like.isPending || unlike.isPending;

  function handleLike() {
    if (isPendingLike) return;
    if (tweet.likedByMe) {
      unlike.mutate(tweet.id);
    } else {
      like.mutate(tweet.id);
    }
  }

  function handleDelete() {
    if (deleteMutation.isPending) return;
    if (!confirmandoBorrar) {
      setConfirmandoBorrar(true);
      return;
    }
    setConfirmandoBorrar(false);
    deleteMutation.mutate(tweet.id);
  }

  function handleCancelarBorrar() {
    setConfirmandoBorrar(false);
  }

  return (
    <article
      className="px-4 py-3 transition-colors cursor-pointer"
      style={{ borderBottom: "1px solid var(--color-x-border)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-x-surface)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "";
      }}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <UserAvatar name={tweet.author.name} avatarUrl={tweet.author.avatarUrl} size="md" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Encabezado */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold text-sm" style={{ color: "var(--color-x-text)" }}>
              {tweet.author.name}
            </span>
            <span className="text-sm" style={{ color: "var(--color-x-muted)" }}>
              @{tweet.author.username}
            </span>
            <span className="text-sm" style={{ color: "var(--color-x-muted)" }}>
              ·
            </span>
            <time
              dateTime={tweet.createdAt}
              className="text-sm"
              style={{ color: "var(--color-x-muted)" }}
              title={new Date(tweet.createdAt).toLocaleString("es-AR")}
            >
              {fechaRelativa(tweet.createdAt)}
            </time>
          </div>

          {/* Texto */}
          <p
            className="mt-1 text-sm whitespace-pre-wrap break-words"
            style={{ color: "var(--color-x-text)" }}
          >
            {tweet.content}
          </p>

          {/* Acciones */}
          <div className="mt-3 flex items-center gap-6">
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={isPendingLike}
              aria-label={tweet.likedByMe ? "Quitar like" : "Dar like"}
              aria-pressed={tweet.likedByMe}
              className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-60"
              style={{
                color: tweet.likedByMe ? "var(--color-x-like)" : "var(--color-x-muted)",
              }}
              onMouseEnter={(e) => {
                if (!tweet.likedByMe)
                  (e.currentTarget as HTMLElement).style.color = "var(--color-x-like)";
              }}
              onMouseLeave={(e) => {
                if (!tweet.likedByMe)
                  (e.currentTarget as HTMLElement).style.color = "var(--color-x-muted)";
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill={tweet.likedByMe ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
              <span>{tweet.likesCount}</span>
            </button>

            {/* Borrar (solo autor) */}
            {esMio &&
              (confirmandoBorrar ? (
                <span className="flex items-center gap-1.5 text-sm">
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    aria-label="Confirmar borrado del tweet"
                    className="font-medium transition-colors disabled:opacity-60"
                    style={{ color: "var(--color-x-danger)" }}
                  >
                    Confirmar
                  </button>
                  <span style={{ color: "var(--color-x-muted)" }}>·</span>
                  <button
                    onClick={handleCancelarBorrar}
                    aria-label="Cancelar borrado del tweet"
                    className="transition-colors"
                    style={{ color: "var(--color-x-muted)" }}
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  aria-label="Borrar tweet"
                  className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-60"
                  style={{ color: "var(--color-x-muted)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--color-x-danger)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--color-x-muted)";
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                  <span>Borrar</span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </article>
  );
}
