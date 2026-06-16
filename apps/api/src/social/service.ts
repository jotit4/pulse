import type { PublicUser } from "@pulse/shared";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import { follows, likes, tweets, users } from "../db/schema";
import { HttpError } from "../http/errors";
import { toPublicUser } from "../auth/service";

const uuidSchema = z.string().uuid();

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

/**
 * Da like a un tweet. Si el tweet no existe lanza 404.
 * Idempotente: si ya estaba likeado no falla.
 */
export async function likeTweet(
  db: Database,
  userId: string,
  tweetId: string,
): Promise<{ likesCount: number; likedByMe: true }> {
  if (!uuidSchema.safeParse(tweetId).success) {
    throw new HttpError("Tweet no encontrado", 404);
  }

  const [tweet] = await db
    .select({ id: tweets.id })
    .from(tweets)
    .where(eq(tweets.id, tweetId))
    .limit(1);

  if (!tweet) throw new HttpError("Tweet no encontrado", 404);

  await db.insert(likes).values({ userId, tweetId }).onConflictDoNothing();

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(likes)
    .where(eq(likes.tweetId, tweetId));
  const count = countRows[0]?.count ?? 0;

  return { likesCount: Number(count), likedByMe: true };
}

/**
 * Quita el like a un tweet. Si el tweet no existe lanza 404.
 * Idempotente: si no había like no falla.
 */
export async function unlikeTweet(
  db: Database,
  userId: string,
  tweetId: string,
): Promise<{ likesCount: number; likedByMe: false }> {
  if (!uuidSchema.safeParse(tweetId).success) {
    throw new HttpError("Tweet no encontrado", 404);
  }

  const [tweet] = await db
    .select({ id: tweets.id })
    .from(tweets)
    .where(eq(tweets.id, tweetId))
    .limit(1);

  if (!tweet) throw new HttpError("Tweet no encontrado", 404);

  await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.tweetId, tweetId)));

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(likes)
    .where(eq(likes.tweetId, tweetId));
  const count = countRows[0]?.count ?? 0;

  return { likesCount: Number(count), likedByMe: false };
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

/**
 * Resuelve un username a su fila de usuario. Lanza 404 si no existe.
 */
async function resolveUsername(db: Database, username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!user) throw new HttpError("Usuario no encontrado", 404);
  return user;
}

/**
 * Sigue a otro usuario. Lanza 404 si no existe, 400 si intenta seguirse a sí mismo.
 * Idempotente: si ya lo seguía no falla.
 */
export async function followUser(
  db: Database,
  followerId: string,
  targetUsername: string,
): Promise<{ following: true; followersCount: number }> {
  const target = await resolveUsername(db, targetUsername);

  if (target.id === followerId) {
    throw new HttpError("No podés seguirte a vos mismo", 400);
  }

  await db.insert(follows).values({ followerId, followingId: target.id }).onConflictDoNothing();

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, target.id));
  const count = countRows[0]?.count ?? 0;

  return { following: true, followersCount: Number(count) };
}

/**
 * Deja de seguir a un usuario. Lanza 404 si el usuario no existe.
 * Idempotente: si no lo seguía no falla.
 */
export async function unfollowUser(
  db: Database,
  followerId: string,
  targetUsername: string,
): Promise<{ following: false; followersCount: number }> {
  const target = await resolveUsername(db, targetUsername);

  await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, target.id)));

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, target.id));
  const count = countRows[0]?.count ?? 0;

  return { following: false, followersCount: Number(count) };
}

// ---------------------------------------------------------------------------
// Listados de followers / following
// ---------------------------------------------------------------------------

/**
 * Devuelve los usuarios que siguen a `username`. Lanza 404 si el usuario no existe.
 */
export async function listFollowers(db: Database, username: string): Promise<PublicUser[]> {
  const target = await resolveUsername(db, username);

  const rows = await db
    .select({ user: users })
    .from(follows)
    .innerJoin(users, eq(follows.followerId, users.id))
    .where(eq(follows.followingId, target.id));

  return rows.map((r) => toPublicUser(r.user));
}

/**
 * Devuelve los usuarios a los que sigue `username`. Lanza 404 si el usuario no existe.
 */
export async function listFollowing(db: Database, username: string): Promise<PublicUser[]> {
  const target = await resolveUsername(db, username);

  const rows = await db
    .select({ user: users })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(eq(follows.followerId, target.id));

  return rows.map((r) => toPublicUser(r.user));
}
