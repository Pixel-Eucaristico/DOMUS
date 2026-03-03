import { defineConfig } from "vitest/config";
import path from "path";

// Vitest config — resolves path aliases from tsconfig and @noble subpath exports.
// Noble packages export `./aes.js` but source imports use `./aes` (no extension);
// Vite's strict exports resolver needs explicit aliases to bridge the gap.

export default defineConfig({
  resolve: {
    alias: {
      // ─── tsconfig paths ──────────────────────────────────────────────────────
      "@/": path.resolve(__dirname, "./") + "/",
      "@packages/": path.resolve(__dirname, "./packages/") + "/",
      "@shared/": path.resolve(__dirname, "./shared/") + "/",

      // ─── @noble/ciphers subpath exports (./aes → ./aes.js) ──────────────────
      "@noble/ciphers/aes": path.resolve(__dirname, "node_modules/@noble/ciphers/aes.js"),
      "@noble/ciphers/utils": path.resolve(__dirname, "node_modules/@noble/ciphers/utils.js"),
      "@noble/ciphers/webcrypto": path.resolve(__dirname, "node_modules/@noble/ciphers/webcrypto.js"),

      // ─── @noble/hashes subpath exports ──────────────────────────────────────
      "@noble/hashes/pbkdf2": path.resolve(__dirname, "node_modules/@noble/hashes/pbkdf2.js"),
      "@noble/hashes/sha2": path.resolve(__dirname, "node_modules/@noble/hashes/sha2.js"),
      "@noble/hashes/utils": path.resolve(__dirname, "node_modules/@noble/hashes/utils.js"),
      "@noble/hashes/sha256": path.resolve(__dirname, "node_modules/@noble/hashes/sha256.js"),
    },
  },
});
