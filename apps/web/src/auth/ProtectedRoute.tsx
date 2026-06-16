import { Navigate, Outlet } from "react-router";
import { useAuth } from "./useAuth";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Ruta protegida: redirige a /login si no hay sesión activa.
 * Muestra spinner mientras se rehidrata la sesión.
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
