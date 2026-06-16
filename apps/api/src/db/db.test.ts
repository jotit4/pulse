import { describe, expect, it } from "vitest";
import { createDb } from "./index";

/**
 * Tests unitarios de createDb.
 * Verifican que la función retorna la forma esperada sin necesitar un Postgres
 * real: el driver postgres-js abre la conexión de forma lazy (sólo al ejecutar
 * la primera consulta), por lo que instanciar el handle es seguro en tests.
 */
describe("createDb", () => {
  it("devuelve un objeto con las propiedades db y close", () => {
    // No conectamos realmente; sólo verificamos la forma del handle.
    const handle = createDb("postgresql://localhost:5432/pulse_test");

    expect(handle).toHaveProperty("db");
    expect(handle).toHaveProperty("close");
    expect(typeof handle.close).toBe("function");

    // Cerramos el cliente para no dejar handles abiertos.
    // Como nunca se usó, close() termina inmediatamente sin error.
    void handle.close();
  });

  it("close es una función asíncrona que resuelve sin lanzar", async () => {
    const handle = createDb("postgresql://localhost:5432/pulse_test");
    await expect(handle.close()).resolves.toBeUndefined();
  });
});
