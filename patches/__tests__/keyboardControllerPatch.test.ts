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
  "../../docs/patches-sdk-55-pendentes/react-native-keyboard-controller+1.18.5.patch",
);

const APPLIED_KT_PATH = path.resolve(
  __dirname,
  "../../node_modules/react-native-keyboard-controller/android/src/main/java/com/reactnativekeyboardcontroller/views/EdgeToEdgeReactViewGroup.kt",
);

const INSTALLED_PKG_PATH = path.resolve(
  __dirname,
  "../../node_modules/react-native-keyboard-controller/package.json",
);

describe("react-native-keyboard-controller+1.18.5.patch (Android 16 — pendente de reavaliação na Story 8.2)", () => {
  const rawPatch = fs.readFileSync(PATCH_PATH, "utf8");
  const patchLf = rawPatch.replace(/\r\n/g, "\n");

  it("é analisado sem erro pelo patch-package (hunk headers íntegros em LF e CRLF)", () => {
    const parsedRaw = parsePatchFile(rawPatch);
    const parsedLf = parsePatchFile(patchLf);
    expect(parsedRaw.length).toBeGreaterThan(0);
    expect(parsedLf.length).toBeGreaterThan(0);
  });

  it("mantém a limpeza de filhos nulos em dispatchDraw contra dispatchGetDisplayList no Android 16", () => {
    expect(patchLf).toContain("private fun cleanNullChildren()");
    expect(patchLf).toContain("override fun dispatchDraw(canvas: Canvas)");
  });

  it("não altera removeKeyboardCallbacks para remoção síncrona (evita NPE em ViewGroup.dispatchDetachedFromWindow)", () => {
    expect(patchLf).not.toContain("removeKeyboardCallbacks");
    expect(patchLf).not.toContain("view.removeSelf()");
  });

  it("no node_modules instalado, reflete o estado real do patch (ativo em patches/ ou arquivado para a Story 8.2)", () => {
    if (!fs.existsSync(APPLIED_KT_PATH)) return;
    const applied = fs.readFileSync(APPLIED_KT_PATH, "utf8").replace(/\r\n/g, "\n");
    const installedVersion = fs.existsSync(INSTALLED_PKG_PATH)
      ? (JSON.parse(fs.readFileSync(INSTALLED_PKG_PATH, "utf8")) as { version?: string }).version
      : undefined;
    expect(installedVersion).toBeTruthy();

    const activePatchPath = path.resolve(
      __dirname,
      `../react-native-keyboard-controller+${installedVersion}.patch`,
    );

    if (fs.existsSync(activePatchPath)) {
      expect(applied).toContain("private fun cleanNullChildren()");
      expect(applied).toContain("override fun dispatchDraw(canvas: Canvas)");
    } else {
      // Enquanto arquivado em docs/patches-sdk-55-pendentes/ (pendente da Story 8.2),
      // trava a versão esperada no SDK 55 e confirma que o post assíncrono segue intacto.
      expect(installedVersion).toBe("1.20.7");
      expect(fs.existsSync(PATCH_PATH)).toBe(true);
    }

    expect(applied).toContain("Handler(Looper.getMainLooper()).post {");
    expect(applied).toContain("view.removeSelf()");
  });
});
