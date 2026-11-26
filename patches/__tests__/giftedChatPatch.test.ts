import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { parsePatchFile } = require("patch-package/dist/patch/parse") as {
  parsePatchFile: (file: string) => unknown[];
};

const PATCH_PATH = path.resolve(
  __dirname,
  "../react-native-gifted-chat+3.3.2.patch",
);

describe("react-native-gifted-chat+3.3.2.patch (SDK 55 / RN 0.83)", () => {
  const rawPatch = fs.readFileSync(PATCH_PATH, "utf8");
  const patchLf = rawPatch.replace(/\r\n/g, "\n");

  it("é analisado sem erro pelo patch-package (LF e CRLF)", () => {
    expect(parsePatchFile(rawPatch).length).toBeGreaterThan(0);
    expect(parsePatchFile(patchLf).length).toBeGreaterThan(0);
  });

  it("usa import type para ColorSchemeName e preserva null e undefined no retorno de getColorScheme", () => {
    expect(patchLf).toContain("+import type { ColorSchemeName } from 'react-native'");
    expect(patchLf).toContain("+  getColorScheme(): ColorSchemeName | null | undefined");
  });
});
