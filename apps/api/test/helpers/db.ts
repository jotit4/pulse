import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database, DbHandle } from "../../src/db";
import { schema } from "../../src/db";

/**
 * Crea una base de datos efímera en memoria con PGlite (Postgres real compilado
 * a WASM) y le aplica las mismas migraciones que producción. Cada test obtiene
 * una instancia aislada → sin estado compartido ni necesidad de un Postgres real.
 *
 * El cast a `Database` es seguro: la API de Drizzle es idéntica entre el driver
 * postgres-js (prod) y PGlite (tests); sólo cambia el transporte subyacente.
 */
export async function createTestDb(): Promise<DbHandle> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return {
    db: db as unknown as Database,
    close: async () => {
      await client.close();
    },
  };
}
