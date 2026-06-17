import { useState } from "react";
import { Link } from "react-router";
import { useTimeline } from "@/hooks/useTimeline";
import { useExploreFeed } from "@/hooks/useExploreFeed";
import { useRealtimeTimeline } from "@/hooks/useRealtimeTimeline";
import { TweetComposer } from "@/components/tweet/TweetComposer";
import { TweetList } from "@/components/tweet/TweetList";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Button } from "@/components/ui/Button";

type Tab = "para-ti" | "siguiendo";

/** Estado vacío del tab "Siguiendo" — guía al usuario a encontrar contenido. */
function SiguiendoVacio({ onParaTi }: { onParaTi: () => void }) {
  return (
    <div className="px-6 py-12 text-center">
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--color-x-text)" }}>
        Bienvenido a Pulse
      </h2>
      <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "var(--color-x-muted)" }}>
        Cuando sigas gente, sus tweets aparecerán acá. Por ahora explorá el feed global.
      </p>
      <div className="flex justify-center gap-3 flex-wrap">
        <Button variant="primary" onClick={onParaTi}>
          Ver "Para ti"
        </Button>
        <Link to="/search">
          <Button variant="outline">Buscar usuarios</Button>
        </Link>
      </div>
    </div>
  );
}

/** Tab "Para ti": feed global de tweets recientes (explore). */
function TabParaTi() {
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useExploreFeed();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-6">
        <ErrorMessage
          message={error instanceof Error ? error.message : "Error al cargar el feed"}
        />
      </div>
    );
  }

  if (data) {
    return (
      <TweetList
        data={data}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    );
  }

  return null;
}

/** Tab "Siguiendo": timeline personal con SSE real-time. */
function TabSiguiendo({ onSwitchParaTi }: { onSwitchParaTi: () => void }) {
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useTimeline();

  useRealtimeTimeline();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-6">
        <ErrorMessage
          message={error instanceof Error ? error.message : "Error al cargar el timeline"}
        />
      </div>
    );
  }

  if (data) {
    const tweets = data.pages.flatMap((page) => page.tweets);
    if (tweets.length === 0 && !hasNextPage) {
      return <SiguiendoVacio onParaTi={onSwitchParaTi} />;
    }

    return (
      <TweetList
        data={data}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    );
  }

  return null;
}

/** Página de inicio: compositor + tabs "Para ti" / "Siguiendo". */
export function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("para-ti");

  return (
    <div>
      {/* Header sticky con tabs accesibles */}
      <header
        className="sticky top-0 z-10"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-x-bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-x-border)",
        }}
      >
        <div role="tablist" aria-label="Tabs del inicio" className="flex">
          <button
            id="tab-para-ti"
            role="tab"
            aria-selected={activeTab === "para-ti"}
            aria-controls="tabpanel-para-ti"
            onClick={() => setActiveTab("para-ti")}
            className="flex-1 py-4 text-sm font-bold transition-colors relative"
            style={{
              color: activeTab === "para-ti" ? "var(--color-x-text)" : "var(--color-x-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Para ti
            {activeTab === "para-ti" && (
              <span
                className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
                style={{ backgroundColor: "var(--color-x-brand)" }}
                aria-hidden="true"
              />
            )}
          </button>

          <button
            id="tab-siguiendo"
            role="tab"
            aria-selected={activeTab === "siguiendo"}
            aria-controls="tabpanel-siguiendo"
            onClick={() => setActiveTab("siguiendo")}
            className="flex-1 py-4 text-sm font-bold transition-colors relative"
            style={{
              color: activeTab === "siguiendo" ? "var(--color-x-text)" : "var(--color-x-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Siguiendo
            {activeTab === "siguiendo" && (
              <span
                className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
                style={{ backgroundColor: "var(--color-x-brand)" }}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </header>

      {/* Compositor de tweets (siempre visible) */}
      <TweetComposer />

      {/* Paneles de tabs */}
      <div
        id="tabpanel-para-ti"
        role="tabpanel"
        aria-labelledby="tab-para-ti"
        hidden={activeTab !== "para-ti"}
      >
        {activeTab === "para-ti" && <TabParaTi />}
      </div>

      <div
        id="tabpanel-siguiendo"
        role="tabpanel"
        aria-labelledby="tab-siguiendo"
        hidden={activeTab !== "siguiendo"}
      >
        {activeTab === "siguiendo" && (
          <TabSiguiendo onSwitchParaTi={() => setActiveTab("para-ti")} />
        )}
      </div>
    </div>
  );
}
