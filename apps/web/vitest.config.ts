import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Los specs de Playwright (tests/e2e) corren con `test:e2e`, no con Vitest.
    exclude: ["node_modules", "dist", "tests/e2e/**"],
    coverage: {
      provider: "v8",
    },
  },
});
