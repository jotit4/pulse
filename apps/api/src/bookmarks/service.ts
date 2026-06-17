import type { TweetPage } from "@pulse/shared";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import { bookmarks, tweets } from "../db/schema";
import { rowToTweetView, tweetViewSelect } from "../tweets/service";
import { decodeCursor, encodeCursor } from "../timeline/service";
import { HttpError } from "../http/errors";

const uuidSchema = z.string().uuid();

// ---------------------------------------------------------------------------
// Bookmark / Unbookmark
// ---------------------------------------------------------------------------

/**
 * Guarda un tweet en los bookmarks del viewer. Idempotente.
 * Lanza 404 si el tweet no existe.
 */
export async function bookmarkTweet(db: Database, userId: string, tweetId: string): Promise<void> {
  if (!uuidSchema.safeParse(tweetId).success) {
    throw new HttpError("Tweet no encontrado", 404);
  }

  const [tweet] = await db
    .select({ id: tweets.id })
    .from(tweets)
    .where(eq(tweets.id, tweetId))
    .limit(1);

  if (!tweet) throw new HttpError("Tweet no encontrado", 404);

  await db.insert(bookmarks).values({ userId, tweetId }).onConflictDoNothing();
}

/**
 * Elimina un tweet de los bookmarks del viewer. Idempotente.
 * Lanza 404 si el tweet no existe.
 */
export async function unbookmarkTweet(
  db: Database,
  userId: string,
  tweetId: string,
): Promise<void> {
  if (!uuidSchema.safeParse(tweetId).success) {
    throw new HttpError("Tweet no encontrado", 404);
  }

  const [tweet] = await db
    .select({ id: tweets.id })
    .from(tweets)
    .where(eq(tweets.id, tweetId))
    .limit(1);

  if (!tweet) throw new HttpError("Tweet no encontrado", 404);

  await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.tweetId, tweetId)));
}

// ---------------------------------------------------------------------------
// Listado de bookmarks con paginación
// ---------------------------------------------------------------------------

export interface BookmarksOpts {
  cursor?: string;
  limit?: number;
}

/**
 * Devuelve los tweets guardados por el viewer, ordenados por fecha de guardado
 * descendente, con paginación keyset.
 */
export async function getBookmarks(
  db: Database,
  viewerId: string,
  opts: BookmarksOpts = {},
): Promise<TweetPage> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  // Usamos tweetViewSelect y hacemos join con bookmarks para ordenar por createdAt del bookmark
  const decoded = opts.cursor ? decodeCursor(opts.cursor) : null;

  // Construimos la query base con la proyección enriquecida + join con bookmarks
  // para poder filtrar por userId y ordenar por bookmarks.createdAt
  let query = db
    .select({
      id: tweets.id,
      bmCreatedAt: bookmarks.createdAt,
      bmTweetId: bookmarks.tweetId,
    })
    .from(bookmarks)
    .innerJoin(tweets, eq(bookmarks.tweetId, tweets.id))
    .$dynamic();

  const userFilter = eq(bookmarks.userId, viewerId);

  const whereClause = decoded
    ? and(
        userFilter,
        or(
          lt(bookmarks.createdAt, decoded.t),
          and(
            sql`${bookmarks.createdAt} = ${decoded.t.toISOString()}`,
            lt(bookmarks.tweetId, decoded.id),
          ),
        ),
      )
    : userFilter;

  const bookmarkRows = await query
    .where(whereClause)
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.tweetId))
    .limit(limit + 1);

  const hasMore = bookmarkRows.length > limit;
  const page = hasMore ? bookmarkRows.slice(0, limit) : bookmarkRows;

  const lastRow = page[page.length - 1];
  const nextCursor =
    hasMore && lastRow ? encodeCursor(lastRow.bmCreatedAt, lastRow.bmTweetId) : null;

  // Hidratar cada tweet con tweetViewSelect
  const tweetViews = await Promise.all(
    page.map(async (row) => {
      const [tweetRow] = await tweetViewSelect(db, viewerId).where(eq(tweets.id, row.id)).limit(1);
      return tweetRow ? rowToTweetView(tweetRow) : null;
    }),
  );

  return {
    tweets: tweetViews.filter((t): t is NonNullable<typeof t> => t !== null),
    nextCursor,
  };
}
