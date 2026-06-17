import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { HomePage } from "@/pages/HomePage";
import { RightAside } from "@/components/layout/RightAside";
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
  bio: "",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const mockTweet = {
  id: "tweet-explore-1",
  content: "Tweet del feed global",
  createdAt: new Date().toISOString(),
  author: {
    id: "user-2",
    username: "bob",
    name: "Bob López",
    avatarUrl: null,
  },
  likesCount: 0,
  likedByMe: false,
};

const emptyPage = { tweets: [], nextCursor: null };
const exploreConTweet = { tweets: [mockTweet], nextCursor: null };

const sugerencias = [
  {
    id: "user-sugg-1",
    username: "carlos",
    name: "Carlos Ruiz",
    bio: "Dev",
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    isFollowing: false,
  },
  {
    id: "user-sugg-2",
    username: "diana",
    name: "Diana Paz",
    bio: "",
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    isFollowing: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers de render
// ---------------------------------------------------------------------------

function renderHomePage(fetchMock?: ReturnType<typeof vi.fn>) {
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
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<div>Búsqueda</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderRightAside(fetchMock?: ReturnType<typeof vi.fn>) {
  if (fetchMock) vi.stubGlobal("fetch", fetchMock);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <RightAside />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Suite: tabs de HomePage
// ---------------------------------------------------------------------------

describe("HomePage — tabs Para ti / Siguiendo", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("el tab 'Para ti' es el activo por defecto y muestra el feed de explore", async () => {
    const fetchMock = buildFetchMock({
      "/auth/me": [mockResponse({ user: mockUser })],
      "/explore": [mockResponse(exploreConTweet)],
      "/timeline": [mockResponse(emptyPage)],
    });
    renderHomePage(fetchMock);

    // El tablist debe existir con los dos tabs
    await waitFor(() => {
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    const tabParaTi = screen.getByRole("tab", { name: "Para ti" });
    const tabSiguiendo = screen.getByRole("tab", { name: "Siguiendo" });

    expect(tabParaTi).toHaveAttribute("aria-selected", "true");
    expect(tabSiguiendo).toHaveAttribute("aria-selected", "false");

    // El tweet del feed global debe aparecer
    await waitFor(() => {
      expect(screen.getByText("Tweet del feed global")).toBeInTheDocument();
    });
  });

  it("al hacer click en 'Siguiendo' cambia el tab activo", async () => {
    const fetchMock = buildFetchMock({
      "/auth/me": [mockResponse({ user: mockUser })],
      "/explore": [mockResponse(emptyPage)],
      "/timeline": [mockResponse(emptyPage)],
    });
    renderHomePage(fetchMock);

    await waitFor(() => {
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    const tabSiguiendo = screen.getByRole("tab", { name: "Siguiendo" });
    await user.click(tabSiguiendo);

    expect(tabSiguiendo).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Para ti" })).toHaveAttribute("aria-selected", "false");
  });

  it("el empty state de Siguiendo muestra el botón 'Ver Para ti'", async () => {
    const fetchMock = buildFetchMock({
      "/auth/me": [mockResponse({ user: mockUser })],
      "/explore": [mockResponse(emptyPage)],
      "/timeline": [mockResponse(emptyPage)],
    });
    renderHomePage(fetchMock);

    await waitFor(() => {
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    // Cambiar al tab Siguiendo
    await user.click(screen.getByRole("tab", { name: "Siguiendo" }));

    // El empty state debe mostrarse (parte del texto)
    await waitFor(() => {
      expect(screen.getByText(/Cuando sigas gente/)).toBeInTheDocument();
    });

    // El botón de acción debe estar disponible
    expect(screen.getByRole("button", { name: /Ver.*Para ti/ })).toBeInTheDocument();
  });

  it("el botón 'Ver Para ti' del empty state vuelve al tab correcto", async () => {
    const fetchMock = buildFetchMock({
      "/auth/me": [mockResponse({ user: mockUser })],
      "/explore": [mockResponse(emptyPage)],
      "/timeline": [mockResponse(emptyPage)],
    });
    renderHomePage(fetchMock);

    await waitFor(() => {
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Siguiendo" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Ver.*Para ti/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Ver.*Para ti/ }));

    expect(screen.getByRole("tab", { name: "Para ti" })).toHaveAttribute("aria-selected", "true");
  });
});

// ---------------------------------------------------------------------------
// Suite: sidebar de sugeridos (RightAside)
// ---------------------------------------------------------------------------

describe("RightAside — sugerencias de usuarios", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra los usuarios sugeridos con botón Seguir", async () => {
    const fetchMock = buildFetchMock({
      "/auth/me": [mockResponse({ user: mockUser })],
      "/users/suggestions": [mockResponse({ users: sugerencias })],
    });
    renderRightAside(fetchMock);

    // Los nombres de los usuarios deben aparecer
    await waitFor(() => {
      expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
    });

    expect(screen.getByText("Diana Paz")).toBeInTheDocument();

    // Ambos deben tener botón Seguir
    const botonesSeguir = screen.getAllByRole("button", { name: "Seguir" });
    expect(botonesSeguir.length).toBeGreaterThanOrEqual(2);
  });

  it("no muestra la sección si no hay sugerencias", async () => {
    const fetchMock = buildFetchMock({
      "/auth/me": [mockResponse({ user: mockUser })],
      "/users/suggestions": [mockResponse({ users: [] })],
    });
    renderRightAside(fetchMock);

    // Esperar a que la query termine
    await waitFor(() => {
      expect(screen.queryByText("A quién seguir")).not.toBeInTheDocument();
    });
  });
});
