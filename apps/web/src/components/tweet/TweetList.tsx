import { useEffect, useRef } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage } from "@pulse/shared";
import { TweetCard } from "./TweetCard";
import { Spinner } from "@/components/ui/Spinner";

interface TweetListProps {
  // Aceptamos 'unknown' como tipo de pageParam para coincidir con la inferencia de TanStack Query v5
  data: InfiniteData<TweetPage>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/** Lista de tweets con infinite scroll por IntersectionObserver. */
export function TweetList({
  data,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: TweetListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver que carga la siguiente página al llegar al final
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const tweets = data.pages.flatMap((page) => page.tweets);

  if (tweets.length === 0 && !hasNextPage) {
    return (
      <div className="px-4 py-12 text-center text-gray-500 text-sm">
        <p>No hay tweets todavía.</p>
        <p className="mt-1">¡Sé el primero en publicar algo!</p>
      </div>
    );
  }

  return (
    <div>
      {tweets.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}

      {/* Sentinel para el infinite scroll */}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />

      {/* Spinner de carga de siguiente página */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {/* Mensaje final cuando no hay más */}
      {!hasNextPage && tweets.length > 0 && (
        <p className="py-6 text-center text-sm text-gray-400">Ya viste todo por ahora.</p>
      )}
    </div>
  );
}
