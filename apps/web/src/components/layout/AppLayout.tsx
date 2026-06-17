import { Outlet } from "react-router";
import { NavBar } from "./NavBar";
import { RightAside } from "./RightAside";

/**
 * Shell principal de la app — 3 columnas estilo Twitter/X.
 *
 * Breakpoints:
 *   Mobile (<640px):      1 columna + nav inferior fija.
 *   Tablet (640-1023px):  2 columnas (sidebar estrecho + contenido).
 *   Desktop (>=1024px):   3 columnas (sidebar + contenido <=600px + aside widgets).
 */
export function AppLayout() {
  return (
    <div
      className="flex min-h-screen justify-center"
      style={{ backgroundColor: "var(--color-x-bg)" }}
    >
      <NavBar />

      <main
        className="flex-1 min-w-0 pb-16 sm:pb-0"
        style={{
          maxWidth: "600px",
          borderLeft: "1px solid var(--color-x-border)",
          borderRight: "1px solid var(--color-x-border)",
        }}
      >
        <Outlet />
      </main>

      <RightAside />
    </div>
  );
}
