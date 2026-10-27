import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Story 13.2: toda tela com campo rola com o componente único
 * `KeyboardAwareScrollViewCompat` (components/KeyboardAwareScrollViewCompat.tsx),
 * que já traz `bottomOffset`, `keyboardShouldPersistTaps="handled"` e a queda
 * para `ScrollView` na web. Este teste barra o `KeyboardAwareScrollView`
 * importado direto e o `ScrollView` puro em tela com campo, e descobre telas
 * novas com campo que ainda não estão na lista.
 */

const ROOT = path.resolve(__dirname, "../../..");
const DIRS = ["app", "src", "components", "lib", "constants"];
const SOURCE = /\.(ts|tsx|js|jsx)$/;
const COMPAT = "components/KeyboardAwareScrollViewCompat.tsx";

/** As telas com campo da auditoria da Story 13.2. */
const FIELD_SCREENS = [
  "app/add-transaction.tsx",
  "app/ai-settings.tsx",
  "app/backup.tsx",
  "app/about.tsx",
  "app/ocr-settings.tsx",
  "app/sync.tsx",
  "src/components/invoice/ParsedScreen.tsx",
  "src/components/payslip/PayslipReview.tsx",
];

/** `ScrollView` puro permitido numa tela da lista, com o motivo. */
const SCROLLVIEW_EXCEPTIONS: Record<string, string> = {
  "app/sync.tsx": "ScrollView do modal do QR Code (sem campo)",
};

/** Rotas com campo fora da lista, com o motivo. */
const DISCOVERY_EXCEPTIONS: Record<string, string> = {
  "app/ai-chat.tsx": "chat da IA (GiftedChat) — Story 13.5",
  "app/import-invoice.tsx": "campos no ParsedScreen (na lista) e no QrScanScreen (KeyboardStickyView, Story 13.6)",
  "app/payslips.tsx": "campos no PayslipReview (na lista)",
};

/**
 * Remove comentários sem mexer no conteúdo de strings, templates e regex
 * (mesma rotina do noNativeAlert.test.ts).
 */
function stripComments(source: string): string {
  let out = "";
  let i = 0;
  let lastSignificant = "";
  const n = source.length;
  const regexAllowedAfter = "(,=:[!&|?{};+-*%<>~^";

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === "/" && next === "/") {
      while (i < n && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      out += " ";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && source[j] !== ch) {
        if (source[j] === "\\") j++;
        else if (ch !== "`" && source[j] === "\n") break;
        j++;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
      lastSignificant = ch;
      continue;
    }
    if (ch === "/" && (lastSignificant === "" || regexAllowedAfter.includes(lastSignificant))) {
      let j = i + 1;
      let inClass = false;
      while (j < n && source[j] !== "\n") {
        const c = source[j];
        if (c === "\\") j++;
        else if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) break;
        j++;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
      lastSignificant = "/";
      continue;
    }
    out += ch;
    if (!/\s/.test(ch)) lastSignificant = ch;
    i++;
  }
  return out;
}

// ─── Detectores (código já sem comentários) ──────────────────────────────────

const KC = `["']react-native-keyboard-controller["']`;
const DIRECT_KASV: RegExp[] = [
  // import { KeyboardAwareScrollView } / { KeyboardAwareScrollView as X } from "react-native-keyboard-controller"
  new RegExp(`import\\s[^;]*?\\bKeyboardAwareScrollView\\b[^;]*?from\\s*${KC}`),
  // const { KeyboardAwareScrollView } = require("react-native-keyboard-controller")
  new RegExp(`\\{[^}]*\\bKeyboardAwareScrollView\\b[^}]*\\}\\s*=\\s*require\\(\\s*${KC}\\s*\\)`),
  // require("react-native-keyboard-controller").KeyboardAwareScrollView
  new RegExp(`require\\(\\s*${KC}\\s*\\)\\s*\\??\\.\\s*KeyboardAwareScrollView\\b`),
  // import * as KC from "react-native-keyboard-controller"; KC.KeyboardAwareScrollView
  /[\w$)\]]\s*\??\.\s*KeyboardAwareScrollView\b/,
];

function importsKeyboardAwareScrollView(source: string): boolean {
  const code = stripComments(source);
  return DIRECT_KASV.some((p) => p.test(code));
}

function importsPlainScrollView(source: string): boolean {
  const code = stripComments(source);
  return (
    /import\s[^;]*?\bScrollView\b[^;]*?from\s*["']react-native(-gesture-handler)?["']/.test(code) ||
    /\{[^}]*\bScrollView\b[^}]*\}\s*=\s*require\(\s*["']react-native(-gesture-handler)?["']\s*\)/.test(code) ||
    /[\w$)\]]\s*\??\.\s*ScrollView\b/.test(code)
  );
}

function usesCompat(source: string): boolean {
  const code = stripComments(source);
  return (
    /import\s[^;]*?\bKeyboardAwareScrollViewCompat\b[^;]*?from\s*["']@\/components\/KeyboardAwareScrollViewCompat["']/.test(code) &&
    /<KeyboardAwareScrollViewCompat\b/.test(code)
  );
}

function badPersistTaps(source: string): boolean {
  const code = stripComments(source);
  const values = [...code.matchAll(/\bkeyboardShouldPersistTaps\s*=\s*(\{\s*)?(["'`]?)([^"'`}\s>]*)\2/g)];
  return values.some((m) => m[3] !== "handled");
}

const FIELD = /<(TInput|TextInput|AppTextInput)\b|\bonChangeText\s*=/;
const SELF_MANAGED = /<(Modal|KeyboardSafeView)\b/;

function hasField(source: string): boolean {
  return FIELD.test(stripComments(source));
}

// ─── Arquivos ────────────────────────────────────────────────────────────────

function isTestFile(file: string): boolean {
  return file.includes(`${path.sep}__tests__${path.sep}`) || /\.(test|spec)\.[jt]sx?$/.test(file);
}

function collect(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if (SOURCE.test(entry.name) && !isTestFile(full)) out.push(full);
  }
}

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");
const read = (relPath: string) => fs.readFileSync(path.join(ROOT, relPath), "utf8");

/** Resolve `@/src/components/...` para o arquivo, ou null. */
function resolveComponent(spec: string): string | null {
  if (!spec.startsWith("@/src/components/")) return null;
  const base = path.join(ROOT, spec.slice(2));
  for (const c of [`${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * A rota tem campo próprio, ou importa de `src/components` um componente com
 * campo que não cuida do teclado sozinho (sem `Modal`/`KeyboardSafeView`).
 */
function routeHasField(source: string): boolean {
  if (hasField(source)) return true;
  const code = stripComments(source);
  for (const m of code.matchAll(/from\s*["'](@\/src\/components\/[^"']+)["']/g)) {
    const file = resolveComponent(m[1]);
    if (!file) continue;
    const dep = fs.readFileSync(file, "utf8");
    if (hasField(dep) && !SELF_MANAGED.test(stripComments(dep))) return true;
  }
  return false;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("rolagem padrão das telas com campo (Story 13.2)", () => {
  const files: string[] = [];
  for (const dir of DIRS) collect(path.join(ROOT, dir), files);

  it("encontra os arquivos do app e as telas da lista", () => {
    expect(files.length).toBeGreaterThan(50);
    for (const screen of [...FIELD_SCREENS, COMPAT]) {
      expect(fs.existsSync(path.join(ROOT, screen)), screen).toBe(true);
    }
  });

  it("só o componente padrão importa KeyboardAwareScrollView da biblioteca", () => {
    const hits = files
      .filter((f) => rel(f) !== COMPAT && importsKeyboardAwareScrollView(fs.readFileSync(f, "utf8")))
      .map(rel);
    expect(hits).toEqual([]);
    expect(importsKeyboardAwareScrollView(read(COMPAT))).toBe(true);
  });

  it("as telas com campo importam e renderizam KeyboardAwareScrollViewCompat", () => {
    const hits = FIELD_SCREENS.filter((f) => !usesCompat(read(f)));
    expect(hits).toEqual([]);
  });

  it("as telas com campo não usam ScrollView puro (salvo exceção nomeada)", () => {
    const hits = FIELD_SCREENS.filter((f) => !SCROLLVIEW_EXCEPTIONS[f] && importsPlainScrollView(read(f)));
    expect(hits).toEqual([]);
  });

  it('nenhuma tela da lista passa keyboardShouldPersistTaps diferente de "handled"', () => {
    const hits = FIELD_SCREENS.filter((f) => badPersistTaps(read(f)));
    expect(hits).toEqual([]);
  });

  it("toda rota em app/ com campo está na lista ou nas exceções com motivo", () => {
    const routes = files.filter((f) => rel(f).startsWith("app/"));
    const missing = routes
      .map(rel)
      .filter((r) => !FIELD_SCREENS.includes(r) && !DISCOVERY_EXCEPTIONS[r])
      .filter((r) => routeHasField(read(r)));
    expect(missing).toEqual([]);
  });

  it("as exceções apontam para arquivos que existem", () => {
    for (const file of [...Object.keys(SCROLLVIEW_EXCEPTIONS), ...Object.keys(DISCOVERY_EXCEPTIONS)]) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
    }
  });
});

describe("auto-teste dos detectores", () => {
  const directImports = [
    `import { KeyboardAwareScrollView } from "react-native-keyboard-controller";`,
    `import { KeyboardProvider, KeyboardAwareScrollView } from 'react-native-keyboard-controller';`,
    `import {\n  KeyboardAwareScrollView,\n  KeyboardStickyView,\n} from "react-native-keyboard-controller";`,
    `import { KeyboardAwareScrollView as KASV } from "react-native-keyboard-controller";`,
    `const { KeyboardAwareScrollView } = require("react-native-keyboard-controller");`,
    `const K = require("react-native-keyboard-controller").KeyboardAwareScrollView;`,
    `import * as KC from "react-native-keyboard-controller";\n<KC.KeyboardAwareScrollView />`,
  ];
  it.each(directImports)("detecta import direto: %s", (code) => {
    expect(importsKeyboardAwareScrollView(code)).toBe(true);
  });

  const notDirect = [
    `import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";`,
    `import { KeyboardStickyView } from "react-native-keyboard-controller";`,
    `import type { KeyboardAwareScrollViewProps } from "react-native-keyboard-controller";`,
    `// import { KeyboardAwareScrollView } from "react-native-keyboard-controller";`,
    `/* KeyboardAwareScrollView */ import { KeyboardProvider } from "react-native-keyboard-controller";`,
  ];
  it.each(notDirect)("não acusa import direto: %s", (code) => {
    expect(importsKeyboardAwareScrollView(code)).toBe(false);
  });

  const plainScroll = [
    `import { View, ScrollView } from "react-native";`,
    `import {\n  View,\n  ScrollView,\n  Text,\n} from 'react-native';`,
    `import { ScrollView as SV } from "react-native";`,
    `import { ScrollView } from "react-native-gesture-handler";`,
    `const { ScrollView } = require("react-native");`,
    `import * as RN from "react-native";\n<RN.ScrollView />`,
  ];
  it.each(plainScroll)("detecta ScrollView puro: %s", (code) => {
    expect(importsPlainScrollView(code)).toBe(true);
  });

  const notPlainScroll = [
    `import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";`,
    `import { View, FlatList } from "react-native";`,
    `import { ScrollViewProps } from "react-native";`,
    `// import { ScrollView } from "react-native";`,
  ];
  it.each(notPlainScroll)("não acusa ScrollView puro: %s", (code) => {
    expect(importsPlainScrollView(code)).toBe(false);
  });

  it("reconhece o uso do componente padrão", () => {
    const ok = `import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";\n<KeyboardAwareScrollViewCompat>{x}</KeyboardAwareScrollViewCompat>`;
    const multi = `import {\n  KeyboardAwareScrollViewCompat,\n  SCROLL_BOTTOM_PADDING,\n} from "@/components/KeyboardAwareScrollViewCompat";\n<KeyboardAwareScrollViewCompat\n  contentContainerStyle={s.c}\n/>`;
    const importOnly = `import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";\n<ScrollView />`;
    const renderOnly = `<KeyboardAwareScrollViewCompat />`;
    expect(usesCompat(ok)).toBe(true);
    expect(usesCompat(multi)).toBe(true);
    expect(usesCompat(importOnly)).toBe(false);
    expect(usesCompat(renderOnly)).toBe(false);
  });

  it.each([
    [`<X keyboardShouldPersistTaps="never" />`, true],
    [`<X keyboardShouldPersistTaps='always' />`, true],
    [`<X keyboardShouldPersistTaps={"always"} />`, true],
    [`<X keyboardShouldPersistTaps={mode} />`, true],
    [`<X keyboardShouldPersistTaps="handled" />`, false],
    [`<X keyboardShouldPersistTaps={"handled"} />`, false],
    [`<X />`, false],
    [`// keyboardShouldPersistTaps="never"\n<X />`, false],
  ])("keyboardShouldPersistTaps: %s → %s", (code, bad) => {
    expect(badPersistTaps(code)).toBe(bad);
  });

  it.each([
    [`<TInput value={v} />`, true],
    [`<TextInput\n  value={v}\n/>`, true],
    [`<AppTextInput label="x" />`, true],
    [`<Foo onChangeText={setX} />`, true],
    [`<Text>oi</Text>`, false],
    [`<TextInputLabel />`, false],
    [`// <TextInput />`, false],
  ])("campo: %s → %s", (code, field) => {
    expect(hasField(code)).toBe(field);
  });
});
