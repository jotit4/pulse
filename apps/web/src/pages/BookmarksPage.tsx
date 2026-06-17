import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage } from "@pulse/shared";
import { useBookmarks } from "@/hooks/useBookmarks";
import { TweetList } from "@/components/tweet/TweetList";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

export function BookmarksPage() {
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useBookmarks();

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
          Bookmarks
        </h1>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="px-4 py-8">
          <ErrorMessage message={(error as Error).message} />
        </div>
      )}

      {data && (
        <TweetList
          data={data as InfiniteData<TweetPage>}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      )}
    </div>
  );
}
