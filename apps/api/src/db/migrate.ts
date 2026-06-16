import { migrate } from "drizzle-orm/postgres-js/migrator";
import { loadEnv } from "../env";
import { createDb } from "./index";

/** Aplica las migraciones pendientes a la base Postgres apuntada por DATABASE_URL. */
const env = loadEnv();
if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL es requerida para aplicar migraciones");
}

const { db, close } = createDb(env.DATABASE_URL);
await migrate(db, { migrationsFolder: "drizzle" });
await close();
console.log("✅ Migraciones aplicadas");
