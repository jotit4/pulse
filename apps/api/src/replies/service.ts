import type { TweetPage, TweetView } from "@pulse/shared";
import { asc, eq, gt, and, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import { tweets } from "../db/schema";
import { rowToTweetView, tweetViewSelect, getTweetViewById } from "../tweets/service";
import { createNotification } from "../notifications/service";
import { HttpError } from "../http/errors";
import { encodeCursor, decodeCursor } from "../timeline/service";

const uuidSchema = z.string().uuid();

// ---------------------------------------------------------------------------
// Crear una respuesta (reply)
// ---------------------------------------------------------------------------

/**
 * Crea un tweet con `parentId = parentTweetId`. Notifica al autor del tweet padre
 * (excepto si el actor es el mismo autor). Devuelve `TweetView`.
 */
export async function createReply(
  db: Database,
  authorId: string,
  parentTweetId: string,
  content: string,
): Promise<TweetView> {
  if (!uuidSchema.safeParse(parentTweetId).success) {
    throw new HttpError("Tweet no encontrado", 404);
  }

  // Verificar que el tweet padre existe y obtener su autor para notificación
  const [parent] = await db
    .select({ id: tweets.id, authorId: tweets.authorId })
    .from(tweets)
    .where(eq(tweets.id, parentTweetId))
    .limit(1);

  if (!parent) throw new HttpError("Tweet no encontrado", 404);

  // Insertar el reply
  const [created] = await db
    .insert(tweets)
    .values({ authorId, content, parentId: parentTweetId })
    .returning({ id: tweets.id });

  const view = await getTweetViewById(db, created!.id, authorId);

  // Notificar al autor del tweet padre (best-effort)
  await createNotification(db, {
    userId: parent.authorId,
    actorId: authorId,
    type: "reply",
    tweetId: created!.id,
  });

  return view!;
}

// ---------------------------------------------------------------------------
// Listar replies de un tweet
// ---------------------------------------------------------------------------

export interface RepliesOpts {
  cursor?: string;
  limit?: number;
}

/**
 * Devuelve las respuestas directas de un tweet (parentId = :id),
 * en orden cronológico ascendente (hilo), con paginación keyset.
 */
export async function getReplies(
  db: Database,
  tweetId: string,
  viewerId: string,
  opts: RepliesOpts = {},
): Promise<TweetPage> {
  if (!uuidSchema.safeParse(tweetId).success) {
    throw new HttpError("Tweet no encontrado", 404);
  }

  // Verificar existencia del tweet padre
  const [parent] = await db
    .select({ id: tweets.id })
    .from(tweets)
    .where(eq(tweets.id, tweetId))
    .limit(1);

  if (!parent) throw new HttpError("Tweet no encontrado", 404);

  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  let query = tweetViewSelect(db, viewerId);

  // Para el hilo ascendente usamos cursor (createdAt, id) en sentido ascendente
  const decoded = opts.cursor ? decodeCursor(opts.cursor) : null;

  const parentFilter = eq(tweets.parentId, tweetId);

  const whereClause = decoded
    ? and(
        parentFilter,
        or(
          gt(tweets.createdAt, decoded.t),
          and(sql`${tweets.createdAt} = ${decoded.t.toISOString()}`, gt(tweets.id, decoded.id)),
        ),
      )
    : parentFilter;

  const rows = await query
    .where(whereClause)
    .orderBy(asc(tweets.createdAt), asc(tweets.id))
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

// ---------------------------------------------------------------------------
// Thread: tweet + su padre
// ---------------------------------------------------------------------------

/**
 * Devuelve el tweet con id :id y su padre directo (si lo tiene).
 * Lanza 404 si el tweet no existe.
 */
export async function getThread(
  db: Database,
  tweetId: string,
  viewerId: string,
): Promise<{ tweet: TweetView; parent: TweetView | null }> {
  const tweet = await getTweetViewById(db, tweetId, viewerId);
  if (!tweet) throw new HttpError("Tweet no encontrado", 404);

  let parent: TweetView | null = null;
  if (tweet.parentId) {
    parent = await getTweetViewById(db, tweet.parentId, viewerId);
  }

  return { tweet, parent };
}
