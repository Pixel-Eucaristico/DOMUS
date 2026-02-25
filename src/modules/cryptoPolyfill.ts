import * as ExpoCrypto from "expo-crypto";

if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = {};
}

if (typeof globalThis.crypto.getRandomValues !== "function") {
  (globalThis.crypto as any).getRandomValues = function <
    T extends ArrayBufferView,
  >(array: T): T {
    const bytes = ExpoCrypto.getRandomBytes(array.byteLength);
    const target = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength,
    );
    target.set(bytes);
    return array;
  };
}
