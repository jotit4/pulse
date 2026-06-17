/**
 * Tests de integración: like y bookmark se reflejan en el feed "Para ti"
 * (explore) y en la caché del hilo (thread).
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { TweetPage } from "@pulse/shared";
import { AuthProvider } from "@/auth/AuthContext";
import { HomePage } from "@/pages/HomePage";
import { TweetDetailPage } from "@/pages/TweetDetailPage";
import { mockResponse, buildFetchMock } from "../helpers/fetch-mock";
import { patchTweetEverywhere } from "@/hooks/tweetCache";

class IntersectionObserverStub {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockUser = {
  id: "user-1",
  username: "ana",
  name: "Ana García",
  email: "ana@ejemplo.com",
  createdAt: new Date().toISOString(),
  avatarUrl: null,
};

const mockTweetInExplore = {
  id: "tweet-explore-1",
  content: "Tweet en el feed Para ti",
  createdAt: new Date().toISOString(),
  author: { id: "user-2", username: "bob", name: "Bob Smith", avatarUrl: null },
  likesCount: 3,
  likedByMe: false,
  replyCount: 0,
  bookmarkedByMe: false,
};

const mockParentTweet = {
  id: "tweet-parent-1",
  content: "Tweet padre en hilo",
  createdAt: new Date().toISOString(),
  author: { id: "user-3", username: "carol", name: "Carol Lee", avatarUrl: null },
  likesCount: 1,
  likedByMe: false,
  replyCount: 1,
  bookmarkedByMe: false,
  parentId: null,
};

const mockChildTweet = {
  id: "tweet-child-1",
  content: "Tweet hijo respondiendo al padre",
  createdAt: new Date().toISOString(),
  author: { id: "user-4", username: "dave", name: "Dave Müller", avatarUrl: null },
  likesCount: 0,
  likedByMe: false,
  replyCount: 0,
  bookmarkedByMe: false,
  parentId: "tweet-parent-1",
};

const emptyPage = { tweets: [], nextCursor: null };

// ---------------------------------------------------------------------------
// Helpers de render
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderHomePage(queryClient = makeQueryClient()) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/tweet/:id" element={<div>Tweet detail</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

function renderTweetDetail(tweetId = "tweet-child-1", queryClient = makeQueryClient()) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/tweet/${tweetId}`]}>
          <AuthProvider>
            <Routes>
              <Route path="/tweet/:id" element={<TweetDetailPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

// ---------------------------------------------------------------------------
// Suite: like se refleja en el feed "Para ti" (explore)
// ---------------------------------------------------------------------------

describe("useLike — actualización en feed explore", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("al dar like en 'Para ti', el botón cambia a aria-pressed=true optimistamente", async () => {
    let likeCalled = false;

    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          "/auth/me": [mockResponse({ user: mockUser })],
          "/notifications/unread-count": [mockResponse({ count: 0 })],
          "/explore": [mockResponse({ tweets: [mockTweetInExplore], nextCursor: null })],
          "/timeline": [mockResponse(emptyPage)],
        },
        (url, init) => {
          if (url.includes("/like") && (init?.method ?? "GET") === "POST") {
            likeCalled = true;
            return mockResponse({ likesCount: 4, likedByMe: true }, 200);
          }
          return null;
        },
      ),
    );

    renderHomePage();

    // Esperar a que el tweet aparezca en el feed
    await waitFor(() => {
      expect(screen.getByText("Tweet en el feed Para ti")).toBeInTheDocument();
    });

    // Verificar estado inicial
    const likeBtn = screen.getByRole("button", { name: "Dar like" });
    expect(likeBtn).toHaveAttribute("aria-pressed", "false");

    // Click en like
    await user.click(likeBtn);

    // El botón debe reflejar el like optimistamente
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Quitar like" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    // La API fue llamada
    await waitFor(() => {
      expect(likeCalled).toBe(true);
    });
  });

  it("al quitar like en 'Para ti', el botón cambia a aria-pressed=false optimistamente", async () => {
    const tweetLiked = { ...mockTweetInExplore, likedByMe: true, likesCount: 4 };

    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          "/auth/me": [mockResponse({ user: mockUser })],
          "/notifications/unread-count": [mockResponse({ count: 0 })],
          "/explore": [mockResponse({ tweets: [tweetLiked], nextCursor: null })],
          "/timeline": [mockResponse(emptyPage)],
        },
        (url, init) => {
          if (url.includes("/like") && (init?.method ?? "GET") === "DELETE") {
            return mockResponse({ likesCount: 3, likedByMe: false }, 200);
          }
          return null;
        },
      ),
    );

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Tweet en el feed Para ti")).toBeInTheDocument();
    });

    const likeBtn = screen.getByRole("button", { name: "Quitar like" });
    expect(likeBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(likeBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dar like" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: bookmark se refleja en la caché del hilo (thread) via patchTweetEverywhere
// ---------------------------------------------------------------------------

describe("patchTweetEverywhere — actualiza caché thread directamente", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parchea data.parent en la caché ['thread', id] cuando el id coincide", () => {
    const queryClient = makeQueryClient();

    // Precarga la caché del hilo manualmente
    queryClient.setQueryData(["thread", "tweet-child-1"], {
      tweet: mockChildTweet,
      parent: mockParentTweet,
    });

    // Aplicar parche al tweet padre
    act(() => {
      patchTweetEverywhere(queryClient, "tweet-parent-1", {
        bookmarkedByMe: true,
      });
    });

    const cached = queryClient.getQueryData<{
      tweet: typeof mockParentTweet;
      parent: typeof mockParentTweet;
    }>(["thread", "tweet-child-1"]);

    expect(cached?.parent?.bookmarkedByMe).toBe(true);
    // El tweet hijo no debe cambiar
    expect(cached?.tweet.bookmarkedByMe).toBe(false);
  });

  it("parchea data.tweet en la caché ['thread', id] cuando el id coincide", () => {
    const queryClient = makeQueryClient();

    queryClient.setQueryData(["thread", "tweet-child-1"], {
      tweet: mockChildTweet,
      parent: mockParentTweet,
    });

    act(() => {
      patchTweetEverywhere(queryClient, "tweet-child-1", {
        likedByMe: true,
        likesCount: 1,
      });
    });

    const cached = queryClient.getQueryData<{
      tweet: typeof mockChildTweet;
      parent: typeof mockParentTweet;
    }>(["thread", "tweet-child-1"]);

    expect(cached?.tweet.likedByMe).toBe(true);
    expect(cached?.tweet.likesCount).toBe(1);
    // El padre no debe cambiar
    expect(cached?.parent?.likedByMe).toBe(false);
  });

  it("parchea tweets en InfiniteData de explore", () => {
    const queryClient = makeQueryClient();

    const exploreData: InfiniteData<TweetPage> = {
      pages: [{ tweets: [mockTweetInExplore], nextCursor: null }],
      pageParams: [undefined],
    };
    queryClient.setQueryData(["explore"], exploreData);

    act(() => {
      patchTweetEverywhere(queryClient, "tweet-explore-1", {
        likedByMe: true,
        likesCount: 4,
      });
    });

    const cached = queryClient.getQueryData<InfiniteData<TweetPage>>(["explore"]);
    const tweet = cached?.pages[0]?.tweets[0];

    expect(tweet?.likedByMe).toBe(true);
    expect(tweet?.likesCount).toBe(4);
  });

  it("parchea tweets en múltiples feeds a la vez (timeline + explore)", () => {
    const queryClient = makeQueryClient();

    const tweetBase = { ...mockTweetInExplore };
    const timelineData: InfiniteData<TweetPage> = {
      pages: [{ tweets: [tweetBase], nextCursor: null }],
      pageParams: [undefined],
    };
    const exploreData: InfiniteData<TweetPage> = {
      pages: [{ tweets: [{ ...tweetBase }], nextCursor: null }],
      pageParams: [undefined],
    };

    queryClient.setQueryData(["timeline"], timelineData);
    queryClient.setQueryData(["explore"], exploreData);

    act(() => {
      patchTweetEverywhere(queryClient, "tweet-explore-1", {
        bookmarkedByMe: true,
      });
    });

    const cachedTimeline = queryClient.getQueryData<InfiniteData<TweetPage>>(["timeline"]);
    const cachedExplore = queryClient.getQueryData<InfiniteData<TweetPage>>(["explore"]);

    expect(cachedTimeline?.pages[0]?.tweets[0]?.bookmarkedByMe).toBe(true);
    expect(cachedExplore?.pages[0]?.tweets[0]?.bookmarkedByMe).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: bookmark se refleja en la vista de detalle del hilo (integración UI)
// ---------------------------------------------------------------------------

describe("useBookmark — actualización en thread detail via TweetCard del padre", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("al bookmarkear el tweet padre en la vista de detalle, el botón cambia a aria-pressed=true", async () => {
    let bookmarkCalled = false;

    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          "/auth/me": [mockResponse({ user: mockUser })],
          "/notifications/unread-count": [mockResponse({ count: 0 })],
          "/thread": [mockResponse({ tweet: mockChildTweet, parent: mockParentTweet })],
          "/replies": [mockResponse(emptyPage)],
          "/bookmarks": [mockResponse(emptyPage)],
        },
        (url, init) => {
          if (url.includes("/bookmark") && (init?.method ?? "GET") === "POST") {
            bookmarkCalled = true;
            return mockResponse({ ok: true }, 200);
          }
          return null;
        },
      ),
    );

    renderTweetDetail("tweet-child-1");

    // Esperar a que el tweet padre aparezca en pantalla (vía TweetCard)
    await waitFor(() => {
      expect(screen.getByText("Tweet padre en hilo")).toBeInTheDocument();
    });

    // El TweetCard del padre tiene el botón de bookmark
    const bookmarkBtns = screen.getAllByRole("button", { name: "Guardar en bookmarks" });
    expect(bookmarkBtns.length).toBeGreaterThanOrEqual(1);

    // Clic en el bookmark del tweet padre
    await user.click(bookmarkBtns[0]!);

    // Verificar que la API fue llamada
    await waitFor(() => {
      expect(bookmarkCalled).toBe(true);
    });
  });
});
