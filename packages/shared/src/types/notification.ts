import type { PublicUser } from "./user";
import type { TweetView } from "./tweet";

/** Tipos de notificación disponibles. */
export type NotificationType = "follow" | "like" | "reply";

/** Notificación tal como la consume el frontend. */
export interface Notification {
  id: string;
  type: NotificationType;
  /** Usuario que generó la acción (el actor). */
  actor: PublicUser;
  /** Tweet relacionado con la notificación (si aplica). */
  tweet?: TweetView | null;
  /** Si el destinatario ya la leyó. */
  read: boolean;
  createdAt: string;
}

/** Página de notificaciones con cursor. */
export interface NotificationPage {
  notifications: Notification[];
  nextCursor: string | null;
}
