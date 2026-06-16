import { Outlet } from "react-router";
import { NavBar } from "./NavBar";

/**
 * Shell principal de la app:
 * - Mobile (<640px): contenido ocupa pantalla completa; nav inferior fija.
 * - Desktop (≥640px): sidebar lateral + contenido central.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-white sm:flex-row">
      <NavBar />

      {/* Zona de contenido principal */}
      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
