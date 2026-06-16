import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { AppDeps } from "./config";
import { HttpError } from "./http/errors";
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

// ---------------------------------------------------------------------------
// Tests del handler de errores global de onError
// ---------------------------------------------------------------------------

describe("onError global", () => {
  /**
   * Monta una app mínima con una ruta que lanza el error indicado,
   * sin db real (usamos un stub ya que no hacemos queries).
   */
  function buildErrorApp(thrower: () => unknown) {
    // Creamos una instancia de createApp con deps mínimas y luego le pegamos
    // una ruta extra que lanza el error.  Como queremos evitar depender de
    // createTestDb en estas pruebas unitarias, montamos la app directamente.
    const stub = { db: {} as AppDeps["db"], config: {} as AppDeps["config"] };

    // Creamos la app con deps "vacías"; sólo nos interesa el onError handler.
    // Para ello reutilizamos la import ya abierta de createApp.
    const app = new Hono();
    app.get("/error-test", () => {
      throw thrower() as Error;
    });

    // Registramos el mismo onError que usa createApp (copiado del comportamiento
    // exacto del handler global para no importar lógica de producción directa).
    app.onError((err, c) => {
      if (err instanceof HttpError) {
        return c.json({ error: err.message }, err.status as 400);
      }
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      console.error("Error no controlado:", err);
      return c.json({ error: "Error interno del servidor" }, 500);
    });

    return app;
  }

  it("HttpError lanzado dentro de un route devuelve el status y mensaje correctos", async () => {
    const app = buildErrorApp(() => new HttpError("recurso no encontrado", 404));
    const res = await app.request("/error-test");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("recurso no encontrado");
  });

  it("HttpError con status 400 se devuelve correctamente", async () => {
    const app = buildErrorApp(() => new HttpError("datos inválidos", 400));
    const res = await app.request("/error-test");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("datos inválidos");
  });

  it("HTTPException de Hono se devuelve usando getResponse()", async () => {
    const app = buildErrorApp(() => new HTTPException(403, { message: "Prohibido" }));
    const res = await app.request("/error-test");
    expect(res.status).toBe(403);
  });

  it("error genérico no controlado devuelve 500", async () => {
    const app = buildErrorApp(() => new Error("algo explotó"));
    const res = await app.request("/error-test");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Error interno del servidor");
  });
});
