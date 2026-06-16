import { useState } from "react";
import { TWEET_MAX_LENGTH } from "@pulse/shared";
import { useCreateTweet } from "@/hooks/useCreateTweet";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/** Compositor de tweets con contador de caracteres y manejo de errores. */
export function TweetComposer() {
  const [content, setContent] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const createTweet = useCreateTweet();

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
        setApiError("Error inesperado. Intentá de nuevo.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-gray-100 px-4 py-3 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="¿Qué estás pensando?"
        aria-label="Contenido del tweet"
        rows={3}
        disabled={createTweet.isPending}
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-60"
      />

      <div className="flex items-center justify-between">
        {/* Contador de caracteres */}
        <span
          className={`text-sm ${isOverLimit ? "text-red-500 font-semibold" : "text-gray-400"}`}
          aria-live="polite"
          aria-label={`${charCount} de ${TWEET_MAX_LENGTH} caracteres`}
        >
          {charCount}/{TWEET_MAX_LENGTH}
        </span>

        <Button type="submit" disabled={isDisabled} isLoading={createTweet.isPending}>
          Publicar
        </Button>
      </div>

      <ErrorMessage message={apiError} />
    </form>
  );
}
