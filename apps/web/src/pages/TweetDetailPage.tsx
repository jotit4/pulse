import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router";
import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage } from "@pulse/shared";
import { useTweetDetail } from "@/hooks/useTweetDetail";
import { useReplies } from "@/hooks/useReplies";
import { useReply } from "@/hooks/useReply";
import { useAuth } from "@/auth/useAuth";
import { TweetCard } from "@/components/tweet/TweetCard";
import { TweetList } from "@/components/tweet/TweetList";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ApiError } from "@/api/client";
import { TWEET_MAX_LENGTH } from "@pulse/shared";

function TweetDetailContent({ tweetId }: { tweetId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  const { data: threadData, isLoading: threadLoading, error: threadError } = useTweetDetail(tweetId);
  const repliesQuery = useReplies(tweetId);
  const replyMutation = useReply(tweetId);

  const charCount = replyContent.length;
  const isOverLimit = charCount > TWEET_MAX_LENGTH;
  const isReplyDisabled = replyMutation.isPending || replyContent.trim().length === 0 || isOverLimit;

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setReplyError(null);
    if (isReplyDisabled) return;
    try {
      await replyMutation.mutateAsync(replyContent.trim());
      setReplyContent("");
    } catch (err) {
      if (err instanceof ApiError) {
        setReplyError(err.message);
      } else {
        setReplyError("Error inesperado. Intenta de nuevo.");
      }
    }
  }

  if (threadLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (threadError) {
    if (threadError instanceof ApiError && threadError.status === 404) {
      return (
        <div className="px-4 py-12 text-center text-sm" style={{ color: "var(--color-x-muted)" }}>
          Tweet no encontrado
        </div>
      );
    }
    return (
      <div className="px-4 py-8">
        <ErrorMessage message={(threadError as Error).message} />
      </div>
    );
  }

  if (!threadData) return null;

  const { tweet, parent } = threadData;

  return (
    <div>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-x-bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-x-border)",
        }}
      >
        <button
          onClick={() => void navigate(-1)}
          aria-label="Volver"
          className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--color-x-surface)]"
          style={{ color: "var(--color-x-text)" }}
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
          Tweet
        </h1>
      </header>

      {/* Tweet padre (contexto) */}
      {parent && (
        <div style={{ borderBottom: "1px solid var(--color-x-border)" }}>
          <TweetCard tweet={parent} />
        </div>
      )}

      {/* Tweet principal (grande) */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: "1px solid var(--color-x-border)" }}
      >
        <div className="flex gap-3">
          <UserAvatar name={tweet.author.name} avatarUrl={tweet.author.avatarUrl} size="lg" />
          <div>
            <p className="font-bold text-base" style={{ color: "var(--color-x-text)" }}>
              {tweet.author.name}
            </p>
            <p className="text-sm" style={{ color: "var(--color-x-muted)" }}>
              @{tweet.author.username}
            </p>
          </div>
        </div>
        <p
          className="mt-3 text-xl whitespace-pre-wrap break-words"
          style={{ color: "var(--color-x-text)" }}
        >
          {tweet.content}
        </p>
        <p className="mt-3 text-sm" style={{ color: "var(--color-x-muted)" }}>
          {new Date(tweet.createdAt).toLocaleString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <div
          className="mt-3 flex items-center gap-4 text-sm pt-3"
          style={{ borderTop: "1px solid var(--color-x-border)", color: "var(--color-x-muted)" }}
        >
          <span>
            <strong className="font-bold" style={{ color: "var(--color-x-text)" }}>
              {tweet.replyCount ?? 0}
            </strong>{" "}
            respuestas
          </span>
          <span>
            <strong className="font-bold" style={{ color: "var(--color-x-text)" }}>
              {tweet.likesCount}
            </strong>{" "}
            likes
          </span>
        </div>
      </div>

      {/* Compositor de respuesta */}
      {user && (
        <form
          onSubmit={handleReply}
          className="px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-x-border)" }}
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl ?? null} size="md" />
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Respondé este tweet…"
                aria-label="Contenido de la respuesta"
                rows={3}
                disabled={replyMutation.isPending}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none transition-colors disabled:opacity-60"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-x-border)",
                  color: "var(--color-x-text)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-x-brand)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-x-border)";
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <span
                  className="text-sm"
                  style={{ color: isOverLimit ? "var(--color-x-danger)" : "var(--color-x-muted)" }}
                >
                  {charCount}/{TWEET_MAX_LENGTH}
                </span>
                <Button type="submit" disabled={isReplyDisabled} isLoading={replyMutation.isPending}>
                  Responder
                </Button>
              </div>
            </div>
          </div>
          <ErrorMessage message={replyError} />
        </form>
      )}

      {/* Lista de respuestas */}
      {repliesQuery.isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {repliesQuery.data && (
        <TweetList
          data={repliesQuery.data as InfiniteData<TweetPage>}
          hasNextPage={repliesQuery.hasNextPage}
          isFetchingNextPage={repliesQuery.isFetchingNextPage}
          fetchNextPage={repliesQuery.fetchNextPage}
        />
      )}
    </div>
  );
}

export function TweetDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return <TweetDetailContent tweetId={id} />;
}
