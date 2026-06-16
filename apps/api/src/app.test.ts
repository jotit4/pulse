import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../test/helpers/app";

describe("GET /health", () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.close();
  });

  it("responde 200 con el estado del servicio", async () => {
    const res = await ctx.app.request("/health");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok", service: "pulse-api" });
  });

  it("devuelve 404 en una ruta inexistente", async () => {
    const res = await ctx.app.request("/no-existe");

    expect(res.status).toBe(404);
  });
});
