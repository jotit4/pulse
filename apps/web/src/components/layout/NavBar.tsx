import { NavLink, useNavigate } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/Button";
import {
  XLogoIcon,
  HomeIcon,
  SearchIcon,
  BellIcon,
  BookmarkIcon,
  UserIcon,
} from "@/components/icons/Icons";

interface NavItemDef {
  to: string;
  label: string;
  Icon: React.ComponentType<{ filled?: boolean; width?: number; height?: number }>;
}

const staticNavItems: NavItemDef[] = [
  { to: "/", label: "Inicio", Icon: HomeIcon },
  { to: "/search", label: "Buscar", Icon: SearchIcon },
  { to: "/notifications", label: "Notificaciones", Icon: BellIcon },
  { to: "/bookmarks", label: "Bookmarks", Icon: BookmarkIcon },
];

const activeCls = "font-bold text-[var(--color-x-text)]";
const inactiveCls = "text-[var(--color-x-muted)] hover:text-[var(--color-x-text)]";

/** Barra de navegación: inferior en móvil (<640px), lateral en escritorio (≥640px). */
export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const allNavItems: NavItemDef[] = user
    ? [...staticNavItems, { to: `/${user.username}`, label: "Perfil", Icon: UserIcon }]
    : staticNavItems;

  async function handleLogout() {
    await logout();
    void navigate("/login");
  }

  return (
    <>
      {/* Navegación inferior fija en móvil */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--color-x-border)] bg-[var(--color-x-bg)] sm:hidden"
      >
        {allNavItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={label}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${isActive ? activeCls : inactiveCls}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon filled={isActive} width={22} height={22} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar lateral en escritorio */}
      <aside
        aria-label="Navegación lateral"
        className="hidden h-full w-64 flex-col gap-1 border-r border-[var(--color-x-border)] bg-[var(--color-x-bg)] p-4 sm:flex"
      >
        {/* Logo X */}
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full text-[var(--color-x-text)] hover:bg-[var(--color-x-surface)] transition-colors">
          <XLogoIcon width={28} height={28} />
        </div>

        {/* Items de navegación */}
        {allNavItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={label}
            className={({ isActive }) =>
              `flex items-center gap-4 rounded-full px-4 py-3 text-base transition-colors hover:bg-[var(--color-x-surface)] ${isActive ? activeCls : inactiveCls}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon filled={isActive} width={24} height={24} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Botón Postear */}
        <NavLink
          to="/"
          aria-label="Postear"
          className="mt-4 flex w-full items-center justify-center rounded-full bg-[var(--color-x-brand)] px-6 py-3 text-base font-bold text-white transition-colors hover:bg-[var(--color-x-brand-hover)]"
        >
          Postear
        </NavLink>

        {/* Footer: usuario + logout */}
        <div className="mt-auto">
          {user && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-[var(--color-x-muted)]">@{user.username}</p>
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
