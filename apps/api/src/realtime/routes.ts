import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { requireAuth } from "../auth/middleware";
import type { AppDeps } from "../config";
import type { Database } from "../db";
import { follows } from "../db/schema";
import type { TweetEvent } from "../events/bus";
import { tweetBus } from "../events/bus";
import type { AppEnv } from "../http/types";

// ---------------------------------------------------------------------------
// Lógica de visibilidad (extraída para ser testeable de forma unitaria)
// ---------------------------------------------------------------------------

/**
 * Decide si un tweet es visible en el timeline del viewer.
 * Un tweet es visible si:
 *  a) el viewer es el propio autor, o
 *  b) el viewer sigue al autor.
 *
 * Función pura respecto al control de flujo; la consulta a la DB es la única
 * operación I/O. Se exporta para poder testearse directamente.
 */
export async function esTweetVisiblePara(
  db: Database,
  viewerId: string,
  authorId: string,
): Promise<boolean> {
  // Caso a): el autor es el viewer mismo.
  if (viewerId === authorId) return true;

  // Caso b): el viewer sigue al autor — buscamos la relación exacta.
  const [follow] = await db
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, authorId)))
    .limit(1);

  return follow !== undefined;
}

// ---------------------------------------------------------------------------
// Rutas de tiempo real (SSE)
// ---------------------------------------------------------------------------

/** Intervalo de heartbeat en milisegundos (mantiene la conexión abierta). */
const HEARTBEAT_INTERVAL_MS = 15_000;

export function createRealtimeRoutes({ db, config }: AppDeps) {
  const r = new Hono<AppEnv>();
  const auth = requireAuth(db, config.auth);

  /**
   * GET /realtime/stream
   *
   * Abre un stream Server-Sent Events. El cliente debe enviar la cookie de
   * sesión; sin autenticación devuelve 401 (manejado por `requireAuth`).
   *
   * Por cada tweet publicado en el bus se evalúa si es visible para el viewer
   * (autor == viewer o viewer sigue al autor) y, si lo es, se envía como evento
   * SSE con el contrato TweetView sin campos internos.
   *
   * Un heartbeat `: ping` cada 15 s mantiene viva la conexión a través de
   * proxies y load-balancers que cierran conexiones idle.
   *
   * Al desconectarse el cliente (abort signal), se limpia la suscripción al bus
   * y el intervalo de heartbeat.
   */
  r.get("/stream", auth, (c) => {
    const viewer = c.get("user");
    const viewerId = viewer.id;

    return streamSSE(c, async (stream) => {
      // -----------------------------------------------------------------------
      // Listener del bus: evalúa visibilidad y envía al cliente si corresponde
      // -----------------------------------------------------------------------
      const onTweet = async (event: TweetEvent) => {
        const visible = await esTweetVisiblePara(db, viewerId, event.authorId);
        if (!visible) return;

        await stream.writeSSE({
          event: "tweet",
          data: JSON.stringify(event.tweet),
        });
      };

      tweetBus.subscribe(onTweet);

      // -----------------------------------------------------------------------
      // Heartbeat periódico para mantener la conexión
      // -----------------------------------------------------------------------
      const heartbeatId = setInterval(async () => {
        // Un comentario SSE (`: ping\n\n`) no dispara eventos en el cliente pero
        // evita que proxies/LBs cierren la conexión por inactividad.
        // La API de hono/streaming no expone el campo `comment` en SSEMessage,
        // así que escribimos el frame de comentario directamente como texto raw.
        try {
          await stream.write(": ping\n\n");
        } catch {
          // Si el cliente ya se desconectó, ignoramos el error silenciosamente.
        }
      }, HEARTBEAT_INTERVAL_MS);

      // -----------------------------------------------------------------------
      // Limpieza al desconectarse el cliente (abort signal del request)
      // -----------------------------------------------------------------------
      stream.onAbort(() => {
        clearInterval(heartbeatId);
        tweetBus.unsubscribe(onTweet);
      });

      // Mantenemos el stream abierto hasta que el cliente se desconecte.
      // Usamos un loop de sleeps cortos en lugar de un único sleep enorme para
      // evitar el TimeoutOverflowWarning de Node.js (máximo ~24.8 días por llamada).
      const MAX_SLEEP_MS = 24 * 60 * 60 * 1000; // 24 horas
      while (!stream.aborted) {
        await stream.sleep(MAX_SLEEP_MS);
      }
    });
  });

  return r;
}
