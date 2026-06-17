import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import type { PublicUser, RegisterInput, LoginInput } from "@pulse/shared";
import { authApi, ApiError } from "@/api/client";

interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  /** Error de infraestructura al intentar rehidratar la sesión (ej. API caída).
   *  Un 401 normal NO pone este campo — solo errores de red o respuestas 5xx. */
  sessionError: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/** Rehidrata la sesión al montar y expone las acciones de auth. */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    sessionError: null,
  });

  // Al montar, intentamos recuperar la sesión desde la cookie existente
  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => {
        setState({ user, isLoading: false, sessionError: null });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          // No hay sesión activa — es el caso normal cuando no estás logueado
          setState({ user: null, isLoading: false, sessionError: null });
        } else {
          // Fix #3: error de red o 5xx — NO asumir deslogueado.
          // Dejamos user en null para no bloquear la app, pero exponemos
          // sessionError para que los consumidores puedan reaccionar si lo necesitan.
          const mensaje = err instanceof Error ? err.message : "Error al verificar sesión";
          console.error("Error al verificar sesión:", err);
          setState({ user: null, isLoading: false, sessionError: mensaje });
        }
      });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { user } = await authApi.login(input);
    setState({ user, isLoading: false, sessionError: null });
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user } = await authApi.register(input);
    setState({ user, isLoading: false, sessionError: null });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, isLoading: false, sessionError: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
