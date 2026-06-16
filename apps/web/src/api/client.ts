import type {
  PublicUser,
  UserProfile,
  TweetView,
  TweetPage,
  RegisterInput,
  LoginInput,
  CreateTweetInput,
} from "@pulse/shared";

const BASE = (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

/** Base del API (misma que usa el cliente HTTP), p. ej. para abrir un EventSource. */
export const API_BASE = BASE;

/** Error tipado de la API: incluye el status HTTP. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Función base para todas las peticiones a la API. */
async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include",
  };

  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, init);

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // Si no puede parsear el JSON, usa el mensaje genérico
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  register: (input: RegisterInput) => req<{ user: PublicUser }>("POST", "/auth/register", input),

  login: (input: LoginInput) => req<{ user: PublicUser }>("POST", "/auth/login", input),

  logout: () => req<{ ok: boolean }>("POST", "/auth/logout"),

  me: () => req<{ user: PublicUser }>("GET", "/auth/me"),
};

// ---------------------------------------------------------------------------
// Tweets
// ---------------------------------------------------------------------------

export const tweetsApi = {
  create: (input: CreateTweetInput) => req<{ tweet: TweetView }>("POST", "/tweets", input),

  delete: (id: string) => req<{ ok: boolean }>("DELETE", `/tweets/${id}`),
};

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const timelineApi = {
  get: (cursor?: string) => {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return req<TweetPage>("GET", `/timeline${qs}`);
  },
};

// ---------------------------------------------------------------------------
// Social (likes + follows)
// ---------------------------------------------------------------------------

export const socialApi = {
  like: (tweetId: string) =>
    req<{ likesCount: number; likedByMe: boolean }>("POST", `/tweets/${tweetId}/like`),

  unlike: (tweetId: string) =>
    req<{ likesCount: number; likedByMe: boolean }>("DELETE", `/tweets/${tweetId}/like`),

  follow: (username: string) =>
    req<{ following: boolean; followersCount: number }>("POST", `/users/${username}/follow`),

  unfollow: (username: string) =>
    req<{ following: boolean; followersCount: number }>("DELETE", `/users/${username}/follow`),

  followers: (username: string) =>
    req<{ users: PublicUser[] }>("GET", `/users/${username}/followers`),

  following: (username: string) =>
    req<{ users: PublicUser[] }>("GET", `/users/${username}/following`),
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const usersApi = {
  search: (q: string, limit?: number) => {
    const params = new URLSearchParams({ q });
    if (limit !== undefined) params.set("limit", String(limit));
    return req<{ users: PublicUser[] }>("GET", `/users/search?${params.toString()}`);
  },

  profile: (username: string) => req<{ user: UserProfile }>("GET", `/users/${username}`),

  tweets: (username: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const qs = params.size > 0 ? `?${params.toString()}` : "";
    return req<TweetPage>("GET", `/users/${username}/tweets${qs}`);
  },
};
