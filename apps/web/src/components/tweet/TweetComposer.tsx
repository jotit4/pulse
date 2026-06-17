import { useState } from "react";
import { TWEET_MAX_LENGTH } from "@pulse/shared";
import { useCreateTweet } from "@/hooks/useCreateTweet";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { UserAvatar } from "@/components/user/UserAvatar";

/** Compositor de tweets con contador de caracteres y manejo de errores. */
export function TweetComposer() {
  const [content, setContent] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const createTweet = useCreateTweet();
  const { user } = useAuth();

  const trimmed = content.trim();
  const charCount = content.length;
  const isDisabled = createTweet.isPending || trimmed.length === 0 || charCount > TWEET_MAX_LENGTH;
  const isOverLimit = charCount > TWEET_MAX_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (isDisabled) return;

    try {
      await createTweet.mutateAsync({ content: trimmed });
      setContent("");
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError("Error inesperado. Intenta de nuevo.");
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 py-3 space-y-3"
      style={{ borderBottom: "1px solid var(--color-x-border)" }}
    >
      <div className="flex gap-3">
        {user && (
          <div className="flex-shrink-0">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué estás pensando?"
            aria-label="Contenido del tweet"
            rows={3}
            disabled={createTweet.isPending}
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
              aria-live="polite"
              aria-label={`${charCount} de ${TWEET_MAX_LENGTH} caracteres`}
            >
              {charCount}/{TWEET_MAX_LENGTH}
            </span>

            <Button type="submit" disabled={isDisabled} isLoading={createTweet.isPending}>
              Publicar
            </Button>
          </div>
        </div>
      </div>

      <ErrorMessage message={apiError} />
    </form>
  );
}
