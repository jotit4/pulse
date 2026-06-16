import { useTimeline } from "@/hooks/useTimeline";
import { useRealtimeTimeline } from "@/hooks/useRealtimeTimeline";
import { TweetComposer } from "@/components/tweet/TweetComposer";
import { TweetList } from "@/components/tweet/TweetList";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/** Página de inicio: compositor + timeline con infinite scroll. */
export function HomePage() {
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useTimeline();

  // Suscripción SSE: los tweets nuevos se insertan al instante en el timeline.
  useRealtimeTimeline();

  return (
    <div className="mx-auto max-w-xl">
      {/* Encabezado fijo de la página */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur-sm px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Inicio</h1>
      </header>

      {/* Compositor de tweets */}
      <TweetComposer />

      {/* Estado de carga inicial */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {/* Estado de error */}
      {isError && (
        <div className="px-4 py-6">
          <ErrorMessage
            message={error instanceof Error ? error.message : "Error al cargar el timeline"}
          />
        </div>
      )}

      {/* Lista de tweets */}
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
