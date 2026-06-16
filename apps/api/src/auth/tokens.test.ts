import { describe, expect, it } from "vitest";
import { generateSessionToken, hashToken } from "./tokens";

describe("session tokens", () => {
  it("genera tokens únicos", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();

    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("hashea de forma determinística", () => {
    const token = generateSessionToken();

    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produce hashes distintos para tokens distintos", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});
