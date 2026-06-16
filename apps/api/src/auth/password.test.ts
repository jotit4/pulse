import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("genera un hash distinto del texto plano y verificable", async () => {
    const hash = await hashPassword("password123");

    expect(hash).not.toBe("password123");
    await expect(verifyPassword(hash, "password123")).resolves.toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("password123");

    await expect(verifyPassword(hash, "otra-clave")).resolves.toBe(false);
  });

  it("produce hashes con salt distinto para la misma contraseña", async () => {
    const a = await hashPassword("misma-clave");
    const b = await hashPassword("misma-clave");

    expect(a).not.toBe(b);
  });
});
