import type { TweetView } from "@pulse/shared";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import { bookmarks, likes, tweets, users } from "../db/schema";
import { tweetBus } from "../events/bus";
import { HttpError } from "../http/errors";

const uuidSchema = z.string().uuid();

interface TweetViewRow {
  id: string;
  content: string;
  createdAt: Date;
  parentId: string | null;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl: string | null;
  likesCount: number;
  likedByMe: boolean;
  replyCount: number;
  bookmarkedByMe: boolean;
}

/**
 * Select base de tweets enriquecidos (autor + contadores + flags del viewer).
 * Usa `.$dynamic()` para que el timeline pueda encadenar where/orderBy/limit y
 * reutilizar exactamente la misma proyección. Los contadores se resuelven con
 * subconsultas correlacionadas en lugar de denormalizar (ver README, trade-offs).
 */
export function tweetViewSelect(db: Database, viewerId: string) {
  return db
    .select({
      id: tweets.id,
      content: tweets.content,
      createdAt: tweets.createdAt,
      parentId: tweets.parentId,
      authorId: users.id,
      authorUsername: users.username,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      likesCount: sql<number>`(select count(*)::int from ${likes} where ${likes.tweetId} = ${tweets.id})`,
      likedByMe: sql<boolean>`exists (select 1 from ${likes} where ${likes.tweetId} = ${tweets.id} and ${likes.userId} = ${viewerId})`,
      replyCount: sql<number>`(select count(*)::int from ${tweets} t2 where t2.parent_id = ${tweets.id})`,
      bookmarkedByMe: sql<boolean>`exists (select 1 from ${bookmarks} where ${bookmarks.tweetId} = ${tweets.id} and ${bookmarks.userId} = ${viewerId})`,
    })
    .from(tweets)
    .innerJoin(users, eq(tweets.authorId, users.id))
    .$dynamic();
}

export function rowToTweetView(r: TweetViewRow): TweetView {
  return {
    id: r.id,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    parentId: r.parentId ?? null,
    author: {
      id: r.authorId,
      username: r.authorUsername,
      name: r.authorName,
      avatarUrl: r.authorAvatarUrl,
    },
    likesCount: Number(r.likesCount),
    likedByMe: Boolean(r.likedByMe),
    replyCount: Number(r.replyCount),
    bookmarkedByMe: Boolean(r.bookmarkedByMe),
  };
}

export async function getTweetViewById(
  db: Database,
  id: string,
  viewerId: string,
): Promise<TweetView | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const [row] = await tweetViewSelect(db, viewerId).where(eq(tweets.id, id)).limit(1);
  return row ? rowToTweetView(row) : null;
}

export async function createTweet(
  db: Database,
  authorId: string,
  content: string,
): Promise<TweetView> {
  const [created] = await db
    .insert(tweets)
    .values({ authorId, content })
    .returning({ id: tweets.id });
  const view = await getTweetViewById(db, created!.id, authorId);

  // Publicamos el evento al bus para que los viewers en tiempo real lo reciban.
  // El authorId viaja internamente para filtrar visibilidad; no sale por la API.
  tweetBus.publishTweet({ tweet: view!, authorId });

  return view!;
}

/** Borra un tweet propio. 404 si no existe, 403 si pertenece a otra persona. */
export async function deleteTweet(db: Database, id: string, userId: string): Promise<void> {
  if (!uuidSchema.safeParse(id).success) {
    throw new HttpError("Tweet no encontrado", 404);
  }
  const [tweet] = await db
    .select({ authorId: tweets.authorId })
    .from(tweets)
    .where(eq(tweets.id, id))
    .limit(1);

  if (!tweet) throw new HttpError("Tweet no encontrado", 404);
  if (tweet.authorId !== userId) {
    throw new HttpError("No podés eliminar tweets de otra persona", 403);
  }

  await db.delete(tweets).where(eq(tweets.id, id));
}
