import { describe, it, expect } from "vitest";
import { createSimpleCrypto } from "../src/crypto";

const crypto = createSimpleCrypto();

describe("SimpleCrypto", () => {
  it("generates a key pair", async () => {
    const keys = await crypto.generateKeyPair();
    expect(keys.publicKey).toBeTruthy();
    expect(keys.privateKey).toBeTruthy();
  });

  it("generates different keys each time", async () => {
    const a = await crypto.generateKeyPair();
    const b = await crypto.generateKeyPair();
    expect(a.publicKey).not.toBe(b.publicKey);
  });

  it("signs data", async () => {
    const keys = await crypto.generateKeyPair();
    const signature = await crypto.sign("hello", keys.privateKey);
    expect(signature).toBeTruthy();
  });

  it("produces consistent signatures", async () => {
    const keys = await crypto.generateKeyPair();
    const s1 = await crypto.sign("hello", keys.privateKey);
    const s2 = await crypto.sign("hello", keys.privateKey);
    expect(s1).toBe(s2);
  });

  it("produces different signatures for different data", async () => {
    const keys = await crypto.generateKeyPair();
    const s1 = await crypto.sign("hello", keys.privateKey);
    const s2 = await crypto.sign("world", keys.privateKey);
    expect(s1).not.toBe(s2);
  });
});
