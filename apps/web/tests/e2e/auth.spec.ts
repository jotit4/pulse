/**
 * Tests E2E de autenticación — Pulse.
 *
 * PRECONDICIONES:
 *   - Frontend corriendo en localhost:5173  (o arrancado por Playwright via webServer)
 *   - API corriendo en localhost:3001       (NO la levanta Playwright)
 *   - Base de datos PostgreSQL accesible para la API
 *
 * Para levantar el stack completo antes de correr los tests:
 *   docker compose up          # opción A — todo en un comando
 *   # opción B — manual:
 *   pnpm --filter @pulse/api dev   # en una terminal
 *   pnpm --filter @pulse/web dev   # en otra (o dejar que Playwright lo haga)
 *
 * Correr los tests:
 *   pnpm --filter @pulse/web test:e2e
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sufijo único y CORTO por corrida (base36) para evitar colisiones en la DB
 * sin exceder el límite de 20 caracteres del username (ver usernameSchema).
 */
function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 36).toString(36)}`;
}

// ---------------------------------------------------------------------------
// Test 1: registro → home → logout → ruta protegida redirige a /login
// ---------------------------------------------------------------------------

test("registro de usuario nuevo → home autenticada → logout → ruta protegida redirige a /login", async ({
  page,
}) => {
  const suffix = uniqueSuffix();
  const username = `tu_${suffix}`;
  const name = `Test User ${suffix}`;
  const email = `testuser_${suffix}@test.com`;
  const password = "Test1234!";

  // ── 1. Navegar a /register ──────────────────────────────────────────────
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register/);

  // Verificar que la página de registro cargó
  await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();

  // ── 2. Completar el formulario de registro ──────────────────────────────
  // Los inputs se identifican por su <label> asociado (htmlFor → id).
  // Labels definidos en RegisterPage.tsx:
  //   "Usuario" → input#username
  //   "Nombre"  → input#name
  //   "Email"   → input#email
  //   "Contraseña" → input#password

  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);

  // ── 3. Enviar el formulario ─────────────────────────────────────────────
  await page.getByRole("button", { name: "Registrarse" }).click();

  // ── 4. Verificar redirección a "/" y estado autenticado en el NavBar ────
  // Después del registro exitoso, RegisterPage navega a "/".
  await expect(page).toHaveURL("http://localhost:5173/");

  // El NavBar muestra "@username" en el sidebar de escritorio (sm:flex).
  // En el viewport de escritorio de Playwright (1280x720) el sidebar es visible.
  // NavBar.tsx línea 98: <p className="text-sm text-gray-500">@{user.username}</p>
  // El handle también aparece en los tweets del timeline, así que acotamos la
  // búsqueda al sidebar de navegación para evitar coincidencias múltiples.
  await expect(
    page.getByRole("complementary", { name: "Navegación principal" }).getByText(`@${username}`),
  ).toBeVisible();

  // ── 5. Hacer logout ─────────────────────────────────────────────────────
  // NavBar.tsx línea 99: <Button variant="ghost" ...>Cerrar sesión</Button>
  await page.getByRole("button", { name: "Cerrar sesión" }).click();

  // Después del logout, NavBar navega a "/login"
  await expect(page).toHaveURL(/\/login/);

  // Verificar que llegamos a la página de login
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

  // ── 6. Intentar navegar a "/" (ruta protegida) → debe redirigir a /login ─
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);

  // Confirmar que seguimos en login (no se filtró contenido privado)
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2: login con usuario del seed
//
// Este test requiere que la DB tenga el seed cargado (ver apps/api/src/db/seed.ts).
// Usuario: luna_garcia / password123
//
// Para cargar el seed:
//   pnpm --filter @pulse/api db:seed   (o el comando equivalente del proyecto)
// ---------------------------------------------------------------------------

test("login con usuario del seed (luna_garcia) → home autenticada → logout", async ({ page }) => {
  // ── 1. Navegar a /login ─────────────────────────────────────────────────
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

  // ── 2. Completar el formulario de login ─────────────────────────────────
  // LoginPage.tsx labels:
  //   "Email o usuario" → input#identifier
  //   "Contraseña"      → input#password

  await page.getByLabel("Email o usuario").fill("luna_garcia");
  await page.getByLabel("Contraseña").fill("password123");

  // ── 3. Enviar ───────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  // ── 4. Verificar home autenticada ───────────────────────────────────────
  await expect(page).toHaveURL("http://localhost:5173/");
  // luna_garcia tiene tweets en el seed, por lo que su handle aparece varias
  // veces; acotamos al sidebar de navegación para identificar la sesión activa.
  await expect(
    page.getByRole("complementary", { name: "Navegación principal" }).getByText("@luna_garcia"),
  ).toBeVisible();

  // ── 5. Logout ───────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
});
