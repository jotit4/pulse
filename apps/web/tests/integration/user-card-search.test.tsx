import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthContext";
import { UserCard } from "@/components/user/UserCard";
import type { UserSearchResult } from "@pulse/shared";

// ---------------------------------------------------------------------------
// Stub mínimo de fetch para que AuthProvider (useAuth → /auth/me) no rompa
// ---------------------------------------------------------------------------

const mockCurrentUser = {
  id: "user-viewer",
  username: "viewer",
  name: "Viewer",
  email: "viewer@example.com",
  bio: "",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: mockCurrentUser }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Fixtures de usuario en resultados de búsqueda
// ---------------------------------------------------------------------------

const userNoSeguido: UserSearchResult = {
  id: "user-bob",
  username: "bob",
  name: "Bob López",
  bio: "Dev",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  isFollowing: false,
};

const userSeguido: UserSearchResult = {
  ...userNoSeguido,
  isFollowing: true,
};

// ---------------------------------------------------------------------------
// Helper de render
// ---------------------------------------------------------------------------

function renderCard(user: UserSearchResult) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <UserCard user={user} />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("UserCard — isFollowing desde servidor (búsqueda)", () => {
  it("muestra 'Seguir' cuando isFollowing es false", () => {
    stubFetch();
    renderCard(userNoSeguido);
    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
  });

  it("muestra 'Siguiendo' cuando isFollowing es true (estado inicial del servidor)", () => {
    stubFetch();
    renderCard(userSeguido);
    expect(screen.getByRole("button", { name: "Siguiendo" })).toBeInTheDocument();
  });
});
