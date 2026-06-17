import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { ChatPage } from "@/pages/ChatPage";
import { mockResponse, buildFetchMock } from "../helpers/fetch-mock";

const mockUser = {
  id: "user-1",
  username: "ana",
  name: "Ana García",
  email: "ana@ejemplo.com",
  createdAt: new Date().toISOString(),
  avatarUrl: null,
};

function renderChatPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/chat"]}>
        <AuthProvider>
          <Routes>
            <Route path="/chat" element={<ChatPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ChatPage — integración", () => {
  beforeEach(() => {
    // Auth/me y unread-count se llaman desde AuthProvider/useUnreadCount
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/chat": [
          mockResponse({ reply: "¡Hola! Soy Pulse AI, ¿en qué te ayudo?", configured: true }),
        ],
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza el encabezado 'Pulse AI' y el placeholder del input", () => {
    renderChatPage();

    expect(screen.getByRole("heading", { name: /Pulse AI/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Preguntá lo que quieras…")).toBeInTheDocument();
  });

  it("muestra el mensaje vacío inicial antes de enviar nada", () => {
    renderChatPage();
    expect(screen.getByText(/Preguntale lo que quieras/i)).toBeInTheDocument();
  });

  it("envía un mensaje y muestra la respuesta del asistente", async () => {
    renderChatPage();

    const input = screen.getByPlaceholderText("Preguntá lo que quieras…");
    await userEvent.type(input, "Hola Pulse AI");

    const sendButton = screen.getByRole("button", { name: /enviar/i });
    await userEvent.click(sendButton);

    // El mensaje del usuario aparece en pantalla
    expect(screen.getByText("Hola Pulse AI")).toBeInTheDocument();

    // Esperar la respuesta del asistente
    await waitFor(() => {
      expect(screen.getByText("¡Hola! Soy Pulse AI, ¿en qué te ayudo?")).toBeInTheDocument();
    });
  });

  it("muestra aviso cuando el backend responde configured:false", async () => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/chat": [
          mockResponse({
            reply:
              "⚠️ El asistente no está configurado. Por favor, configurá la variable GROQ_API_KEY para activar Pulse AI.",
            configured: false,
          }),
        ],
      }),
    );

    renderChatPage();

    const input = screen.getByPlaceholderText("Preguntá lo que quieras…");
    await userEvent.type(input, "Hola");
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pulse AI no está activado/i)).toBeInTheDocument();
    });
  });

  it("muestra mensaje de error si la API falla", async () => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      buildFetchMock({
        "/auth/me": [mockResponse({ user: mockUser })],
        "/notifications/unread-count": [mockResponse({ count: 0 })],
        "/chat": [mockResponse({ error: "Error del servicio de IA" }, 502)],
      }),
    );

    renderChatPage();

    const input = screen.getByPlaceholderText("Preguntá lo que quieras…");
    await userEvent.type(input, "Hola");
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error del servicio de IA/i)).toBeInTheDocument();
    });
  });
});
