import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("GET /health", () => {
  it("responde 200 con el estado del servicio", async () => {
    const app = createApp();

    const res = await app.request("/health");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: "ok",
      service: "pulse-api",
    });
  });

  it("devuelve 404 en una ruta inexistente", async () => {
    const app = createApp();

    const res = await app.request("/no-existe");

    expect(res.status).toBe(404);
  });
});
