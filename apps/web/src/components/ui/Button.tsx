import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

/**
 * Boton base — variantes estilo Twitter/X.
 *
 * primary   — pill azul X (#1d9bf0), texto blanco.
 * secondary — pill borde azul X, texto azul (para "Siguiendo").
 * ghost     — sin fondo, texto secundario, hover surface sutil.
 * outline   — borde sutil (color-x-border), texto principal.
 * danger    — rojo, texto blanco.
 */
export function Button({
  variant = "primary",
  isLoading = false,
  children,
  disabled,
  className = "",
  style,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyle: React.CSSProperties = (() => {
    switch (variant) {
      case "primary":
        return { backgroundColor: "var(--color-x-brand)", color: "#ffffff" };
      case "secondary":
        return {
          backgroundColor: "transparent",
          border: "1px solid var(--color-x-brand)",
          color: "var(--color-x-brand)",
        };
      case "ghost":
        return { backgroundColor: "transparent", color: "var(--color-x-muted)" };
      case "outline":
        return {
          backgroundColor: "transparent",
          border: "1px solid var(--color-x-border)",
          color: "var(--color-x-text)",
        };
      case "danger":
        return { backgroundColor: "var(--color-x-danger)", color: "#ffffff" };
    }
  })();

  return (
    <button
      disabled={disabled ?? isLoading}
      className={`${base} ${className}`}
      style={{ ...variantStyle, ...style }}
      {...rest}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
