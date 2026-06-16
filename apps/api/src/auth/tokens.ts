import { createHash, randomBytes } from "node:crypto";

/** Token de sesión opaco de alta entropía (256 bits) que viaja en la cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 del token: es lo único que se persiste en la tabla `sessions`. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
