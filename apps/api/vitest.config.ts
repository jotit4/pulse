import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // PGlite levanta una base WASM por test; sin acotar la concurrencia, crear
    // muchas en paralelo satura la CPU y dispara timeouts en los hooks beforeEach.
    // Limitamos los forks y damos margen a los hooks para que la suite sea
    // determinística (sin tests flaky).
    hookTimeout: 30000,
    testTimeout: 20000,
    pool: "forks",
    poolOptions: {
      forks: { maxForks: 4, minForks: 1 },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      include: ["src/**/*.ts"],
      // El bootstrap del server y los barrels no aportan lógica testeable.
      exclude: ["src/index.ts", "src/**/*.test.ts", "src/**/*.d.ts"],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 80,
      },
    },
  },
});
