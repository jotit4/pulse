import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("aplica defaults cuando el entorno está vacío", () => {
    const env = loadEnv({} as NodeJS.ProcessEnv);

    expect(env.NODE_ENV).toBe("development");
    expect(env.API_PORT).toBe(3001);
    expect(env.SESSION_COOKIE_NAME).toBe("pulse_session");
  });

  it("coacciona API_PORT de string a número", () => {
    const env = loadEnv({ API_PORT: "8080" } as unknown as NodeJS.ProcessEnv);

    expect(env.API_PORT).toBe(8080);
  });

  it("lanza si una variable tiene un valor inválido", () => {
    expect(() => loadEnv({ API_PORT: "no-soy-un-numero" } as unknown as NodeJS.ProcessEnv)).toThrow(
      "Configuración de entorno inválida",
    );
  });
});
