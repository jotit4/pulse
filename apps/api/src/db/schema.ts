import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Usuarios. `username` y `email` se normalizan a minúsculas en la capa de
 * aplicación, por eso los índices únicos son sobre la columna tal cual (sin
 * expresiones), lo que mantiene las migraciones simples y portables.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    bio: text("bio").notNull().default(""),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_username_unique").on(t.username),
    uniqueIndex("users_email_unique").on(t.email),
    index("users_name_idx").on(t.name),
  ],
);

/**
 * Sesiones. La cookie del cliente lleva un token opaco aleatorio; en la base
 * sólo guardamos su SHA-256 (`tokenHash`). Si la DB se filtra, los tokens no
 * son reutilizables. El logout/expiración es un simple DELETE/where.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
  ],
);

/**
 * Tweets. El límite de 280 caracteres se valida en la API (Zod) y además se
 * refuerza con un CHECK en la base como última línea de defensa.
 * `parentId` es nullable; cuando está presente, el tweet es una respuesta.
 */
export const tweets = pgTable(
  "tweets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    parentId: uuid("parent_id").references((): any => tweets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Para listar el timeline de un autor en orden cronológico.
    index("tweets_author_created_idx").on(t.authorId, t.createdAt),
    // Para el cursor keyset global (created_at, id).
    index("tweets_created_id_idx").on(t.createdAt, t.id),
    // Para listar replies de un tweet padre.
    index("tweets_parent_id_idx").on(t.parentId),
    check("tweets_content_len", sql`char_length(${t.content}) between 1 and 280`),
  ],
);

/**
 * Grafo de follows. Clave primaria compuesta (follower, following) que impide
 * follows duplicados; un CHECK evita que alguien se siga a sí mismo.
 */
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId),
    check("follows_no_self", sql`${t.followerId} <> ${t.followingId}`),
  ],
);

/**
 * Likes. Clave primaria compuesta (user, tweet) → un like por usuario y tweet
 * (idempotente). El índice por tweet acelera el conteo de likes.
 */
export const likes = pgTable(
  "likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tweetId: uuid("tweet_id")
      .notNull()
      .references(() => tweets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tweetId] }), index("likes_tweet_idx").on(t.tweetId)],
);

/**
 * Bookmarks. Clave primaria compuesta (userId, tweetId).
 * El índice por tweetId acelera el recuento de guardados.
 */
export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tweetId: uuid("tweet_id")
      .notNull()
      .references(() => tweets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.tweetId] }),
    index("bookmarks_tweet_idx").on(t.tweetId),
  ],
);

/** Enum de tipo de notificación. */
export const notificationTypeEnum = pgEnum("notification_type", ["follow", "like", "reply"]);

/**
 * Notificaciones. userId = destinatario, actorId = quien realizó la acción.
 * Se indexa por (userId, createdAt) para listar eficientemente, y por
 * (userId, read) para contar no leídas.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    tweetId: uuid("tweet_id").references(() => tweets.id, { onDelete: "cascade" }),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
    index("notifications_user_read_idx").on(t.userId, t.read),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Tweet = typeof tweets.$inferSelect;
export type NewTweet = typeof tweets.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
