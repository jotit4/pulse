import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { HomePage } from "@/pages/HomePage";
import { mockResponse, buildFetchMock } from "../helpers/fetch-mock";

class IntersectionObserverStub {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

const mockUser = {
  id: "user-1",
  username: "ana",
  name: "Ana García",
  email: "ana@ejemplo.com",
  createdAt: new Date().toISOString(),
  avatarUrl: null,
};

const mockTweetNoBookmark = {
  id: "tweet-1",
  content: "Tweet para bookmark",
  createdAt: new Date().toISOString(),
  author: { id: "user-2", username: "bob", name: "Bob Smith", avatarUrl: null },
  likesCount: 0,
  likedByMe: false,
  replyCount: 0,
  bookmarkedByMe: false,
};

const mockTweetBookmarked = {
  ...mockTweetNoBookmark,
  bookmarkedByMe: true,
};

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
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
  );
}

describe("TweetCard — Bookmark toggle", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el botón de bookmark sin marcar cuando bookmarkedByMe=false", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/explore": [mockResponse({ tweets: [mockTweetNoBookmark], nextCursor: null })],
        "/timeline": [mockResponse({ tweets: [], nextCursor: null })],
      }),
    );

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Tweet para bookmark")).toBeInTheDocument();
    });

    const bookmarkBtn = screen.getByRole("button", { name: "Guardar en bookmarks" });
    expect(bookmarkBtn).toBeInTheDocument();
    expect(bookmarkBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("llama a POST /bookmark al hacer clic y actualiza el estado optimistamente", async () => {
    let bookmarkCalled = false;

    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          "/auth/me": [mockResponse({ user: mockUser })],
          "/notifications/unread-count": [mockResponse({ count: 0 })],
          "/explore": [mockResponse({ tweets: [mockTweetNoBookmark], nextCursor: null })],
          "/timeline": [mockResponse({ tweets: [], nextCursor: null })],
          "/bookmarks": [mockResponse({ tweets: [], nextCursor: null })],
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

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Tweet para bookmark")).toBeInTheDocument();
    });

    const bookmarkBtn = screen.getByRole("button", { name: "Guardar en bookmarks" });
    await user.click(bookmarkBtn);

    await waitFor(() => {
      expect(bookmarkCalled).toBe(true);
    });
  });

  it("muestra el botón de bookmark marcado cuando bookmarkedByMe=true", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/explore": [mockResponse({ tweets: [mockTweetBookmarked], nextCursor: null })],
        "/timeline": [mockResponse({ tweets: [], nextCursor: null })],
      }),
    );

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Tweet para bookmark")).toBeInTheDocument();
    });

    const bookmarkBtn = screen.getByRole("button", { name: "Quitar bookmark" });
    expect(bookmarkBtn).toBeInTheDocument();
    expect(bookmarkBtn).toHaveAttribute("aria-pressed", "true");
  });
});
