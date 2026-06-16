import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand/90 disabled:opacity-50",
  secondary:
    "bg-transparent border border-brand text-brand hover:bg-brand/10 disabled:opacity-50",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 disabled:opacity-50",
  danger:
    "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50",
};

/** Botón base con variantes y estado de carga. */
export function Button({
  variant = "primary",
  isLoading = false,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? isLoading}
      className={`inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${variantClasses[variant]} ${className}`}
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
