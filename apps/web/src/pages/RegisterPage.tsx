import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { registerSchema } from "@pulse/shared";

type FieldErrors = Partial<Record<"username" | "name" | "email" | "password", string>>;

/** Pagina de registro de nuevo usuario. */
export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function validate(): FieldErrors {
    const result = registerSchema.safeParse({ username, name, email, password });
    if (result.success) return {};

    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.errors) {
      const field = issue.path[0] as keyof FieldErrors;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return fieldErrors;
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
      await register({
        username: username.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      });
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
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ backgroundColor: "var(--color-x-bg)" }}
    >
      <div
        className="w-full max-w-sm space-y-6 rounded-2xl p-8"
        style={{
          backgroundColor: "var(--color-x-surface-2)",
          border: "1px solid var(--color-x-border)",
        }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 text-3xl font-black"
            style={{ color: "var(--color-x-brand)" }}
          >
            Pulse
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-x-text)" }}>
            Crear cuenta
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-x-muted)" }}>
            Únete a Pulse hoy
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="username"
            label="Usuario"
            type="text"
            autoComplete="username"
            placeholder="ej: juan_perez"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            disabled={isSubmitting}
          />

          <Input
            id="name"
            label="Nombre"
            type="text"
            autoComplete="name"
            placeholder="ej: Juan Pérez"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            disabled={isSubmitting}
          />

          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ej: juan@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={isSubmitting}
          />

          <Input
            id="password"
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={isSubmitting}
          />

          <ErrorMessage message={apiError} />

          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
            Registrarse
          </Button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--color-x-muted)" }}>
          ¿Ya tenés cuenta?{" "}
          <Link
            to="/login"
            className="font-bold hover:underline"
            style={{ color: "var(--color-x-brand)" }}
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
