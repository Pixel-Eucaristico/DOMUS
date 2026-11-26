import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { parsePatchFile } = require("patch-package/dist/patch/parse") as {
  parsePatchFile: (file: string) => unknown[];
};

const ROOT = path.resolve(__dirname, "../..");
const PATCH_PATH = path.resolve(
  __dirname,
  "../react-native-sprinkle-toast+1.0.1.patch",
);
const PATCHED_FILES = [
  "node_modules/react-native-sprinkle-toast/src/Sprinkles.tsx",
  "node_modules/react-native-sprinkle-toast/src/ToastItem.tsx",
  "node_modules/react-native-sprinkle-toast/src/ToastProvider.tsx",
];

describe("react-native-sprinkle-toast+1.0.1.patch (SDK 57 / RN 0.86)", () => {
  const rawPatch = fs.readFileSync(PATCH_PATH, "utf8");
  const patchLf = rawPatch.replace(/\r\n/g, "\n");
  const patchCrlf = patchLf.replace(/\n/g, "\r\n");

  it("é analisado sem erro pelo patch-package (original, LF e CRLF) com 3 arquivos", () => {
    expect(parsePatchFile(rawPatch)).toHaveLength(3);
    expect(parsePatchFile(patchLf)).toHaveLength(3);
    expect(parsePatchFile(patchCrlf)).toHaveLength(3);
  });

  it("substitui StyleSheet.absoluteFillObject por StyleSheet.absoluteFill em cada um dos 3 hunks", () => {
    const sections = patchLf.split(/^diff --git /m).slice(1);
    expect(sections).toHaveLength(3);

    for (const file of PATCHED_FILES) {
      const section = sections.find((s) => s.includes(`a/${file} b/${file}`));
      expect(section, `seção ausente para ${file}`).toBeDefined();
      expect(section).toMatch(/^-.*StyleSheet\.absoluteFillObject/m);
      expect(section).toMatch(/^\+.*StyleSheet\.absoluteFill\b/m);
      expect(section).not.toMatch(/^\+.*StyleSheet\.absoluteFillObject/m);
    }
  });

  it("está aplicado nos 3 arquivos instalados em node_modules/react-native-sprinkle-toast/src", () => {
    for (const file of PATCHED_FILES) {
      const fullPath = path.join(ROOT, file);
      expect(fs.existsSync(fullPath), `${file} não encontrado`).toBe(true);
      const source = fs.readFileSync(fullPath, "utf8");
      expect(source).toContain("StyleSheet.absoluteFill");
      expect(source).not.toContain("StyleSheet.absoluteFillObject");
    }
  });

  it("fixa versão exata 1.0.1 em package.json e package-lock.json com patch-package no postinstall", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8")) as {
      packages?: Record<string, { version?: string; dependencies?: Record<string, string> }>;
    };

    expect(pkg.dependencies?.["react-native-sprinkle-toast"]).toBe("1.0.1");
    expect(pkg.scripts?.postinstall ?? "").toMatch(/\bpatch-package\b/);
    expect(lock.packages?.[""]?.dependencies?.["react-native-sprinkle-toast"]).toBe("1.0.1");
    expect(lock.packages?.["node_modules/react-native-sprinkle-toast"]?.version).toBe("1.0.1");
  });
});
