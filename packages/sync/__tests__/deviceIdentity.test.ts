import { describe, it, expect } from "vitest";
import { createDeviceIdentity, joinNetwork } from "../src/deviceIdentity";
import { createSimpleCrypto } from "../src/crypto";

const crypto = createSimpleCrypto();

describe("createDeviceIdentity", () => {
  it("generates a unique device identity", async () => {
    const identity = await createDeviceIdentity(crypto);
    expect(identity.deviceId).toBeTruthy();
    expect(identity.networkId).toBeTruthy();
    expect(identity.publicKey).toBeTruthy();
    expect(identity.privateKey).toBeTruthy();
    expect(identity.networkId).toHaveLength(6);
  });

  it("generates different IDs each time", async () => {
    const a = await createDeviceIdentity(crypto);
    const b = await createDeviceIdentity(crypto);
    expect(a.deviceId).not.toBe(b.deviceId);
    expect(a.networkId).not.toBe(b.networkId);
  });
});

describe("joinNetwork", () => {
  it("updates networkId while keeping other fields", async () => {
    const identity = await createDeviceIdentity(crypto);
    const joined = joinNetwork(identity, "ABC123");
    expect(joined.networkId).toBe("ABC123");
    expect(joined.deviceId).toBe(identity.deviceId);
    expect(joined.publicKey).toBe(identity.publicKey);
  });
});
