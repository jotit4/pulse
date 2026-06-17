import { useTimeline } from "@/hooks/useTimeline";
import { useRealtimeTimeline } from "@/hooks/useRealtimeTimeline";
import { TweetComposer } from "@/components/tweet/TweetComposer";
import { TweetList } from "@/components/tweet/TweetList";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/** Pagina de inicio: compositor + timeline con infinite scroll. */
export function HomePage() {
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useTimeline();

  useRealtimeTimeline();

  return (
    <div>
      <header
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-x-bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-x-border)",
        }}
      >
        <h1 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
          Inicio
        </h1>
      </header>

      <TweetComposer />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="px-4 py-6">
          <ErrorMessage
            message={error instanceof Error ? error.message : "Error al cargar el timeline"}
          />
        </div>
      )}

      {data && (
        <TweetList
          data={data}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      )}
    </div>
  );
}
