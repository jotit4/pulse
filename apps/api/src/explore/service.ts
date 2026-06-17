import type { TweetPage } from "@pulse/shared";
import { and, lt, or, sql } from "drizzle-orm";
import type { Database } from "../db";
import { tweets } from "../db/schema";
import { decodeCursor, encodeCursor } from "../timeline/service";
import { rowToTweetView, tweetViewSelect } from "../tweets/service";

export interface ExploreOpts {
  cursor?: string;
  limit?: number;
}

/**
 * Feed global de tweets recientes: todos los tweets de todos los usuarios,
 * sin filtrar por follows. Orden cronológico descendente (más nuevo primero).
 * Implementa la misma paginación keyset que el timeline.
 */
export async function getExploreFeed(
  db: Database,
  viewerId: string,
  opts: ExploreOpts = {},
): Promise<TweetPage> {
  // Límite entre 1 y 50, por defecto 20.
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  const decoded = opts.cursor ? decodeCursor(opts.cursor) : null;

  const whereClause = decoded
    ? or(
        lt(tweets.createdAt, decoded.t),
        and(sql`${tweets.createdAt} = ${decoded.t.toISOString()}`, lt(tweets.id, decoded.id)),
      )
    : undefined;

  // Reutilizamos la proyección estándar (autor + likesCount + likedByMe).
  const query = tweetViewSelect(db, viewerId);

  const rows = await (whereClause ? query.where(whereClause) : query)
    .orderBy(sql`${tweets.createdAt} desc, ${tweets.id} desc`)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const lastRow = page[page.length - 1];
  const nextCursor = hasMore && lastRow ? encodeCursor(lastRow.createdAt, lastRow.id) : null;

  return {
    tweets: page.map(rowToTweetView),
    nextCursor,
  };
}
