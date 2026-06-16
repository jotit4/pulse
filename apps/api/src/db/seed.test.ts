import { count, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "../auth/password";
import type { DbHandle } from "../db";
import { createTestDb } from "../../test/helpers/db";
import { follows, likes, tweets, users } from "./schema";
import { seedDatabase } from "./seed";

describe("seedDatabase", () => {
  let handle: DbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
  });

  afterEach(async () => {
    await handle.close();
  });

  it("inserta ≥10 usuarios", async () => {
    await seedDatabase(handle.db);
    const [row] = await handle.db.select({ total: count() }).from(users);
    expect(row!.total).toBeGreaterThanOrEqual(10);
  });

  it("inserta tweets (cantidad > 0)", async () => {
    await seedDatabase(handle.db);
    const [row] = await handle.db.select({ total: count() }).from(tweets);
    expect(row!.total).toBeGreaterThan(0);
  });

  it("inserta follows (cantidad > 0)", async () => {
    await seedDatabase(handle.db);
    const [row] = await handle.db.select({ total: count() }).from(follows);
    expect(row!.total).toBeGreaterThan(0);
  });

  it("inserta likes (cantidad > 0)", async () => {
    await seedDatabase(handle.db);
    const [row] = await handle.db.select({ total: count() }).from(likes);
    expect(row!.total).toBeGreaterThan(0);
  });

  it("es idempotente: ejecutar dos veces no falla ni duplica datos", async () => {
    await seedDatabase(handle.db);
    const [antes] = await handle.db.select({ total: count() }).from(users);

    // Segunda ejecución: no debe lanzar error
    await expect(seedDatabase(handle.db)).resolves.toBeUndefined();

    const [despues] = await handle.db.select({ total: count() }).from(users);
    // Debe haber exactamente la misma cantidad de usuarios (borró y volvió a insertar)
    expect(despues!.total).toBe(antes!.total);
  });

  it("el password de los usuarios de ejemplo se verifica correctamente", async () => {
    await seedDatabase(handle.db);
    // Tomamos el primer usuario insertado
    const [usuario] = await handle.db.select().from(users).limit(1);
    expect(usuario).toBeDefined();
    const valido = await verifyPassword(usuario!.passwordHash, "password123");
    expect(valido).toBe(true);
  });

  it("el password incorrecto no verifica", async () => {
    await seedDatabase(handle.db);
    const [usuario] = await handle.db.select().from(users).limit(1);
    const invalido = await verifyPassword(usuario!.passwordHash, "contraseniaerronea");
    expect(invalido).toBe(false);
  });

  it("usernames y emails están en minúsculas", async () => {
    await seedDatabase(handle.db);
    const todos = await handle.db
      .select({ username: users.username, email: users.email })
      .from(users);
    for (const u of todos) {
      expect(u.username).toBe(u.username.toLowerCase());
      expect(u.email).toBe(u.email.toLowerCase());
    }
  });

  it("no hay follows duplicados (la PK compuesta lo garantiza y el seed no los genera)", async () => {
    await seedDatabase(handle.db);
    const resultado = await handle.db
      .select({
        followerId: follows.followerId,
        followingId: follows.followingId,
        cnt: sql<number>`count(*)`.as("cnt"),
      })
      .from(follows)
      .groupBy(follows.followerId, follows.followingId);
    for (const row of resultado) {
      expect(Number(row.cnt)).toBe(1);
    }
  });
});
