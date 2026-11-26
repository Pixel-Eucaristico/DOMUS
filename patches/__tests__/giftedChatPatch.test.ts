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
  "../react-native-gifted-chat+3.3.2.patch",
);

describe("react-native-gifted-chat+3.3.2.patch (SDK 57 / RN 0.86)", () => {
  const rawPatch = fs.readFileSync(PATCH_PATH, "utf8");
  const patchLf = rawPatch.replace(/\r\n/g, "\n");
  const patchCrlf = patchLf.replace(/\n/g, "\r\n");

  it("é analisado sem erro pelo patch-package (original, LF e CRLF)", () => {
    expect(parsePatchFile(rawPatch)).toHaveLength(3);
    expect(parsePatchFile(patchLf)).toHaveLength(3);
    expect(parsePatchFile(patchCrlf)).toHaveLength(3);
  });

  it("remove o @ts-expect-error obsoleto no KeyboardAvoidingView (RN 0.86 / keyboard-controller 1.21.9)", () => {
    expect(patchLf).toContain("-          {/* @ts-expect-error */}");
  });

  it("usa import type para ColorSchemeName e preserva null e undefined no retorno de getColorScheme", () => {
    expect(patchLf).toContain("+import type { ColorSchemeName } from 'react-native'");
    expect(patchLf).toContain("+  getColorScheme(): ColorSchemeName | null | undefined");
  });

  it("fixa versão exata 3.3.2 em package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["react-native-gifted-chat"]).toBe("3.3.2");
  });
});
