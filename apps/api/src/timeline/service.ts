import type { TweetPage } from "@pulse/shared";
import { and, eq, lt, or, sql } from "drizzle-orm";
import type { Database } from "../db";
import { follows, tweets } from "../db/schema";
import { rowToTweetView, tweetViewSelect } from "../tweets/service";

// ---------------------------------------------------------------------------
// Codificación / decodificación del cursor
// ---------------------------------------------------------------------------

/**
 * Codifica (createdAt, id) en un cursor opaco base64url.
 * Formato interno: `<createdAtISO>|<uuid>`.
 */
export function encodeCursor(createdAt: Date, id: string): string {
  const raw = `${createdAt.toISOString()}|${id}`;
  return Buffer.from(raw).toString("base64url");
}

/**
 * Decodifica el cursor y devuelve { t, id }, o null si el valor es inválido.
 * Un cursor inválido se trata como "sin cursor" (no rompe la paginación).
 */
export function decodeCursor(cursor: string): { t: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const sep = raw.lastIndexOf("|");
    if (sep === -1) return null;
    const isoStr = raw.slice(0, sep);
    const id = raw.slice(sep + 1);
    const t = new Date(isoStr);
    if (isNaN(t.getTime()) || !id) return null;
    return { t, id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export interface TimelineOpts {
  cursor?: string;
  limit?: number;
}

/**
 * Devuelve el timeline del viewer: tweets propios + tweets de usuarios seguidos,
 * ordenados cronológicamente descendente (más nuevo primero).
 * Implementa paginación keyset a partir del cursor codificado.
 */
export async function getTimeline(
  db: Database,
  viewerId: string,
  opts: TimelineOpts = {},
): Promise<TweetPage> {
  // Límite entre 1 y 50, por defecto 20.
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  // Construimos la query reutilizando la proyección del módulo de tweets.
  let query = tweetViewSelect(db, viewerId);

  // Filtro: tweets propios O de usuarios que el viewer sigue.
  const authorFilter = or(
    eq(tweets.authorId, viewerId),
    sql`${tweets.authorId} in (select ${follows.followingId} from ${follows} where ${follows.followerId} = ${viewerId})`,
  );

  // Si hay cursor, agregamos la condición keyset para traer sólo lo anterior.
  const decoded = opts.cursor ? decodeCursor(opts.cursor) : null;

  const whereClause = decoded
    ? and(
        authorFilter,
        or(
          lt(tweets.createdAt, decoded.t),
          and(sql`${tweets.createdAt} = ${decoded.t.toISOString()}`, lt(tweets.id, decoded.id)),
        ),
      )
    : authorFilter;

  // Pedimos limit + 1 para detectar si existe una página siguiente.
  const rows = await query
    .where(whereClause)
    .orderBy(sql`${tweets.createdAt} desc, ${tweets.id} desc`)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // El nextCursor apunta al último elemento devuelto (si hay más).
  const lastRow = page[page.length - 1];
  const nextCursor = hasMore && lastRow ? encodeCursor(lastRow.createdAt, lastRow.id) : null;

  return {
    tweets: page.map(rowToTweetView),
    nextCursor,
  };
}
