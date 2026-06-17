import type { PublicUser, TweetPage, UserProfile, UserSearchResult } from "@pulse/shared";
import { and, eq, ilike, inArray, lt, ne, notInArray, or, sql } from "drizzle-orm";
import { toPublicUser } from "../auth/service";
import type { Database } from "../db";
import { follows, tweets, users, type User } from "../db/schema";
import { HttpError } from "../http/errors";
import { decodeCursor, encodeCursor } from "../timeline/service";
import { rowToTweetView, tweetViewSelect } from "../tweets/service";

/**
 * Resuelve un username (case-insensitive) a su fila completa. Lanza 404 si no
 * existe. Mismo criterio de normalización que el resto de la app (minúsculas).
 */
async function resolveUsername(db: Database, username: string): Promise<User> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!user) throw new HttpError("Usuario no encontrado", 404);
  return user;
}

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------

/**
 * Busca usuarios cuyo `username` o `name` contengan `q` (case-insensitive).
 * Devuelve `[]` para una consulta vacía. Escapamos los comodines de LIKE para
 * que el texto del usuario se trate como literal y no inyecte patrones.
 * El viewer nunca aparece en sus propios resultados (el backend rechaza el
 * auto-follow). Para cada resultado, incluye `isFollowing` real.
 */
export async function searchUsers(
  db: Database,
  q: string,
  viewerId: string,
  limit?: number,
): Promise<UserSearchResult[]> {
  const term = q.trim();
  if (!term) return [];

  const lim = Math.min(Math.max(limit ?? 20, 1), 50);
  const escaped = term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const pattern = `%${escaped}%`;

  const rows = await db
    .select()
    .from(users)
    .where(
      and(ne(users.id, viewerId), or(ilike(users.username, pattern), ilike(users.name, pattern))),
    )
    .orderBy(users.username)
    .limit(lim);

  if (rows.length === 0) return [];

  // Una sola consulta para determinar qué usuarios del conjunto sigue el viewer
  const resultIds = rows.map((r) => r.id);
  const followedRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, resultIds)));

  const followSet = new Set(followedRows.map((r) => r.followingId));

  return rows.map((row) => ({
    ...toPublicUser(row),
    isFollowing: followSet.has(row.id),
  }));
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

/**
 * Devuelve el perfil público de `username` con contadores agregados
 * (followers/following/tweets) y si el viewer lo sigue. Lanza 404 si no existe.
 * Los contadores se resuelven con COUNT por consulta (en paralelo) en lugar de
 * denormalizar, igual criterio que el módulo social.
 */
export async function getUserProfile(
  db: Database,
  username: string,
  viewerId: string,
): Promise<UserProfile> {
  const target = await resolveUsername(db, username);

  const count = sql<number>`count(*)::int`;

  const [[followersRow], [followingRow], [tweetsRow], [followRow]] = await Promise.all([
    db.select({ c: count }).from(follows).where(eq(follows.followingId, target.id)),
    db.select({ c: count }).from(follows).where(eq(follows.followerId, target.id)),
    db.select({ c: count }).from(tweets).where(eq(tweets.authorId, target.id)),
    db
      .select({ c: count })
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, target.id))),
  ]);

  return {
    ...toPublicUser(target),
    followersCount: Number(followersRow?.c ?? 0),
    followingCount: Number(followingRow?.c ?? 0),
    tweetsCount: Number(tweetsRow?.c ?? 0),
    isFollowing: Number(followRow?.c ?? 0) > 0,
  };
}

// ---------------------------------------------------------------------------
// Sugerencias de a quién seguir
// ---------------------------------------------------------------------------

/**
 * Devuelve hasta `limit` usuarios que el viewer todavía NO sigue (y que no son
 * el viewer mismo), ordenados por cantidad de followers DESC y luego por
 * `createdAt DESC` como desempate. `isFollowing` siempre es false aquí (por
 * definición: solo se muestran los que el viewer no sigue).
 */
export async function getUserSuggestions(
  db: Database,
  viewerId: string,
  limit?: number,
): Promise<UserSearchResult[]> {
  const lim = Math.min(Math.max(limit ?? 5, 1), 20);

  // IDs de los usuarios que el viewer ya sigue.
  const followedRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, viewerId));

  const followedIds = followedRows.map((r) => r.followingId);

  // Excluir al viewer y a los ya seguidos.
  const excludeClause =
    followedIds.length > 0
      ? and(ne(users.id, viewerId), notInArray(users.id, followedIds))
      : ne(users.id, viewerId);

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      followersCount: sql<number>`(select count(*)::int from ${follows} where ${follows.followingId} = ${users.id})`,
    })
    .from(users)
    .where(excludeClause)
    .orderBy(
      sql`(select count(*)::int from ${follows} where ${follows.followingId} = ${users.id}) desc`,
      sql`${users.createdAt} desc`,
    )
    .limit(lim);

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    name: row.name,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
    isFollowing: false,
  }));
}

// ---------------------------------------------------------------------------
// Tweets de un usuario
// ---------------------------------------------------------------------------

export interface UserTweetsOpts {
  cursor?: string;
  limit?: number;
}

/**
 * Devuelve los tweets de `username` en orden cronológico descendente, con
 * paginación keyset idéntica a la del timeline. Lanza 404 si no existe.
 */
export async function getUserTweets(
  db: Database,
  username: string,
  viewerId: string,
  opts: UserTweetsOpts = {},
): Promise<TweetPage> {
  const target = await resolveUsername(db, username);
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  const authorFilter = eq(tweets.authorId, target.id);
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

  const rows = await tweetViewSelect(db, viewerId)
    .where(whereClause)
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
