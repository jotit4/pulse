import { z } from "zod";

/** Handle único del usuario (lo que va después de la @). */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "El usuario debe tener al menos 3 caracteres")
  .max(20, "El usuario no puede superar los 20 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "Solo se permiten letras, números y guion bajo");

export const registerSchema = z.object({
  username: usernameSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio").max(50),
  email: z.string().trim().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "La contraseña es demasiado larga"),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Ingresá tu email o usuario"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
