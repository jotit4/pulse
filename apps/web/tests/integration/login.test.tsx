import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { mockResponse } from "../helpers/fetch-mock";

/** Monta LoginPage con los providers necesarios y un MemoryRouter.
 *  La ruta "/" renderiza un div centinela para verificar navegación. */
function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Ruta centinela para verificar que la navegación fue exitosa */}
            <Route path="/" element={<div>Inicio (autenticado)</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// -------------------------------------------------------------------
// Suite
// -------------------------------------------------------------------

describe("LoginPage — integración", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el formulario con los campos correctos", async () => {
    // GET /auth/me → 401 (sin sesión)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse({ error: "No autorizado" }, 401)),
    );

    renderLoginPage();

    // Esperar que el AuthProvider termine de verificar la sesión
    await waitFor(() => {
      expect(screen.getByLabelText("Email o usuario")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrate" })).toBeInTheDocument();
  });

  it("caso éxito: navega a / tras login correcto", async () => {
    const mockUser = {
      id: "1",
      username: "ana",
      name: "Ana García",
      email: "ana@ejemplo.com",
      createdAt: new Date().toISOString(),
    };

    const fetchMock = vi
      .fn()
      // Primera llamada: GET /auth/me → 401 (sin sesión previa)
      .mockResolvedValueOnce(mockResponse({ error: "No autorizado" }, 401))
      // Segunda llamada: POST /auth/login → 200 con {user}
      .mockResolvedValueOnce(mockResponse({ user: mockUser }, 200));

    vi.stubGlobal("fetch", fetchMock);

    renderLoginPage();

    // Esperar que cargue el formulario
    await waitFor(() => {
      expect(screen.getByLabelText("Email o usuario")).toBeInTheDocument();
    });

    // Completar el formulario
    await user.type(screen.getByLabelText("Email o usuario"), "ana@ejemplo.com");
    await user.type(screen.getByLabelText("Contraseña"), "contraseña123");

    // Enviar
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    // Verificar navegación a "/"
    await waitFor(() => {
      expect(screen.getByText("Inicio (autenticado)")).toBeInTheDocument();
    });
  });

  it("caso error 401: muestra mensaje de credenciales inválidas", async () => {
    const fetchMock = vi
      .fn()
      // GET /auth/me → 401
      .mockResolvedValueOnce(mockResponse({ error: "No autorizado" }, 401))
      // POST /auth/login → 401
      .mockResolvedValueOnce(mockResponse({ error: "Credenciales inválidas" }, 401));

    vi.stubGlobal("fetch", fetchMock);

    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Email o usuario")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Email o usuario"), "usuario@ejemplo.com");
    await user.type(screen.getByLabelText("Contraseña"), "claveincorrecta");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Credenciales inválidas");
    });
  });

  it("validación cliente: muestra error si los campos están vacíos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse({ error: "No autorizado" }, 401)),
    );

    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    });

    // Enviar con campos vacíos
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(screen.getByText("Ingresá tu email o usuario")).toBeInTheDocument();
      expect(screen.getByText("Ingresá tu contraseña")).toBeInTheDocument();
    });
  });

  it("el botón submit se deshabilita mientras se envía", async () => {
    let resolveLogin!: (v: Response) => void;
    const loginPromise = new Promise<Response>((res) => {
      resolveLogin = res;
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ error: "No autorizado" }, 401))
      .mockReturnValueOnce(loginPromise);

    vi.stubGlobal("fetch", fetchMock);

    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Email o usuario")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Email o usuario"), "usuario");
    await user.type(screen.getByLabelText("Contraseña"), "contraseña123");

    const submitBtn = screen.getByRole("button", { name: "Iniciar sesión" });
    await user.click(submitBtn);

    // Mientras el fetch pende, el botón debe estar deshabilitado
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Resolver el login para limpiar el test
    resolveLogin(mockResponse({ error: "Error" }, 500));
  });
});
