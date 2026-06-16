import type { RegisterInput } from "@pulse/shared";
import { and, eq, gt, or } from "drizzle-orm";
import type { Database } from "../db";
import { sessions, users, type User } from "../db/schema";
import { hashPassword, verifyPassword } from "./password";
import { generateSessionToken, hashToken } from "./tokens";
import type { PublicUser } from "@pulse/shared";

/** Error de negocio de auth con el status HTTP que le corresponde. */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 401 | 409,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Proyecta un usuario de la DB a su forma pública (sin hash ni email). */
export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function registerUser(db: Database, input: RegisterInput): Promise<User> {
  const username = input.username.toLowerCase();
  const email = input.email.toLowerCase();

  const existing = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)));

  if (existing.some((e) => e.username === username)) {
    throw new AuthError("Ese nombre de usuario ya está en uso", 409);
  }
  if (existing.some((e) => e.email === email)) {
    throw new AuthError("Ese email ya está registrado", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ username, name: input.name, email, passwordHash })
    .returning();

  return user!;
}

export async function loginUser(db: Database, identifier: string, password: string): Promise<User> {
  const id = identifier.toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.username, id), eq(users.email, id)))
    .limit(1);

  // Mensaje genérico a propósito: no revelamos si el usuario existe.
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw new AuthError("Email/usuario o contraseña incorrectos", 401);
  }
  return user;
}

/** Crea una sesión y devuelve el token en claro (sólo se conoce en este momento). */
export async function createSession(
  db: Database,
  userId: string,
  ttlDays: number,
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return token;
}

/** Devuelve el usuario dueño de un token de sesión válido y no expirado, o null. */
export async function validateSessionToken(db: Database, token: string): Promise<User | null> {
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
}

export async function destroySession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
