import { vi } from "vitest";

/**
 * Construye una respuesta fetch simulada con el body JSON dado.
 */
export function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Crea un stub de fetch que despacha por URL.
 *
 * - `routes`: mapa de patrón de URL → cola de respuestas. Una vez consumidas,
 *   la última respuesta se clona para que pueda leerse varias veces sin
 *   "body already read".
 * - `extraHandler`: handler opcional para rutas fuera del mapa (POST ad-hoc,
 *   etc.). Devuelve `null` para delegar al fallback 404.
 *
 * Los patrones MÁS ESPECÍFICOS deben registrarse ANTES que los genéricos
 * porque la búsqueda usa `url.includes(pattern)` en orden de inserción.
 */
export function buildFetchMock(
  routes: Record<string, Response[]>,
  extraHandler?: (url: string, init?: RequestInit) => Response | null,
) {
  const queues: Record<string, Response[]> = {};
  for (const [url, responses] of Object.entries(routes)) {
    queues[url] = [...responses];
  }

  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    for (const [pattern, queue] of Object.entries(queues)) {
      if (url.includes(pattern)) {
        if (queue.length > 1) {
          return Promise.resolve(queue.shift()!);
        }
        // Última respuesta: clonar para reutilización segura
        return Promise.resolve(queue[0]!.clone());
      }
    }

    if (extraHandler) {
      const result = extraHandler(url, init);
      if (result) return Promise.resolve(result);
    }

    // Fallback: 404
    return Promise.resolve(mockResponse({ error: "Not found" }, 404));
  });
}
