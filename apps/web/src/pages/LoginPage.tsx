import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/** Página de inicio de sesión. */
export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si ya hay sesión activa, redirigir a home
  if (user) {
    return <Navigate to="/" replace />;
  }

  function validate() {
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = "Ingresá tu email o usuario";
    if (!password) next.password = "Ingresá tu contraseña";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password });
      void navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError("Error inesperado. Intentá de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-gray-500">Bienvenido de vuelta a Pulse</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="identifier"
            label="Email o usuario"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
            disabled={isSubmitting}
          />

          <Input
            id="password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={isSubmitting}
          />

          {/* Error global de la API */}
          <ErrorMessage message={apiError} />

          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            Iniciar sesión
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          ¿No tenés cuenta?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
