import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../test/helpers/db";
import type { DbHandle } from "./index";
import { tweets, users } from "./schema";

describe("schema (PGlite)", () => {
  let handle: DbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
  });

  afterEach(async () => {
    await handle.close();
  });

  it("aplica migraciones e inserta/lee un usuario", async () => {
    const { db } = handle;
    const [created] = await db
      .insert(users)
      .values({ username: "juan", name: "Juan", email: "juan@example.com", passwordHash: "x" })
      .returning();

    expect(created?.id).toBeTruthy();
    expect(created?.bio).toBe(""); // default

    const found = await db.query.users.findFirst({ where: eq(users.id, created!.id) });
    expect(found?.username).toBe("juan");
  });

  it("rechaza un username duplicado (índice único)", async () => {
    const { db } = handle;
    await db
      .insert(users)
      .values({ username: "dup", name: "A", email: "a@example.com", passwordHash: "x" });

    await expect(
      db
        .insert(users)
        .values({ username: "dup", name: "B", email: "b@example.com", passwordHash: "x" }),
    ).rejects.toThrow();
  });

  it("rechaza un tweet de más de 280 caracteres (CHECK)", async () => {
    const { db } = handle;
    const [author] = await db
      .insert(users)
      .values({ username: "len", name: "L", email: "l@example.com", passwordHash: "x" })
      .returning();

    await expect(
      db.insert(tweets).values({ authorId: author!.id, content: "a".repeat(281) }),
    ).rejects.toThrow();
  });

  it("elimina en cascada los tweets al borrar su autor", async () => {
    const { db } = handle;
    const [author] = await db
      .insert(users)
      .values({ username: "casc", name: "C", email: "c@example.com", passwordHash: "x" })
      .returning();
    await db.insert(tweets).values({ authorId: author!.id, content: "hola" });

    await db.delete(users).where(eq(users.id, author!.id));

    const remaining = await db.select().from(tweets);
    expect(remaining).toHaveLength(0);
  });
});
