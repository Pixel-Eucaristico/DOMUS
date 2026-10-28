import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Story 13.2: toda tela com campo rola com o componente único
 * `KeyboardAwareScrollViewCompat` (components/KeyboardAwareScrollViewCompat.tsx),
 * que já traz `bottomOffset`, `keyboardShouldPersistTaps="handled"` e a queda
 * para `ScrollView` na web. Este teste barra o `KeyboardAwareScrollView`
 * importado direto (inclusive por namespace, reexportação, `require` e
 * `import()`), a rolagem crua (`ScrollView`/`FlatList`/`SectionList`) e as
 * props de teclado repetidas nas telas com campo, e descobre rotas novas com
 * campo que ainda não estão na lista.
 *
 * Story 13.3: os formulários em modal usam o contêiner único `KeyboardSheet`
 * (src/components/shared/KeyboardSheet.tsx), com o botão principal no
 * `footer`, sem segunda compensação de teclado nem rolagem vertical crua. Só o
 * KeyboardSheet renderiza o `KeyboardSafeView`, e todo componente com `<Modal`
 * e campo precisa estar em MODAL_FORMS ou em MODAL_PENDING (com motivo).
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

/**
 * Rolagem crua permitida numa tela da lista: o componente, quantas vezes ele
 * aparece em JSX e o motivo. Cada uso precisa estar dentro de um `<Modal>`.
 */
const SCROLL_EXCEPTIONS: Record<string, { component: string; count: number; reason: string }> = {
  "app/sync.tsx": { component: "ScrollView", count: 1, reason: "ScrollView do modal do QR Code (sem campo)" },
};

/** `bottomOffset` permitido numa tela da lista (a expressão exata), com o motivo. */
const BOTTOM_OFFSET_EXCEPTIONS: Record<string, { expression: string; reason: string }> = {
  "src/components/invoice/ParsedScreen.tsx": {
    expression: "footerLayout.bottomOffset",
    reason: "rodapé que sobe com o teclado (D-1 a, parsedFooterLayout.ts)",
  },
};

/** Rotas com campo fora da lista, com o motivo. */
const DISCOVERY_EXCEPTIONS: Record<string, string> = {
  "app/ai-chat.tsx": "chat da IA (GiftedChat) — Story 13.5",
  "app/import-invoice.tsx": "campos no ParsedScreen (na lista) e no QrScanScreen (KeyboardStickyView, Story 13.6)",
  "app/payslips.tsx": "campos no PayslipReview (na lista)",
};

/**
 * Componentes com `Modal` que também têm campo fora dele: contam como campo na
 * descoberta (o AccountPicker em modo lista tem a busca inline).
 */
const INLINE_FIELD_COMPONENTS = ["src/components/shared/AccountPicker.tsx"];

/** O contêiner único das folhas com formulário em modal (Story 13.3). */
const KEYBOARD_SHEET = "src/components/shared/KeyboardSheet.tsx";
const KEYBOARD_SHEET_MODULE = "@/src/components/shared/KeyboardSheet";

/** Os formulários em modal da auditoria da Story 13.3. */
const MODAL_FORMS = [
  "src/components/transaction/TransactionBottomSheet.tsx",
  "src/components/shared/AccountFormModal.tsx",
  "src/components/wishlist/CreateListModal.tsx",
  "src/components/wishlist/AddItemModal.tsx",
];

/**
 * Rolagem horizontal permitida num formulário em modal: o componente, quantas
 * vezes aparece e o motivo. Rolagem vertical crua nunca é permitida (a rolagem
 * é a do KeyboardSheet).
 */
const MODAL_HORIZONTAL_SCROLLS: Record<string, { component: string; count: number; reason: string }> = {
  "src/components/shared/AccountFormModal.tsx": {
    component: "ScrollView",
    count: 1,
    reason: "contas de destino no diálogo de excluir conta (sem campo)",
  },
  "src/components/wishlist/AddItemModal.tsx": {
    component: "ScrollView",
    count: 1,
    reason: "chips de poupança vinculada",
  },
};

/** Componentes com `<Modal` e campo que ainda não usam o KeyboardSheet, com o motivo. */
const MODAL_PENDING: Record<string, string> = {
  "src/components/shared/CategoryPickerModal.tsx": "busca em modal — Story 13.4",
  "src/components/wishlist/StoreGridModal.tsx": "busca em modal — Story 13.4",
  "src/components/shared/AccountPicker.tsx": "AccountPicker compacto (busca em modal) — Story 13.4",
  "app/about.tsx": "diálogo \"APAGAR TUDO\" — Story 13.4",
  "src/components/tour/WelcomeCarousel.tsx": "campo no carrossel em modal — Story 13.4",
  "src/components/debug/DebugTools.tsx": "ferramentas de depuração em modal — Story 13.4",
  "app/sync.tsx": "modal do QR sem campo; os campos estão na tela, coberta pela Story 13.2",
};

/** Compensações de teclado que não podem somar com o KeyboardSheet no mesmo modal. */
const SECOND_KEYBOARD_SYSTEMS = [
  "KeyboardSafeView",
  "KeyboardAwareScrollViewCompat",
  "KeyboardAwareScrollView",
  "KeyboardAvoidingView",
  "KeyboardStickyView",
];

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

// ─── Imports (código já sem comentários) ─────────────────────────────────────

interface ImportInfo {
  module: string;
  /** Nomes importados como valor (o nome original, antes do `as`). */
  named: string[];
  namespace: string | null;
  defaultName: string | null;
}

/** Imports de valor (`import type` e membros `type X` ficam de fora). */
function parseImports(code: string): ImportInfo[] {
  const out: ImportInfo[] = [];
  for (const m of code.matchAll(/(?:^|[;\n])\s*import\s+([^;]*?)\s+from\s*["']([^"']+)["']/g)) {
    let clause = m[1].trim();
    if (/^type\s/.test(clause)) continue;
    const info: ImportInfo = { module: m[2], named: [], namespace: null, defaultName: null };
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const raw of braces[1].split(",")) {
        const member = raw.trim();
        if (!member || /^type\s/.test(member)) continue;
        info.named.push(member.split(/\s+as\s+/)[0].trim());
      }
      clause = clause.replace(braces[0], "");
    }
    const ns = clause.match(/\*\s*as\s+([\w$]+)/);
    if (ns) {
      info.namespace = ns[1];
      clause = clause.replace(ns[0], "");
    }
    const def = clause.replace(/,/g, " ").trim();
    if (def) info.defaultName = def;
    out.push(info);
  }
  return out;
}

/** `<X` ou `<NS.X` em posição de JSX (não pega genérico como `useRef<RN.ScrollView>`). */
function jsxPattern(names: string, namespaced: boolean): RegExp {
  const tag = namespaced ? `[\\w$]+\\s*\\.\\s*(?:${names})` : `(?:${names})`;
  return new RegExp(`(?:^|[^\\w$.\\s]|[^\\w$.]\\s|\\breturn\\s)\\s*<\\s*${tag}\\b`, "g");
}

const KC_MODULE = "react-native-keyboard-controller";
const KC = `["']react-native-keyboard-controller["']`;

/** Motivos pelos quais o arquivo usa o KeyboardAwareScrollView da biblioteca direto. */
function directKeyboardAwareScrollView(source: string): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  for (const imp of parseImports(code)) {
    if (imp.module !== KC_MODULE) continue;
    if (imp.named.includes("KeyboardAwareScrollView")) hits.push("import nomeado");
    if (imp.namespace) hits.push("import * as");
    if (imp.defaultName) hits.push("import default");
  }
  if (new RegExp(`export\\s+\\*\\s*(?:as\\s+[\\w$]+\\s*)?from\\s*${KC}`).test(code)) hits.push("export * from");
  for (const m of code.matchAll(new RegExp(`export\\s+(type\\s+)?\\{([^}]*)\\}\\s*from\\s*${KC}`, "g"))) {
    const values = m[1] ? [] : m[2].split(",").map((x) => x.trim()).filter((x) => x && !/^type\s/.test(x));
    if (values.some((x) => x.split(/\s+as\s+/)[0].trim() === "KeyboardAwareScrollView")) hits.push("reexportação");
  }
  if (new RegExp(`\\brequire\\(\\s*${KC}\\s*\\)`).test(code)) hits.push("require");
  if (new RegExp(`\\bimport\\(\\s*${KC}\\s*\\)`).test(code)) hits.push("import()");
  if (jsxPattern("KeyboardAwareScrollView", true).test(code)) hits.push("JSX por namespace");
  return hits;
}

const SCROLL_COMPONENTS = ["ScrollView", "FlatList", "SectionList"];
const SCROLL_MODULES = /^(react-native|react-native-gesture-handler|tamagui|@tamagui\/.+)$/;

/** Componentes de rolagem crua que o arquivo importa ou usa por namespace. */
function plainScrollUses(source: string): string[] {
  const code = stripComments(source);
  const hits = new Set<string>();
  for (const imp of parseImports(code)) {
    if (!SCROLL_MODULES.test(imp.module)) continue;
    for (const name of imp.named) if (SCROLL_COMPONENTS.includes(name)) hits.add(name);
  }
  const req = /\{([^}]*)\}\s*=\s*require\(\s*["'](react-native|react-native-gesture-handler|tamagui)["']\s*\)/g;
  for (const m of code.matchAll(req)) {
    for (const name of SCROLL_COMPONENTS) if (new RegExp(`\\b${name}\\b`).test(m[1])) hits.add(name);
  }
  for (const m of code.matchAll(jsxPattern(SCROLL_COMPONENTS.join("|"), true))) {
    const name = SCROLL_COMPONENTS.find((n) => m[0].includes(n));
    if (name) hits.add(name);
  }
  return [...hits];
}

/** Usos em JSX de `<Name` e se cada um está dentro de um `<Modal>…</Modal>`. */
function jsxUsesInsideModal(source: string, name: string): boolean[] {
  const code = stripComments(source);
  const result: boolean[] = [];
  for (const m of code.matchAll(jsxPattern(name, false))) {
    const before = code.slice(0, (m.index ?? 0) + m[0].length);
    const open = before.lastIndexOf("<Modal");
    const close = before.lastIndexOf("</Modal>");
    result.push(open !== -1 && open > close);
  }
  return result;
}

function usesCompat(source: string): boolean {
  const code = stripComments(source);
  const imported = parseImports(code).some(
    (imp) => imp.module === "@/components/KeyboardAwareScrollViewCompat" && imp.named.includes("KeyboardAwareScrollViewCompat"),
  );
  return imported && jsxPattern("KeyboardAwareScrollViewCompat", false).test(code);
}

/**
 * Props de teclado repetidas na tela: qualquer `keyboardShouldPersistTaps=` e
 * qualquer `bottomOffset=` que não seja a expressão permitida.
 */
function repeatedKeyboardProps(source: string, allowedBottomOffset?: string): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  if (/\bkeyboardShouldPersistTaps\s*=/.test(code)) hits.push("keyboardShouldPersistTaps");
  for (const m of code.matchAll(/\bbottomOffset\s*=\s*(\{\s*([^}]*?)\s*\}|["'][^"']*["'])/g)) {
    if (allowedBottomOffset === undefined || m[2] !== allowedBottomOffset) hits.push(`bottomOffset=${m[1]}`);
  }
  return hits;
}

// ─── Campos ──────────────────────────────────────────────────────────────────

const FIELD_TAGS = "TInput|TextInput|AppTextInput|Input|TextArea";

function hasField(source: string): boolean {
  const code = stripComments(source);
  return (
    jsxPattern(FIELD_TAGS, false).test(code) ||
    jsxPattern("TextInput|Input|TextArea", true).test(code) ||
    /\bonChangeText\s*=/.test(code)
  );
}

// ─── Modais com formulário (Story 13.3) ──────────────────────────────────────

/**
 * Atributos do nível de cima de cada abertura `<Name …>` em JSX (o conteúdo de
 * `{…}` vira `{}`, salvo `{true}`/`{false}`), para saber se a tag tem
 * `footer=` ou `horizontal`.
 */
function jsxOpeningTags(source: string, name: string, namespaced = false): string[] {
  const code = stripComments(source);
  const tags: string[] = [];
  for (const m of code.matchAll(jsxPattern(name, namespaced))) {
    let i = (m.index ?? 0) + m[0].length;
    let depth = 0;
    let attrs = "";
    let inner = "";
    while (i < code.length) {
      const ch = code[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        let j = i + 1;
        while (j < code.length && code[j] !== ch) {
          if (code[j] === "\\") j++;
          j++;
        }
        if (depth === 0) attrs += code.slice(i, j + 1);
        else inner += code.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      if (ch === "{") {
        if (depth === 0) inner = "";
        else inner += ch;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) attrs += /^\s*(true|false)\s*$/.test(inner) ? `{${inner.trim()}}` : "{}";
        else inner += ch;
      } else if (depth > 0) {
        inner += ch;
      } else if (ch === ">") {
        break;
      } else {
        attrs += ch;
      }
      i++;
    }
    tags.push(attrs);
  }
  return tags;
}

/** `horizontal` ou `horizontal={true}`; `horizontal={false}` ou `{expressão}` contam como vertical. */
function isHorizontal(attrs: string): boolean {
  return /(?:^|\s)horizontal(?:\s*=\s*\{true\})?(?=\s|\/|$)/.test(attrs);
}

/** O arquivo renderiza `<KeyboardSafeView` (direto ou por namespace). */
function rendersKeyboardSafeView(source: string): boolean {
  const code = stripComments(source);
  return jsxPattern("KeyboardSafeView", false).test(code) || jsxPattern("KeyboardSafeView", true).test(code);
}

/** Componente com `<Modal` e campo. */
function hasModalWithField(source: string): boolean {
  const code = stripComments(source);
  return (jsxPattern("Modal", false).test(code) || jsxPattern("Modal", true).test(code)) && hasField(source);
}

/** Motivos pelos quais um formulário em modal foge do padrão KeyboardSheet. */
function modalFormViolations(
  source: string,
  horizontal?: { component: string; count: number },
): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  const imports = parseImports(code);

  // 1. importa e renderiza o KeyboardSheet exatamente uma vez, dentro de <Modal>.
  const imported = imports.some((imp) => imp.module === KEYBOARD_SHEET_MODULE && imp.named.includes("KeyboardSheet"));
  if (!imported) hits.push(`não importa KeyboardSheet de ${KEYBOARD_SHEET_MODULE}`);
  const uses = jsxUsesInsideModal(source, "KeyboardSheet");
  if (uses.length !== 1) hits.push(`${uses.length} × <KeyboardSheet (esperado 1)`);
  if (uses.some((inside) => !inside)) hits.push("KeyboardSheet fora de Modal");

  // 2. passa footer= ao KeyboardSheet.
  for (const attrs of jsxOpeningTags(source, "KeyboardSheet")) {
    if (!/(?:^|\s)footer\s*=/.test(attrs)) hits.push("KeyboardSheet sem footer=");
  }

  // 3. nenhuma segunda compensação de teclado.
  for (const name of SECOND_KEYBOARD_SYSTEMS) {
    if (jsxPattern(name, false).test(code) || jsxPattern(name, true).test(code)) hits.push(`<${name}`);
    else if (imports.some((imp) => imp.named.includes(name))) hits.push(`import ${name}`);
  }

  // 4. sem rolagem vertical crua; horizontais só as da exceção, na contagem.
  let horizontalCount = 0;
  for (const name of SCROLL_COMPONENTS) {
    const tags = [...jsxOpeningTags(source, name), ...jsxOpeningTags(source, name, true)];
    for (const attrs of tags) {
      if (!isHorizontal(attrs)) {
        hits.push(`${name} vertical`);
        continue;
      }
      if (!horizontal || horizontal.component !== name) hits.push(`${name} horizontal fora da exceção`);
      else horizontalCount++;
    }
  }
  if (horizontal && horizontalCount !== horizontal.count) {
    hits.push(`${horizontalCount} × ${horizontal.component} horizontal (esperado ${horizontal.count})`);
  }
  return hits;
}

/** Componente com `Modal` e campo que já cuida do teclado (padrão da 13.3 ou pendente com motivo). */
function isSelfManagedModal(relPath: string): boolean {
  return MODAL_FORMS.includes(relPath) || relPath in MODAL_PENDING;
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

/**
 * Resolve um import de componente do app para o arquivo: `@/src/components/…`,
 * `@/components/…` ou relativo. Fora disso (bibliotecas, hooks, serviços), null.
 */
function resolveComponent(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/src/components/") || spec.startsWith("@/components/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const c of [`${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Componente importado com campo que não cuida do teclado sozinho (fora de
 * MODAL_FORMS e MODAL_PENDING), ou da lista INLINE_FIELD_COMPONENTS.
 */
function componentHasInlineField(file: string): boolean {
  if (INLINE_FIELD_COMPONENTS.includes(rel(file))) return true;
  const dep = fs.readFileSync(file, "utf8");
  return hasField(dep) && !isSelfManagedModal(rel(file));
}

/** A rota tem campo próprio, ou importa (um nível) um componente com campo inline. */
function routeHasField(file: string): boolean {
  const source = fs.readFileSync(file, "utf8");
  if (hasField(source)) return true;
  for (const imp of parseImports(stripComments(source))) {
    const dep = resolveComponent(file, imp.module);
    if (dep && componentHasInlineField(dep)) return true;
  }
  return false;
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("rolagem padrão das telas com campo (Story 13.2)", () => {
  const files: string[] = [];
  for (const dir of DIRS) collect(path.join(ROOT, dir), files);

  it("encontra os arquivos do app e as telas da lista", () => {
    expect(files.length).toBeGreaterThan(50);
    for (const screen of [...FIELD_SCREENS, COMPAT, ...INLINE_FIELD_COMPONENTS]) {
      expect(fs.existsSync(path.join(ROOT, screen)), screen).toBe(true);
    }
  });

  it("só o componente padrão usa KeyboardAwareScrollView da biblioteca", () => {
    const hits = files
      .filter((f) => rel(f) !== COMPAT)
      .flatMap((f) => directKeyboardAwareScrollView(fs.readFileSync(f, "utf8")).map((why) => `${rel(f)}: ${why}`));
    expect(hits).toEqual([]);
    expect(directKeyboardAwareScrollView(read(COMPAT))).toContain("import nomeado");
  });

  it("as telas com campo importam e renderizam KeyboardAwareScrollViewCompat", () => {
    const hits = FIELD_SCREENS.filter((f) => !usesCompat(read(f)));
    expect(hits).toEqual([]);
  });

  it("as telas com campo não usam rolagem crua (salvo exceção nomeada, dentro de Modal)", () => {
    const hits: string[] = [];
    for (const f of FIELD_SCREENS) {
      const source = read(f);
      const exception = SCROLL_EXCEPTIONS[f];
      for (const name of plainScrollUses(source)) {
        if (!exception || exception.component !== name) {
          hits.push(`${f}: ${name}`);
          continue;
        }
        const uses = jsxUsesInsideModal(source, name);
        if (uses.length !== exception.count) hits.push(`${f}: ${uses.length} × ${name} (esperado ${exception.count})`);
        if (uses.some((inside) => !inside)) hits.push(`${f}: ${name} fora de Modal`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("nenhuma tela da lista repete keyboardShouldPersistTaps ou bottomOffset", () => {
    const hits = FIELD_SCREENS.flatMap((f) =>
      repeatedKeyboardProps(read(f), BOTTOM_OFFSET_EXCEPTIONS[f]?.expression).map((p) => `${f}: ${p}`),
    );
    expect(hits).toEqual([]);
  });

  it("toda rota em app/ com campo está na lista ou nas exceções com motivo", () => {
    const missing = files
      .filter((f) => rel(f).startsWith("app/"))
      .filter((f) => !FIELD_SCREENS.includes(rel(f)) && !DISCOVERY_EXCEPTIONS[rel(f)])
      .filter((f) => routeHasField(f))
      .map(rel);
    expect(missing).toEqual([]);
  });

  it("as exceções apontam para arquivos que existem e ainda precisam delas", () => {
    for (const file of [...Object.keys(SCROLL_EXCEPTIONS), ...Object.keys(BOTTOM_OFFSET_EXCEPTIONS)]) {
      expect(FIELD_SCREENS, file).toContain(file);
    }
    for (const file of Object.keys(DISCOVERY_EXCEPTIONS)) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(routeHasField(path.join(ROOT, file)), file).toBe(true);
    }
  });
});

describe("modais com formulário (Story 13.3)", () => {
  const files: string[] = [];
  for (const dir of ["app", "src", "components"]) collect(path.join(ROOT, dir), files);

  it("encontra o KeyboardSheet, os modais da lista e os pendentes", () => {
    for (const file of [KEYBOARD_SHEET, ...MODAL_FORMS, ...Object.keys(MODAL_PENDING)]) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
    }
    for (const file of Object.keys(MODAL_HORIZONTAL_SCROLLS)) expect(MODAL_FORMS, file).toContain(file);
  });

  it.each(MODAL_FORMS)("%s usa o KeyboardSheet com footer, sem segunda compensação nem rolagem vertical crua", (file) => {
    expect(modalFormViolations(read(file), MODAL_HORIZONTAL_SCROLLS[file])).toEqual([]);
  });

  it("só o KeyboardSheet renderiza o KeyboardSafeView", () => {
    const hits = files
      .filter((f) => rel(f) !== KEYBOARD_SHEET)
      .filter((f) => rendersKeyboardSafeView(fs.readFileSync(f, "utf8")))
      .map(rel);
    expect(hits).toEqual([]);
    expect(rendersKeyboardSafeView(read(KEYBOARD_SHEET))).toBe(true);
  });

  it("todo componente com <Modal e campo está em MODAL_FORMS ou MODAL_PENDING", () => {
    const missing = files
      .filter((f) => hasModalWithField(fs.readFileSync(f, "utf8")))
      .map(rel)
      .filter((f) => !isSelfManagedModal(f));
    expect(missing).toEqual([]);
  });

  it("os pendentes ainda têm <Modal e campo (a 13.4 esvazia a lista)", () => {
    for (const file of Object.keys(MODAL_PENDING)) {
      expect(hasModalWithField(read(file)), file).toBe(true);
      expect(MODAL_FORMS, file).not.toContain(file);
    }
  });
});

describe("auto-teste dos detectores", () => {
  const directUses = [
    `import { KeyboardAwareScrollView } from "react-native-keyboard-controller";`,
    `import { KeyboardProvider, KeyboardAwareScrollView } from 'react-native-keyboard-controller';`,
    `import {\n  KeyboardAwareScrollView,\n  KeyboardStickyView,\n} from "react-native-keyboard-controller";`,
    `import { KeyboardAwareScrollView as KASV } from "react-native-keyboard-controller";`,
    `import { type KeyboardStickyViewProps, KeyboardAwareScrollView } from "react-native-keyboard-controller";`,
    `const { KeyboardAwareScrollView } = require("react-native-keyboard-controller");`,
    `const K = require("react-native-keyboard-controller").KeyboardAwareScrollView;`,
    `import * as KC from "react-native-keyboard-controller";\n<KC.KeyboardAwareScrollView />`,
    `import * as KC from "react-native-keyboard-controller";\nconst { KeyboardAwareScrollView } = KC;`,
    `export { KeyboardAwareScrollView } from "react-native-keyboard-controller";`,
    `export { KeyboardAwareScrollView as Scroll } from "react-native-keyboard-controller";`,
    `export * from "react-native-keyboard-controller";`,
    `const { KeyboardAwareScrollView } = await import("react-native-keyboard-controller");`,
    `return (\n  <Lib.KeyboardAwareScrollView>{x}</Lib.KeyboardAwareScrollView>\n);`,
  ];
  it.each(directUses)("detecta uso direto: %s", (code) => {
    expect(directKeyboardAwareScrollView(code)).not.toEqual([]);
  });

  const notDirect = [
    `import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";`,
    `import { KeyboardStickyView, useKeyboardState } from "react-native-keyboard-controller";`,
    `import type { KeyboardAwareScrollViewProps } from "react-native-keyboard-controller";`,
    `import type { KeyboardAwareScrollView } from "react-native-keyboard-controller";`,
    `import { type KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";`,
    `export type { KeyboardAwareScrollViewProps } from "react-native-keyboard-controller";`,
    `// import { KeyboardAwareScrollView } from "react-native-keyboard-controller";`,
    `/* KeyboardAwareScrollView */ import { KeyboardProvider } from "react-native-keyboard-controller";`,
    `const msg = "use o Compat, não o x.KeyboardAwareScrollView";`,
  ];
  it.each(notDirect)("não acusa uso direto: %s", (code) => {
    expect(directKeyboardAwareScrollView(code)).toEqual([]);
  });

  const plainScroll: [string, string][] = [
    [`import { View, ScrollView } from "react-native";`, "ScrollView"],
    [`import {\n  View,\n  ScrollView,\n  Text,\n} from 'react-native';`, "ScrollView"],
    [`import { ScrollView as SV } from "react-native";`, "ScrollView"],
    [`import { ScrollView } from "react-native-gesture-handler";`, "ScrollView"],
    [`import { ScrollView, YStack } from "tamagui";`, "ScrollView"],
    [`import { FlatList } from "react-native";`, "FlatList"],
    [`import { SectionList } from "react-native";`, "SectionList"],
    [`import { FlatList } from "react-native-gesture-handler";`, "FlatList"],
    [`const { ScrollView } = require("react-native");`, "ScrollView"],
    [`import * as RN from "react-native";\nreturn <RN.ScrollView />;`, "ScrollView"],
    [`import * as RN from "react-native";\nconst x = (\n  <RN.FlatList data={d} />\n);`, "FlatList"],
  ];
  it.each(plainScroll)("detecta rolagem crua: %s", (code, name) => {
    expect(plainScrollUses(code)).toContain(name);
  });

  const notPlainScroll = [
    `import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";`,
    `import { View, Text } from "react-native";`,
    `import { ScrollViewProps } from "react-native";`,
    `import type { ScrollView } from "react-native";`,
    `import { type ScrollView, View } from "react-native";`,
    `import * as RN from "react-native";\nconst ref = useRef<RN.ScrollView>(null);`,
    `// import { ScrollView } from "react-native";`,
    `import { FlashList } from "@shopify/flash-list";`,
  ];
  it.each(notPlainScroll)("não acusa rolagem crua: %s", (code) => {
    expect(plainScrollUses(code)).toEqual([]);
  });

  it("conta os usos de ScrollView e se estão dentro de Modal", () => {
    const inModal = `<View>\n  <Modal visible>\n    <ScrollView>{x}</ScrollView>\n  </Modal>\n</View>`;
    const outside = `<Modal visible><Text /></Modal>\n<ScrollView>{x}</ScrollView>`;
    const two = `${inModal}\n<ScrollView />`;
    expect(jsxUsesInsideModal(inModal, "ScrollView")).toEqual([true]);
    expect(jsxUsesInsideModal(outside, "ScrollView")).toEqual([false]);
    expect(jsxUsesInsideModal(two, "ScrollView")).toEqual([true, false]);
    expect(jsxUsesInsideModal(`const r = useRef<ScrollView>(null);`, "ScrollView")).toEqual([]);
  });

  it("reconhece o uso do componente padrão", () => {
    const ok = `import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";\nreturn <KeyboardAwareScrollViewCompat>{x}</KeyboardAwareScrollViewCompat>;`;
    const multi = `import {\n  KeyboardAwareScrollViewCompat,\n  SCROLL_BOTTOM_PADDING,\n} from "@/components/KeyboardAwareScrollViewCompat";\nreturn (\n  <KeyboardAwareScrollViewCompat\n    contentContainerStyle={s.c}\n  />\n);`;
    const importOnly = `import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";\nreturn <ScrollView />;`;
    const typeOnly = `import type { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";\nreturn <KeyboardAwareScrollViewCompat />;`;
    const renderOnly = `return <KeyboardAwareScrollViewCompat />;`;
    expect(usesCompat(ok)).toBe(true);
    expect(usesCompat(multi)).toBe(true);
    expect(usesCompat(importOnly)).toBe(false);
    expect(usesCompat(typeOnly)).toBe(false);
    expect(usesCompat(renderOnly)).toBe(false);
  });

  it.each([
    [`<X keyboardShouldPersistTaps="handled" />`, undefined, ["keyboardShouldPersistTaps"]],
    [`<X keyboardShouldPersistTaps={"always"} />`, undefined, ["keyboardShouldPersistTaps"]],
    [`<X bottomOffset={50} />`, undefined, ["bottomOffset={50}"]],
    [`<X bottomOffset={KEYBOARD_BOTTOM_OFFSET + 10} />`, undefined, ["bottomOffset={KEYBOARD_BOTTOM_OFFSET + 10}"]],
    [`<X bottomOffset={footerLayout.bottomOffset} />`, "footerLayout.bottomOffset", []],
    [`<X bottomOffset={ footerLayout.bottomOffset } />`, "footerLayout.bottomOffset", []],
    [`<X bottomOffset={120} />`, "footerLayout.bottomOffset", ["bottomOffset={120}"]],
    [`<X />`, undefined, []],
    [`// keyboardShouldPersistTaps="never" bottomOffset={1}\n<X />`, undefined, []],
    [`const layout = { bottomOffset: 50 };`, undefined, []],
  ] as [string, string | undefined, string[]][])("props repetidas: %s", (code, allowed, expected) => {
    expect(repeatedKeyboardProps(code, allowed)).toEqual(expected);
  });

  it.each([
    [`return <TInput value={v} />;`, true],
    [`return (\n  <TextInput\n    value={v}\n  />\n);`, true],
    [`return <AppTextInput label="x" />;`, true],
    [`return <Input size="$4" />;`, true],
    [`return <TextArea />;`, true],
    [`return <RN.TextInput />;`, true],
    [`<Foo onChangeText={setX} />`, true],
    [`return <Text>oi</Text>;`, false],
    [`return <TextInputLabel />;`, false],
    [`return <InputAccessoryView />;`, false],
    [`const r = useRef<TextInput>(null);`, false],
    [`// <TextInput />`, false],
  ])("campo: %s → %s", (code, field) => {
    expect(hasField(code)).toBe(field);
  });

  it("parseImports separa nome, namespace, default e ignora tipos", () => {
    const [a, b, c] = parseImports(
      `import React, { useState, type FC } from "react";\nimport * as RN from "react-native";\nimport type { X } from "x";\nimport Def from "d";`,
    );
    expect(a).toEqual({ module: "react", named: ["useState"], namespace: null, defaultName: "React" });
    expect(b).toEqual({ module: "react-native", named: [], namespace: "RN", defaultName: null });
    expect(c).toEqual({ module: "d", named: [], namespace: null, defaultName: "Def" });
  });
  describe("modais com formulário (Story 13.3)", () => {
    const imp = `import { KeyboardSheet } from "@/src/components/shared/KeyboardSheet";\n`;
    const ok = `${imp}return (\n  <Modal visible transparent>\n    <View>\n      <KeyboardSheet\n        header={<Text>Título</Text>}\n        footer={<TButton onPress={() => save()}>Salvar</TButton>}\n      >\n        <TInput />\n      </KeyboardSheet>\n    </View>\n  </Modal>\n);`;
    const horizontal = { component: "ScrollView", count: 1 };

    it("aceita o padrão", () => {
      expect(modalFormViolations(ok)).toEqual([]);
    });

    it("acusa KeyboardSheet fora de Modal", () => {
      const code = `${imp}return (\n  <View>\n    <KeyboardSheet header={null} footer={<B />}><TInput /></KeyboardSheet>\n  </View>\n);`;
      expect(modalFormViolations(code)).toContain("KeyboardSheet fora de Modal");
    });

    it("acusa modal sem KeyboardSheet ou sem o import", () => {
      const none = `return <Modal visible><TInput /></Modal>;`;
      expect(modalFormViolations(none)).toContain("0 × <KeyboardSheet (esperado 1)");
      expect(modalFormViolations(ok.replace(imp, ""))).toContain(
        "não importa KeyboardSheet de @/src/components/shared/KeyboardSheet",
      );
    });

    it("acusa KeyboardSheet sem footer", () => {
      const code = ok.replace("footer={<TButton onPress={() => save()}>Salvar</TButton>}", "");
      expect(modalFormViolations(code)).toContain("KeyboardSheet sem footer=");
      // footer só dentro de um filho não conta
      const nested = ok.replace("footer={", "header2={<X footer={1} />} data-x={");
      expect(modalFormViolations(nested)).toContain("KeyboardSheet sem footer=");
    });

    it("acusa KeyboardAwareScrollViewCompat dentro do modal", () => {
      const code = ok.replace("<TInput />", "<KeyboardAwareScrollViewCompat><TInput /></KeyboardAwareScrollViewCompat>");
      expect(modalFormViolations(code)).toContain("<KeyboardAwareScrollViewCompat");
    });

    it.each(["KeyboardSafeView", "KeyboardAvoidingView", "KeyboardStickyView", "KeyboardAwareScrollView"])(
      "acusa %s junto do KeyboardSheet",
      (name) => {
        expect(modalFormViolations(ok.replace("<TInput />", `<${name}><TInput /></${name}>`))).toContain(`<${name}`);
        expect(modalFormViolations(`import { ${name} } from "react-native";\n${ok}`)).toContain(`import ${name}`);
      },
    );

    it("acusa ScrollView vertical; o horizontal da exceção passa", () => {
      const vertical = ok.replace("<TInput />", "<ScrollView><TInput /></ScrollView>");
      expect(modalFormViolations(vertical)).toContain("ScrollView vertical");
      const flat = ok.replace("<TInput />", "<RN.FlatList data={d} />");
      expect(modalFormViolations(flat)).toContain("FlatList vertical");
      const off = ok.replace("<TInput />", "<ScrollView horizontal={false} />");
      expect(modalFormViolations(off, horizontal)).toContain("ScrollView vertical");
      const h = ok.replace("<TInput />", "<ScrollView horizontal showsHorizontalScrollIndicator={false}>{x}</ScrollView>");
      expect(modalFormViolations(h, horizontal)).toEqual([]);
      expect(modalFormViolations(h.replace("horizontal ", "horizontal={true} "), horizontal)).toEqual([]);
      expect(modalFormViolations(h)).toContain("ScrollView horizontal fora da exceção");
      expect(modalFormViolations(ok, horizontal)).toContain("0 × ScrollView horizontal (esperado 1)");
    });

    it("detecta <KeyboardSafeView num arquivo", () => {
      expect(rendersKeyboardSafeView(`return <KeyboardSafeView style={s}>{x}</KeyboardSafeView>;`)).toBe(true);
      expect(rendersKeyboardSafeView(`return (\n  <Shared.KeyboardSafeView />\n);`)).toBe(true);
      expect(rendersKeyboardSafeView(`import { KeyboardSafeView } from "./KeyboardSafeView";`)).toBe(false);
      expect(rendersKeyboardSafeView(`// <KeyboardSafeView />`)).toBe(false);
    });

    it("detecta <Modal com campo e decide se está nas listas", () => {
      expect(hasModalWithField(`return <Modal visible><TInput value={v} /></Modal>;`)).toBe(true);
      expect(hasModalWithField(`return <Modal visible><Text>oi</Text></Modal>;`)).toBe(false);
      expect(hasModalWithField(`return <TInput value={v} />;`)).toBe(false);
      expect(hasModalWithField(`return <CategoryPickerModal visible />;\nreturn <TInput />;`)).toBe(false);
      expect(isSelfManagedModal("src/components/novo/NovoModal.tsx")).toBe(false);
      expect(isSelfManagedModal(MODAL_FORMS[0])).toBe(true);
      expect(isSelfManagedModal("app/sync.tsx")).toBe(true);
    });

    it("jsxOpeningTags lê só o nível de cima da tag", () => {
      const [tag] = jsxOpeningTags(`<KeyboardSheet a="x>y" footer={<B onPress={() => go()} />} h={a > b} n>{c}</KeyboardSheet>`, "KeyboardSheet");
      expect(tag).toBe(` a="x>y" footer={} h={} n`);
      expect(jsxOpeningTags(`<ScrollView horizontal={true}/>`, "ScrollView")).toEqual([` horizontal={true}/`]);
    });
  });
});
