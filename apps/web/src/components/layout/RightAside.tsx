import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/client";
import type { UserSearchResult } from "@pulse/shared";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/auth/useAuth";
import { socialApi } from "@/api/client";
import { Link } from "react-router";

// ---------------------------------------------------------------------------
// SugerenciaItem — fila compacta para "A quién seguir"
// ---------------------------------------------------------------------------

interface SugerenciaItemProps {
  user: UserSearchResult;
  onSeguido: (username: string) => void;
}

function SugerenciaItem({ user, onSeguido }: SugerenciaItemProps) {
  const { user: currentUser } = useAuth();
  const [siguiendo, setSiguiendo] = useState(user.isFollowing);
  const [cargando, setCargando] = useState(false);

  const esMiPerfil = currentUser?.username === user.username;

  async function handleSeguir() {
    setCargando(true);
    try {
      await socialApi.follow(user.username);
      setSiguiendo(true);
      onSeguido(user.username);
    } catch {
      // Silencioso: el usuario puede reintentar
    } finally {
      setCargando(false);
    }
  }

  async function handleDejarDeSeguir() {
    setCargando(true);
    try {
      await socialApi.unfollow(user.username);
      setSiguiendo(false);
    } catch {
      // Silencioso
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-x-surface)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "";
      }}
    >
      <Link to={`/${user.username}`} className="shrink-0">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/${user.username}`} className="group">
          <p
            className="text-sm font-bold truncate group-hover:underline leading-tight"
            style={{ color: "var(--color-x-text)" }}
          >
            {user.name}
          </p>
          <p className="text-xs truncate leading-tight" style={{ color: "var(--color-x-muted)" }}>
            @{user.username}
          </p>
        </Link>
      </div>

      {!esMiPerfil && (
        <div className="shrink-0">
          {siguiendo ? (
            <Button
              variant="secondary"
              onClick={handleDejarDeSeguir}
              isLoading={cargando}
              className="text-xs px-3 py-1"
            >
              Siguiendo
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSeguir}
              isLoading={cargando}
              className="text-xs px-3 py-1"
            >
              Seguir
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuienSeguir — sección de sugerencias
// ---------------------------------------------------------------------------

function QuienSeguir() {
  // Rastrea usuarios ya seguidos para poder ocultarlos opcionalmente
  const [seguidos, setSeguidos] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => usersApi.suggestions(5),
    staleTime: 60_000,
  });

  const usuarios = (data?.users ?? []).filter((u) => !seguidos.has(u.username));

  if (isLoading || usuarios.length === 0) return null;

  function handleSeguido(username: string) {
    setSeguidos((prev) => new Set([...prev, username]));
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--color-x-surface-2)" }}
      aria-label="A quién seguir"
    >
      <div className="px-4 py-3">
        <h2 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
          A quién seguir
        </h2>
      </div>

      <div role="list" aria-label="Sugerencias de usuarios">
        {usuarios.map((u) => (
          <div key={u.id} role="listitem">
            <SugerenciaItem user={u} onSeguido={handleSeguido} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RightAside — columna de widgets
// ---------------------------------------------------------------------------

/**
 * Columna derecha de widgets (solo visible en desktop ≥1024px).
 * Incluye barra de búsqueda (placeholder), Tendencias (placeholder) y
 * la sección "A quién seguir" con datos reales de /users/suggestions.
 */
export function RightAside() {
  return (
    <aside
      aria-label="Widgets"
      className="hidden lg:flex lg:flex-col lg:w-80 lg:flex-shrink-0 lg:px-4 lg:py-3 lg:gap-4"
    >
      {/* Barra de búsqueda global (placeholder) */}
      <div
        className="flex items-center gap-2 rounded-full px-4 py-2"
        style={{
          backgroundColor: "var(--color-x-surface-2)",
          border: "1px solid transparent",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-4 w-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
          style={{ color: "var(--color-x-muted)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <span className="text-sm" style={{ color: "var(--color-x-muted)" }}>
          Buscar en Pulse
        </span>
      </div>

      {/* Tendencias (placeholder) */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--color-x-surface-2)" }}
      >
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
            Tendencias
          </h2>
        </div>
        <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--color-x-muted)" }}>
          Las tendencias aparecerán aquí.
        </div>
      </div>

      {/* A quién seguir — datos reales */}
      <QuienSeguir />
    </aside>
  );
}
