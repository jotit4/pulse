import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { NotificationsPage } from "@/pages/NotificationsPage";
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

const mockActor = {
  id: "user-2",
  username: "bob",
  name: "Bob Smith",
  email: "bob@ejemplo.com",
  createdAt: new Date().toISOString(),
  avatarUrl: null,
};

const mockTweet = {
  id: "tweet-1",
  content: "Hola mundo desde Pulse",
  createdAt: new Date().toISOString(),
  author: { id: "user-1", username: "ana", name: "Ana García", avatarUrl: null },
  likesCount: 1,
  likedByMe: false,
  replyCount: 0,
  bookmarkedByMe: false,
};

const emptyNotifications = { notifications: [], nextCursor: null };

function makeNotification(type: "follow" | "like" | "reply", withTweet = false) {
  return {
    id: `notif-${type}`,
    type,
    actor: mockActor,
    tweet: withTweet ? mockTweet : null,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

function renderNotificationsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/notifications"]}>
        <AuthProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NotificationsPage — integración", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra mensaje vacío cuando no hay notificaciones", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/notifications/read": [mockResponse({ ok: true })],
        "/notifications": [mockResponse(emptyNotifications)],
      }),
    );

    renderNotificationsPage();

    await waitFor(() => {
      expect(screen.getByText("No tenés notificaciones todavía.")).toBeInTheDocument();
    });
  });

  it("renderiza notificación de tipo 'follow'", async () => {
    const notif = makeNotification("follow");
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 1 })],
        "/notifications/read": [mockResponse({ ok: true })],
        "/notifications": [mockResponse({ notifications: [notif], nextCursor: null })],
      }),
    );

    renderNotificationsPage();

    await waitFor(() => {
      expect(screen.getByText("te empezó a seguir")).toBeInTheDocument();
      expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    });
  });

  it("renderiza notificación de tipo 'like' con preview del tweet", async () => {
    const notif = makeNotification("like", true);
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 1 })],
        "/notifications/read": [mockResponse({ ok: true })],
        "/notifications": [mockResponse({ notifications: [notif], nextCursor: null })],
      }),
    );

    renderNotificationsPage();

    await waitFor(() => {
      expect(screen.getByText("le gustó tu tweet")).toBeInTheDocument();
      expect(screen.getByText("Hola mundo desde Pulse")).toBeInTheDocument();
    });
  });

  it("renderiza notificación de tipo 'reply'", async () => {
    const notif = makeNotification("reply", true);
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 1 })],
        "/notifications/read": [mockResponse({ ok: true })],
        "/notifications": [mockResponse({ notifications: [notif], nextCursor: null })],
      }),
    );

    renderNotificationsPage();

    await waitFor(() => {
      expect(screen.getByText("respondió tu tweet")).toBeInTheDocument();
    });
  });
});
