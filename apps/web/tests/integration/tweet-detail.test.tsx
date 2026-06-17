import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { TweetDetailPage } from "@/pages/TweetDetailPage";
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

const mockTweet = {
  id: "tweet-1",
  content: "Tweet de detalle",
  createdAt: new Date().toISOString(),
  author: { id: "user-2", username: "bob", name: "Bob Smith", avatarUrl: null },
  likesCount: 5,
  likedByMe: false,
  replyCount: 2,
  bookmarkedByMe: false,
  parentId: null,
};

const mockParent = {
  id: "tweet-0",
  content: "Tweet padre original",
  createdAt: new Date().toISOString(),
  author: { id: "user-3", username: "carol", name: "Carol Lee", avatarUrl: null },
  likesCount: 3,
  likedByMe: false,
  replyCount: 1,
  bookmarkedByMe: false,
  parentId: null,
};

const mockReply = {
  id: "tweet-2",
  content: "Una respuesta al tweet",
  createdAt: new Date().toISOString(),
  author: { id: "user-4", username: "dave", name: "Dave Müller", avatarUrl: null },
  likesCount: 0,
  likedByMe: false,
  replyCount: 0,
  bookmarkedByMe: false,
  parentId: "tweet-1",
};

const emptyReplies = { tweets: [], nextCursor: null };

function renderTweetDetail(tweetId = "tweet-1") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tweet/${tweetId}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/tweet/:id" element={<TweetDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TweetDetailPage — integración", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza el tweet principal en grande", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/thread": [mockResponse({ tweet: mockTweet, parent: null })],
        "/replies": [mockResponse(emptyReplies)],
      }),
    );

    renderTweetDetail();

    await waitFor(() => {
      expect(screen.getByText("Tweet de detalle")).toBeInTheDocument();
    });

    // El contenido del tweet debe estar en el componente de detalle (texto grande)
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("@bob")).toBeInTheDocument();
  });

  it("renderiza el tweet padre cuando existe", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/thread": [mockResponse({ tweet: mockTweet, parent: mockParent })],
        "/replies": [mockResponse(emptyReplies)],
      }),
    );

    renderTweetDetail();

    await waitFor(() => {
      expect(screen.getByText("Tweet padre original")).toBeInTheDocument();
    });
  });

  it("renderiza las respuestas del tweet", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/thread": [mockResponse({ tweet: mockTweet, parent: null })],
        "/replies": [mockResponse({ tweets: [mockReply], nextCursor: null })],
      }),
    );

    renderTweetDetail();

    await waitFor(() => {
      expect(screen.getByText("Una respuesta al tweet")).toBeInTheDocument();
    });
  });

  it("muestra el compositor de respuesta para usuario autenticado", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/thread": [mockResponse({ tweet: mockTweet, parent: null })],
        "/replies": [mockResponse(emptyReplies)],
      }),
    );

    renderTweetDetail();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Respondé este tweet…")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Responder" })).toBeInTheDocument();
  });

  it("envía una respuesta al tweet correctamente", async () => {
    let replyCalled = false;

    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          "/auth/me": [mockResponse({ user: mockUser })],
          "/notifications/unread-count": [mockResponse({ count: 0 })],
          "/thread": [mockResponse({ tweet: mockTweet, parent: null })],
          "/replies": [mockResponse(emptyReplies), mockResponse(emptyReplies)],
        },
        (url, init) => {
          if (url.includes("/reply") && (init?.method ?? "GET") === "POST") {
            replyCalled = true;
            return mockResponse(
              {
                tweet: {
                  ...mockTweet,
                  id: "tweet-new",
                  content: "Mi respuesta",
                  parentId: "tweet-1",
                },
              },
              201,
            );
          }
          return null;
        },
      ),
    );

    renderTweetDetail();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Respondé este tweet…")).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText("Contenido de la respuesta");
    await user.type(textarea, "Mi respuesta");

    const responderBtn = screen.getByRole("button", { name: "Responder" });
    expect(responderBtn).not.toBeDisabled();
    await user.click(responderBtn);

    await waitFor(() => {
      expect(replyCalled).toBe(true);
    });

    // El textarea debe limpiarse tras enviar
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });
});
