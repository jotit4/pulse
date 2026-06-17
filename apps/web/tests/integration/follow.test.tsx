import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { ProfilePage } from "@/pages/ProfilePage";

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

/** Construye una respuesta fetch simulada. */
function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Página vacía de tweets. */
const emptyTweets = { tweets: [], nextCursor: null };

// ---------------------------------------------------------------------------
// Helper de mock por URL
// ---------------------------------------------------------------------------

/**
 * Crea un stub de fetch que despacha por URL.
 * Cada URL puede tener múltiples respuestas en cola; una vez consumidas
 * devuelve la última repetidamente (clonando para evitar "body already read").
 * Los patrones MÁS ESPECÍFICOS deben ir ANTES que los genéricos.
 */
function buildFetchMock(
  routes: Record<string, Response[]>,
  extraHandler?: (url: string, init?: RequestInit) => Response | null,
) {
  const queues: Record<string, Response[]> = {};
  for (const [url, responses] of Object.entries(routes)) {
    queues[url] = [...responses];
  }

  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    // Buscar coincidencia en las colas registradas (orden de inserción)
    for (const [pattern, queue] of Object.entries(queues)) {
      if (url.includes(pattern)) {
        // shift consume la respuesta de la cola; si solo queda una, la clonamos
        // para que pueda leerse varias veces sin "body already read"
        if (queue.length > 1) {
          return Promise.resolve(queue.shift()!);
        }
        // Última respuesta: clonar para reutilización segura
        return Promise.resolve(queue[0]!.clone());
      }
    }

    // Handler extra para rutas que no están en el mapa principal
    if (extraHandler) {
      const result = extraHandler(url, init);
      if (result) return Promise.resolve(result);
    }

    // Fallback: 404
    return Promise.resolve(mockResponse({ error: "Not found" }, 404));
  });
}

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
