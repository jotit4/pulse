import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { HomePage } from "@/pages/HomePage";

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
};

const mockTweet = {
  id: "tweet-1",
  content: "Hola desde Pulse",
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

/** Construye una respuesta fetch simulada. */
function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Página vacía de timeline. */
const emptyTimeline = { tweets: [], nextCursor: null };

/** Página de timeline con un tweet. */
const timelineConTweet = { tweets: [mockTweet], nextCursor: null };

// ---------------------------------------------------------------------------
// Helper de mock por URL
// ---------------------------------------------------------------------------

/**
 * Crea un stub de fetch que despacha por URL.
 * Cada URL puede tener múltiples respuestas en cola; una vez consumidas
 * devuelve la última repetidamente.
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

    // Buscar coincidencia en las colas registradas
    for (const [pattern, queue] of Object.entries(queues)) {
      if (url.includes(pattern)) {
        const response = queue.length > 1 ? queue.shift()! : queue[0]!;
        return Promise.resolve(response);
      }
    }

    // Handler extra (POST /tweets, etc.)
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
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("HomePage — crear tweet (integración)", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza el compositor y el timeline vacío", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/timeline": [mockResponse(emptyTimeline)],
      }),
    );

    renderHomePage();

    // El compositor debe estar presente
    await waitFor(() => {
      expect(screen.getByPlaceholderText("¿Qué estás pensando?")).toBeInTheDocument();
    });

    // Timeline vacío: mensaje amable
    await waitFor(() => {
      expect(screen.getByText("No hay tweets todavía.")).toBeInTheDocument();
    });
  });

  it("muestra el contador de caracteres actualizado al escribir", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/timeline": [mockResponse(emptyTimeline)],
      }),
    );

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("¿Qué estás pensando?")).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText("Contenido del tweet");

    // Estado inicial: 0/280
    expect(screen.getByText("0/280")).toBeInTheDocument();

    // Escribir 5 caracteres: "Hola!"
    await user.type(textarea, "Hola!");
    expect(screen.getByText("5/280")).toBeInTheDocument();
  });

  it("el botón Publicar está deshabilitado con textarea vacío", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/timeline": [mockResponse(emptyTimeline)],
      }),
    );

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Publicar" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled();
  });

  it("caso éxito: crea un tweet y aparece en el timeline", async () => {
    // El timeline tiene dos respuestas: primero vacío, luego con el tweet nuevo
    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          "/auth/me": [mockResponse({ user: mockUser })],
          "/timeline": [mockResponse(emptyTimeline), mockResponse(timelineConTweet)],
        },
        (url, init) => {
          // POST /tweets
          if (url.includes("/tweets") && (init?.method ?? "GET") === "POST") {
            return mockResponse({ tweet: mockTweet }, 201);
          }
          return null;
        },
      ),
    );

    renderHomePage();

    // Esperar que cargue el compositor
    await waitFor(() => {
      expect(screen.getByPlaceholderText("¿Qué estás pensando?")).toBeInTheDocument();
    });

    // Esperar timeline vacío
    await waitFor(() => {
      expect(screen.getByText("No hay tweets todavía.")).toBeInTheDocument();
    });

    // Escribir en el compositor
    const textarea = screen.getByLabelText("Contenido del tweet");
    await user.type(textarea, "Hola desde Pulse");

    // El botón debe estar habilitado
    const botonPublicar = screen.getByRole("button", { name: "Publicar" });
    expect(botonPublicar).not.toBeDisabled();

    // Enviar
    await user.click(botonPublicar);

    // Tras el submit y el re-fetch, el tweet debe aparecer
    await waitFor(() => {
      expect(screen.getByText("Hola desde Pulse")).toBeInTheDocument();
    });

    // El textarea debe haberse limpiado
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("muestra error de API si el tweet falla", async () => {
    vi.stubGlobal(
      "fetch",
      buildFetchMock(
        {
          "/auth/me": [mockResponse({ user: mockUser })],
          "/timeline": [mockResponse(emptyTimeline)],
        },
        (url, init) => {
          if (url.includes("/tweets") && (init?.method ?? "GET") === "POST") {
            return mockResponse({ error: "Contenido demasiado largo" }, 422);
          }
          return null;
        },
      ),
    );

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("¿Qué estás pensando?")).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText("Contenido del tweet");
    await user.type(textarea, "Tweet con error");

    await user.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Contenido demasiado largo");
    });
  });
});
