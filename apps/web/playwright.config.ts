/**
 * Configuración de Playwright para tests E2E del frontend.
 *
 * PRECONDICIONES para ejecutar:
 *   - La API (localhost:3001) debe estar corriendo con una base de datos activa.
 *     Opciones:
 *       a) docker compose up          (levanta postgres + api + web de una vez)
 *       b) pnpm --filter @pulse/api dev  (con la DB de Postgres apuntada en .env)
 *   - El frontend puede arrancarse manualmente con `pnpm --filter @pulse/web dev`
 *     o dejar que Playwright lo levante automáticamente via `webServer` (ver abajo).
 *
 * Comando para correr:
 *   pnpm --filter @pulse/web test:e2e
 *   # o directamente desde apps/web:
 *   pnpm exec playwright test
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  /** Directorio donde viven los specs E2E. */
  testDir: "./tests/e2e",

  /** Timeout global por test (30 s). */
  timeout: 30_000,

  /** Reintentos en CI para reducir falsos negativos por flakiness de red. */
  retries: process.env.CI ? 2 : 0,

  /** Número de workers paralelos (1 en CI para estabilidad). */
  workers: process.env.CI ? 1 : undefined,

  /** Reporter: lista en consola; HTML en CI/CD. */
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",

  use: {
    /** URL base del frontend. */
    baseURL: "http://localhost:5173",

    /** Captura de traza en el primer reintento para diagnóstico. */
    trace: "on-first-retry",

    /** Screenshot sólo al fallar. */
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /**
   * Servidor de desarrollo del frontend.
   * Playwright lo arranca si no detecta nada en el puerto 5173.
   *
   * NOTA: Este bloque NO levanta la API ni la DB. Asegurate de tener
   * la API corriendo antes de ejecutar los tests (ver precondiciones arriba).
   */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    /** Hasta 30 s para que el servidor de desarrollo esté listo. */
    timeout: 30_000,
  },
});
