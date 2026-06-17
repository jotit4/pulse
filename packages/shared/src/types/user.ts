/** Representación pública de un usuario, segura para exponer en la API. */
export interface PublicUser {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  createdAt: string;
}

/** Usuario con contadores agregados, usado en perfiles. */
export interface UserProfile extends PublicUser {
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  /** Si el usuario autenticado sigue a este usuario. */
  isFollowing: boolean;
}

/** Resultado de búsqueda de usuario: incluye el estado real de follow del viewer. */
export interface UserSearchResult extends PublicUser {
  /** Si el usuario autenticado sigue a este usuario. */
  isFollowing: boolean;
}
