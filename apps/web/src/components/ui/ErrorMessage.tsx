interface ErrorMessageProps {
  message?: string | null;
  className?: string;
}

/** Muestra un mensaje de error en rojo. Nada si message está vacío. */
export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <p role="alert" className={`text-sm text-red-500 ${className}`}>
      {message}
    </p>
  );
}
