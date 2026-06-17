interface SpinnerProps {
  /** Tamaño del spinner en clases Tailwind (por defecto h-8 w-8). */
  className?: string;
}

/** Indicador de carga accesible. */
export function Spinner({ className = "h-8 w-8" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-brand ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Cargando..."
      role="status"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
