import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./service";

/**
 * Tests unitarios para las funciones puras de cursor del timeline.
 * Las pruebas de integración de getTimeline están en timeline.test.ts.
 */
describe("encodeCursor / decodeCursor", () => {
  it("el cursor codificado se decodifica correctamente", () => {
    const fecha = new Date("2024-06-15T12:00:00.000Z");
    const id = "550e8400-e29b-41d4-a716-446655440000";

    const cursor = encodeCursor(fecha, id);
    const decoded = decodeCursor(cursor);

    expect(decoded).not.toBeNull();
    expect(decoded!.t.toISOString()).toBe(fecha.toISOString());
    expect(decoded!.id).toBe(id);
  });

  it("devuelve null para una cadena base64url sin separador '|'", () => {
    // Buffer.from('hola', 'base64url') decodifica a bytes sin '|'.
    const cursor = Buffer.from("sinSeparador").toString("base64url");
    expect(decodeCursor(cursor)).toBeNull();
  });

  it("devuelve null para una fecha inválida en el cursor", () => {
    // Codificamos un cursor con fecha inválida pero con el separador presente.
    const cursor = Buffer.from("fecha-no-iso|uuid-valido").toString("base64url");
    expect(decodeCursor(cursor)).toBeNull();
  });

  it("devuelve null para un cursor con id vacío", () => {
    // La fecha es válida pero el id es la cadena vacía.
    const cursor = Buffer.from("2024-06-15T12:00:00.000Z|").toString("base64url");
    expect(decodeCursor(cursor)).toBeNull();
  });

  it("devuelve null para una cadena vacía", () => {
    expect(decodeCursor("")).toBeNull();
  });

  it("devuelve null para texto arbitrario no base64url", () => {
    // No falla: Buffer.from ignora caracteres inválidos en base64url.
    // El resultado decodificado no tendrá '|', por eso devuelve null.
    expect(decodeCursor("esto-no-es-base64url!!!")).toBeNull();
  });

  it("dos encodings distintos producen cursores distintos", () => {
    const d1 = new Date("2024-06-15T12:00:00.000Z");
    const d2 = new Date("2024-06-16T12:00:00.000Z");
    const id = "550e8400-e29b-41d4-a716-446655440000";

    expect(encodeCursor(d1, id)).not.toBe(encodeCursor(d2, id));
  });
});
