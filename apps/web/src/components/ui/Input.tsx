import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Campo de texto accesible con soporte de etiqueta y mensaje de error. */
export function Input({ label, error, id, className = "", ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand ${error ? "border-red-500" : "border-gray-300"} ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
