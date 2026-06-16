import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PublicUser, RegisterInput, LoginInput } from "@pulse/shared";
import { authApi, ApiError } from "@/api/client";

interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
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
  });

  // Al montar, intentamos recuperar la sesión desde la cookie existente
  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => {
        setState({ user, isLoading: false });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          // No hay sesión activa — es el caso normal cuando no estás logueado
          setState({ user: null, isLoading: false });
        } else {
          console.error("Error al verificar sesión:", err);
          setState({ user: null, isLoading: false });
        }
      });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { user } = await authApi.login(input);
    setState({ user, isLoading: false });
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user } = await authApi.register(input);
    setState({ user, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
