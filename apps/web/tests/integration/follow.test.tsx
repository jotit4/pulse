import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { ProfilePage } from "@/pages/ProfilePage";
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

/** Usuario autenticado (el que está logueado). */
const mockCurrentUser = {
  id: "user-1",
  username: "ana",
  name: "Ana García",
  email: "ana@ejemplo.com",
  bio: "",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

/** Perfil del usuario que se visita. */
const mockProfileUser = {
  id: "user-2",
  username: "bob",
  name: "Bob López",
  bio: "Desarrollador apasionado",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  followersCount: 5,
  followingCount: 3,
  tweetsCount: 2,
  isFollowing: false,
};

/** Perfil de bob ya seguido (después del POST). */
const mockProfileUserSiguiendo = {
  ...mockProfileUser,
  isFollowing: true,
  followersCount: 6,
};

/** Página vacía de tweets. */
const emptyTweets = { tweets: [], nextCursor: null };

// ---------------------------------------------------------------------------
// Helper de render
// ---------------------------------------------------------------------------

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/bob"]}>
        <AuthProvider>
          <Routes>
            <Route path="/:username" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("ProfilePage — follow (integración)", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el perfil de usuario correctamente", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        // Orden: los más específicos primero para evitar falsos matches
        "/auth/me": [mockResponse({ user: mockCurrentUser })],
        "/users/bob/tweets": [mockResponse(emptyTweets)],
        "/users/bob": [mockResponse({ user: mockProfileUser })],
      }),
    );

    renderProfilePage();

    // Verificar que aparece el nombre y el username del perfil visitado
    await waitFor(() => {
      expect(screen.getByText("Bob López")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("@bob")).toBeInTheDocument();
    });
  });

  it("click en Seguir cambia el botón a Siguiendo", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          // Los más específicos primero: /follow y /tweets antes que /users/bob
          "/auth/me": [mockResponse({ user: mockCurrentUser })],
          "/users/bob/tweets": [mockResponse(emptyTweets)],
          // Primera respuesta: no seguido; segunda (tras invalidación): seguido
          "/users/bob": [
            mockResponse({ user: mockProfileUser }),
            mockResponse({ user: mockProfileUserSiguiendo }),
          ],
        },
        (url, init) => {
          // POST /users/bob/follow
          if (url.includes("/users/bob/follow") && (init?.method ?? "GET") === "POST") {
            return mockResponse({ following: true, followersCount: 6 });
          }
          return null;
        },
      ),
    );

    renderProfilePage();

    // Esperar a que cargue el perfil y aparezca el botón "Seguir"
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
    });

    // Hacer click en el botón
    await user.click(screen.getByRole("button", { name: "Seguir" }));

    // Tras el click y la invalidación, el botón debe cambiar a "Siguiendo"
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Siguiendo" })).toBeInTheDocument();
    });
  });
});
