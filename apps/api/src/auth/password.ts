import { hash, verify } from "@node-rs/argon2";

/**
 * Hashing de contraseñas con Argon2id (algoritmo por defecto de la librería),
 * el estándar recomendado actualmente frente a bcrypt para nuevas aplicaciones.
 */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return verify(hashed, plain);
}
