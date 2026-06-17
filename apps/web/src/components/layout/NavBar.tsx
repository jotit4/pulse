import { NavLink, useNavigate } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/Button";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { to: "/", label: "Inicio", icon: "🏠" },
  { to: "/search", label: "Buscar", icon: "🔍" },
];

const activeCls = "font-semibold text-brand";
const inactiveCls = "text-gray-600 hover:text-brand";

/** Barra de navegación: inferior en móvil (<640px), lateral en escritorio (≥640px). */
export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    void navigate("/login");
  }

  return (
    <>
      {/* Navegación inferior fija en móvil */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-200 bg-white sm:hidden"
      >
        {/* Fix #5: aria-hidden en los emojis para que el lector de pantalla
            solo anuncie el texto del enlace, no el carácter emoji. */}
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${isActive ? activeCls : inactiveCls}`
            }
          >
            <span className="text-xl" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
        {user && (
          <NavLink
            to={`/${user.username}`}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${isActive ? activeCls : inactiveCls}`
            }
          >
            <span className="text-xl" aria-hidden="true">👤</span>
            <span>Perfil</span>
          </NavLink>
        )}
      </nav>

      {/* Sidebar lateral en escritorio */}
      <aside
        aria-label="Navegación principal"
        className="hidden h-full w-64 flex-col gap-2 border-r border-gray-200 bg-white p-4 sm:flex"
      >
        <div className="mb-4 text-2xl font-bold text-brand">Pulse</div>

        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-full px-4 py-3 text-base transition-colors ${isActive ? activeCls + " bg-brand/5" : inactiveCls}`
            }
          >
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        {user && (
          <NavLink
            to={`/${user.username}`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-full px-4 py-3 text-base transition-colors ${isActive ? activeCls + " bg-brand/5" : inactiveCls}`
            }
          >
            <span aria-hidden="true">👤</span>
            <span>Perfil</span>
          </NavLink>
        )}

        <div className="mt-auto">
          {user && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-500">@{user.username}</p>
              <Button variant="ghost" onClick={() => void handleLogout()}>
                Cerrar sesión
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
