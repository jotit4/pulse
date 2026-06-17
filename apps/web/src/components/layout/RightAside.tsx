/**
 * Columna derecha de widgets (solo visible en desktop ≥1024px).
 * Fase 2 llenará con "A quién seguir" y "Tendencias".
 * Por ahora expone el contenedor con el estilo correcto.
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

      {/* Placeholder: "Tendencias" — Fase 2 */}
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

      {/* Placeholder: "A quién seguir" — Fase 2 */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--color-x-surface-2)" }}
      >
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
            A quién seguir
          </h2>
        </div>
        <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--color-x-muted)" }}>
          Sugerencias de usuarios aparecerán aquí.
        </div>
      </div>
    </aside>
  );
}
