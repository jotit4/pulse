import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { mockResponse, buildFetchMock } from "../helpers/fetch-mock";

// ---------------------------------------------------------------------------
// Stub de IntersectionObserver (no existe en jsdom)
// ---------------------------------------------------------------------------

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

const mockTweet = {
  id: "tweet-modal-1",
  content: "Tweet desde el modal",
  createdAt: new Date().toISOString(),
  author: {
    id: "user-1",
    username: "ana",
    name: "Ana García",
    avatarUrl: null,
  },
  likesCount: 0,
  likedByMe: false,
};

const emptyTimeline = { tweets: [], nextCursor: null };

// ---------------------------------------------------------------------------
// Helper de render — AppLayout completo (NavBar con el botón "Postear")
// ---------------------------------------------------------------------------

function renderApp(fetchMock?: ReturnType<typeof vi.fn>) {
  if (fetchMock) vi.stubGlobal("fetch", fetchMock);

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
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("ComposeModal — modal de composición de tweet", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("el modal no está visible inicialmente", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/explore": [mockResponse(emptyTimeline)],
        "/timeline": [mockResponse(emptyTimeline)],
        "/users/suggestions": [mockResponse({ users: [] })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
      }),
    );

    renderApp();

    // Esperar a que cargue la app
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Postear" })).toBeInTheDocument();
    });

    // El diálogo no debe estar presente
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("el botón Postear del sidebar abre el modal", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/explore": [mockResponse(emptyTimeline)],
        "/timeline": [mockResponse(emptyTimeline)],
        "/users/suggestions": [mockResponse({ users: [] })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
      }),
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Postear" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Postear" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Componer tweet" })).toBeInTheDocument();
    });

    // El textarea con placeholder correcto debe estar presente
    expect(screen.getByPlaceholderText("¿Qué está pasando?")).toBeInTheDocument();
  });

  it("el botón X del header cierra el modal", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/explore": [mockResponse(emptyTimeline)],
        "/timeline": [mockResponse(emptyTimeline)],
        "/users/suggestions": [mockResponse({ users: [] })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
      }),
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Postear" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Postear" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cerrar modal" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("el botón Postear del modal está deshabilitado con textarea vacío", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/explore": [mockResponse(emptyTimeline)],
        "/timeline": [mockResponse(emptyTimeline)],
        "/users/suggestions": [mockResponse({ users: [] })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
      }),
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Postear" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Postear" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Hay dos botones "Postear" cuando el modal está abierto:
    // el del sidebar y el del modal. Buscamos el de submit (type=submit dentro del dialog).
    const dialog = screen.getByRole("dialog");
    const submitBtn = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).toBeDisabled();
  });

  it("escribir en el textarea actualiza el contador de caracteres", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/explore": [mockResponse(emptyTimeline)],
        "/timeline": [mockResponse(emptyTimeline)],
        "/users/suggestions": [mockResponse({ users: [] })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
      }),
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Postear" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Postear" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Scoped al dialog para evitar ambigüedad con el TweetComposer de HomePage
    const dialog = screen.getByRole("dialog");
    const textarea = dialog.querySelector("textarea") as HTMLTextAreaElement;
    await user.type(textarea, "Hola mundo");

    expect(screen.getByText("10/280")).toBeInTheDocument();
  });

  it("postear con éxito cierra el modal y limpia el texto", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          "/auth/me": [mockResponse({ user: mockUser })],
          "/explore": [mockResponse(emptyTimeline), mockResponse(emptyTimeline)],
          "/timeline": [mockResponse(emptyTimeline), mockResponse(emptyTimeline)],
          "/users/suggestions": [mockResponse({ users: [] })],
          "/notifications/unread-count": [mockResponse({ count: 0 })],
        },
        (url, init) => {
          if (url.includes("/tweets") && (init?.method ?? "GET") === "POST") {
            return mockResponse({ tweet: mockTweet }, 201);
          }
          return null;
        },
      ),
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Postear" })).toBeInTheDocument();
    });

    // Abrir modal
    await user.click(screen.getByRole("button", { name: "Postear" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Escribir contenido — scoped al dialog para evitar ambigüedad con TweetComposer
    const dialog = screen.getByRole("dialog");
    const textarea = dialog.querySelector("textarea") as HTMLTextAreaElement;
    await user.type(textarea, "Tweet desde el modal");

    // Enviar — click en el botón Postear dentro del dialog
    const submitBtn = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    // El modal debe cerrarse
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("Escape cierra el modal", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/explore": [mockResponse(emptyTimeline)],
        "/timeline": [mockResponse(emptyTimeline)],
        "/users/suggestions": [mockResponse({ users: [] })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
      }),
    );

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Postear" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Postear" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
