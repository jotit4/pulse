import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./index.css";

// Aplicar el tema antes del primer render para evitar flash.
(function initTheme() {
  try {
    const stored = localStorage.getItem("pulse-theme");
    if (stored === "light") {
      document.documentElement.classList.add("light");
    }
    // Default: dark (sin clase = dark por los CSS vars de base)
  } catch {
    // localStorage no disponible
  }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("No se encontró el elemento #root en el DOM");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
