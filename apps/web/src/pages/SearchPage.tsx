import { useState } from "react";
import { useSearchParams } from "react-router";
import { useSearch } from "@/hooks/useSearch";
import { UserCard } from "@/components/user/UserCard";
import { Spinner } from "@/components/ui/Spinner";

/** Pagina de busqueda de usuarios. El debounce de 350 ms vive en useSearch. */
export function SearchPage() {
  const [searchParams] = useSearchParams();
  // Precarga el término si se llega desde la barra del sidebar (/search?q=...).
  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");

  const { data, isLoading } = useSearch(inputValue);

  return (
    <div>
      <header
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-x-bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-x-border)",
        }}
      >
        <h1 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
          Buscar
        </h1>
      </header>

      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-x-border)" }}>
        {/* Fix #4: label asociado al input para accesibilidad */}
        <label htmlFor="buscar-usuarios" className="sr-only">
          Buscar usuarios
        </label>
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
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
          <input
            id="buscar-usuarios"
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Buscar usuarios..."
            className="w-full rounded-full pl-10 pr-4 py-2 text-sm outline-none transition-colors"
            style={{
              backgroundColor: "var(--color-x-surface-2)",
              border: "1px solid transparent",
              color: "var(--color-x-text)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-x-brand)";
              e.currentTarget.style.backgroundColor = "var(--color-x-bg)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.backgroundColor = "var(--color-x-surface-2)";
            }}
          />
        </div>
      </div>

      <div>
        {inputValue.trim().length < 2 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-x-muted)" }}>
            Escribí al menos 2 caracteres para buscar.
          </p>
        )}

        {inputValue.trim().length >= 2 && isLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {inputValue.trim().length >= 2 && !isLoading && data?.users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-x-muted)" }}>
            Sin resultados para {inputValue}
          </p>
        )}

        {data?.users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
