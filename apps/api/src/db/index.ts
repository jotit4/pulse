import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export interface DbHandle {
  db: Database;
  close: () => Promise<void>;
}

/** Crea una conexión Drizzle sobre postgres-js (driver de prod/dev). */
export function createDb(connectionString: string): DbHandle {
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  return {
    db,
    close: async () => {
      await client.end();
    },
  };
}

export { schema };
