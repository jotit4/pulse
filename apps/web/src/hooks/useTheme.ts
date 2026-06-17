import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "pulse-theme";

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage no disponible (SSR, etc.)
  }
  // Default: dark (estilo X)
  return "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }
}

/**
 * Hook para gestionar el tema claro/oscuro.
 * - Persiste la preferencia en localStorage.
 * - Aplica/quita la clase "light" en <html> (el CSS reacciona a ella).
 * - Default: dark (estilo Twitter/X).
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Sincronizar la clase del DOM con el estado
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignorar
    }
  }, [theme]);

  // Aplicar el tema inicial antes del primer render (evita flash)
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme, isDark: theme === "dark" };
}
