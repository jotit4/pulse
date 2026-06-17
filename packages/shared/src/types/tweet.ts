/** Autor embebido en la vista de un tweet (subconjunto público del usuario). */
export interface TweetAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

/** Forma de un tweet tal como lo consume el frontend. */
export interface TweetView {
  id: string;
  content: string;
  createdAt: string;
  author: TweetAuthor;
  likesCount: number;
  /** Si el usuario autenticado ya likeó este tweet. */
  likedByMe: boolean;
  /** Cantidad de respuestas directas (opcional para no romper consumidores existentes). */
  replyCount?: number;
  /** Si el usuario autenticado guardó este tweet en bookmarks (opcional). */
  bookmarkedByMe?: boolean;
  /** Id del tweet padre si es una respuesta (opcional). */
  parentId?: string | null;
}

/** Página de tweets con cursor para infinite scroll. */
export interface TweetPage {
  tweets: TweetView[];
  /** Cursor opaco para pedir la página siguiente; null si no hay más. */
  nextCursor: string | null;
}
