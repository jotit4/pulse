import { useEffect } from "react";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import type { TweetPage, TweetView } from "@pulse/shared";
import { API_BASE } from "@/api/client";

type TimelineData = InfiniteData<TweetPage, string | undefined>;

/**
 * Inserta un tweet al principio del timeline cacheado, sin duplicar por id.
 * Función pura (sin React) para poder testear la lógica de forma determinista.
 */
export function insertarTweetEnTimeline(
  prev: TimelineData | undefined,
  tweet: TweetView,
): TimelineData | undefined {
  if (!prev) return prev;

  const yaExiste = prev.pages.some((p) => p.tweets.some((t) => t.id === tweet.id));
  if (yaExiste) return prev;

  const [primera, ...resto] = prev.pages;
  if (!primera) return prev;

  const nuevaPrimera: TweetPage = { ...primera, tweets: [tweet, ...primera.tweets] };
  return { ...prev, pages: [nuevaPrimera, ...resto] };
}

/**
 * Se suscribe al stream SSE del backend (GET /realtime/stream) y, cuando llega
 * un tweet visible para el viewer, lo inserta al instante al principio del
 * timeline en la caché de React Query —sin recargar la página—. El navegador
 * reconecta solo ante caídas; cerramos la conexión al desmontar.
 */
export function useRealtimeTimeline(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const source = new EventSource(`${API_BASE}/realtime/stream`, { withCredentials: true });

    source.onmessage = (event: MessageEvent<string>) => {
      let tweet: TweetView;
      try {
        tweet = JSON.parse(event.data) as TweetView;
      } catch {
        return;
      }
      queryClient.setQueryData<TimelineData>(["timeline"], (prev) =>
        insertarTweetEnTimeline(prev, tweet),
      );
    };

    return () => source.close();
  }, [queryClient]);
}
