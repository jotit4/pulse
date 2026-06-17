import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Campo de texto accesible — tema X (dark/light via CSS vars). */
export function Input({ label, error, id, className = "", style, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium"
          style={{ color: "var(--color-x-text)" }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-md px-3 py-2 text-sm outline-none transition-colors ${className}`}
        style={{
          backgroundColor: "var(--color-x-surface-2)",
          border: error ? "1px solid var(--color-x-danger)" : "1px solid var(--color-x-border)",
          color: "var(--color-x-text)",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-x-brand)";
          e.currentTarget.style.boxShadow = "0 0 0 1px var(--color-x-brand)";
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? "var(--color-x-danger)"
            : "var(--color-x-border)";
          e.currentTarget.style.boxShadow = "none";
          rest.onBlur?.(e);
        }}
        {...rest}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--color-x-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
