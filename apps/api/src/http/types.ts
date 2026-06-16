import type { PublicUser } from "@pulse/shared";

/** Variables que el middleware de auth deja disponibles en el contexto Hono. */
export type AppEnv = {
  Variables: {
    user: PublicUser;
    sessionToken: string;
  };
};
