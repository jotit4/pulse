import { zValidator } from "@hono/zod-validator";
import type { ZodSchema } from "zod";

/**
 * Validador de body JSON con respuesta de error uniforme (400 + issues por campo).
 * Se usa en todas las rutas para no repetir el manejo de errores de validación.
 */
export const validateJson = <T extends ZodSchema>(schema: T) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Datos inválidos", issues: result.error.flatten().fieldErrors }, 400);
    }
  });
