import type { Notification, NotificationPage } from "@pulse/shared";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db";
import { notifications, tweets, users } from "../db/schema";
import { toPublicUser } from "../auth/service";
import { decodeCursor, encodeCursor } from "../timeline/service";
import { getTweetViewById } from "../tweets/service";
import type { NotificationType } from "@pulse/shared";

const uuidSchema = z.string().uuid();

// ---------------------------------------------------------------------------
// Creación de notificaciones (uso interno — llamado desde otros services)
// ---------------------------------------------------------------------------

/**
 * Crea una notificación si actor != destinatario.
 * No lanza errores — si falla silenciosamente no queremos interrumpir el flujo principal.
 */
export async function createNotification(
  db: Database,
  opts: {
    userId: string;
    actorId: string;
    type: NotificationType;
    tweetId?: string | null;
  },
): Promise<void> {
  // Nunca auto-notificar
  if (opts.userId === opts.actorId) return;

  try {
    await db.insert(notifications).values({
      userId: opts.userId,
      actorId: opts.actorId,
      type: opts.type,
      tweetId: opts.tweetId ?? null,
    });
  } catch {
    // Silencioso: la notificación es best-effort
  }
}

// ---------------------------------------------------------------------------
// Listado de notificaciones
// ---------------------------------------------------------------------------

export interface NotificationsOpts {
  cursor?: string;
  limit?: number;
}

/**
 * Devuelve las notificaciones del viewer con paginación keyset.
 * Cada notificación incluye al actor (PublicUser) y, si aplica, el tweet.
 */
export async function getNotifications(
  db: Database,
  viewerId: string,
  opts: NotificationsOpts = {},
): Promise<NotificationPage> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  // Traemos las filas de notificaciones + datos del actor
  let baseQuery = db
    .select({
      id: notifications.id,
      type: notifications.type,
      tweetId: notifications.tweetId,
      read: notifications.read,
      createdAt: notifications.createdAt,
      actor: users,
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.actorId, users.id))
    .$dynamic();

  const decoded = opts.cursor ? decodeCursor(opts.cursor) : null;

  const whereClause = decoded
    ? and(
        eq(notifications.userId, viewerId),
        or(
          lt(notifications.createdAt, decoded.t),
          and(
            sql`${notifications.createdAt} = ${decoded.t.toISOString()}`,
            lt(notifications.id, decoded.id),
          ),
        ),
      )
    : eq(notifications.userId, viewerId);

  const rows = await baseQuery
    .where(whereClause)
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const lastRow = page[page.length - 1];
  const nextCursor = hasMore && lastRow ? encodeCursor(lastRow.createdAt, lastRow.id) : null;

  // Hidratamos tweets en paralelo (solo para notifs con tweetId)
  const notifList: Notification[] = await Promise.all(
    page.map(async (row) => {
      let tweet = undefined;
      if (row.tweetId && uuidSchema.safeParse(row.tweetId).success) {
        tweet = await getTweetViewById(db, row.tweetId, viewerId);
      }
      return {
        id: row.id,
        type: row.type as NotificationType,
        actor: toPublicUser(row.actor),
        tweet: tweet ?? null,
        read: row.read,
        createdAt: row.createdAt.toISOString(),
      };
    }),
  );

  return { notifications: notifList, nextCursor };
}

// ---------------------------------------------------------------------------
// Contador de no leídas
// ---------------------------------------------------------------------------

export async function getUnreadCount(db: Database, viewerId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, viewerId), eq(notifications.read, false)));
  return Number(rows[0]?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Marcar todas como leídas
// ---------------------------------------------------------------------------

export async function markAllRead(db: Database, viewerId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, viewerId), eq(notifications.read, false)));
}
