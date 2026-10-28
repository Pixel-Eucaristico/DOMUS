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
 * `footer` (e só ele; "Cancelar" vai no fim da rolagem), o toque no fundo pelo
 * `useSheetBackdropPress`, sem segunda compensação de teclado nem rolagem
 * vertical crua. O próprio KeyboardSheet é checado (toque persistente,
 * `flexShrink`, desconto da área segura, estado do teclado, medida do campo).
 *
 * Story 13.4: as buscas em lista dentro de modal usam o `KeyboardListSheet`
 * (busca no `header` fixo, a lista rolável com toque persistente só no
 * `list=`), e o diálogo "APAGAR TUDO" e o onboarding usam o KeyboardSheet com
 * `placement`. Só os contêineres (KEYBOARD_CONTAINERS) renderizam o
 * `KeyboardSafeView`, e todo componente com `<Modal` e campo precisa estar em
 * MODAL_FORMS, MODAL_LISTS ou MODAL_FIELDS_OUTSIDE (com motivo).
 *
 * Story 13.5: só o `app/_layout.tsx` monta `KeyboardProvider` no app. O chat
 * da IA (CHAT_SCREENS) sobe pelo `KeyboardAvoidingView` interno do GiftedChat,
 * ajustado por `keyboardAvoidingViewProps` (offset de
 * `chatKeyboardVerticalOffset`) e `keyboardProviderProps`
 * (`CHAT_KEYBOARD_PROVIDER_PROPS`), dentro de um invólucro que mede o
 * `chatTop` e recorta a translação, sem segunda compensação. Uma sentinela
 * falha se o GiftedChat ou o keyboard-controller mudarem o que a conta pressupõe.
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
  "app/ai-chat.tsx": "chat (CHAT_SCREENS, Story 13.5)",
  "app/import-invoice.tsx": "campos no ParsedScreen (na lista) e no QrScanScreen (KeyboardStickyView, Story 13.6)",
  "app/payslips.tsx": "campos no PayslipReview (na lista)",
};

/** Telas de chat (Story 13.5): o GiftedChat com o KAV interno ajustado por props. */
const CHAT_SCREENS: Record<string, string> = {
  "app/ai-chat.tsx": "GiftedChat com o KAV interno ajustado por props",
};

/**
 * Componentes com `Modal` que também têm campo fora dele: contam como campo na
 * descoberta (o AccountPicker em modo lista tem a busca inline).
 */
const INLINE_FIELD_COMPONENTS = ["src/components/shared/AccountPicker.tsx"];

/** O contêiner único das folhas com formulário em modal (Story 13.3). */
const KEYBOARD_SHEET = "src/components/shared/KeyboardSheet.tsx";
const KEYBOARD_SHEET_MODULE = "@/src/components/shared/KeyboardSheet";

/** O contêiner das buscas em lista dentro de modal (Story 13.4). */
const KEYBOARD_LIST_SHEET = "src/components/shared/KeyboardListSheet.tsx";
const KEYBOARD_LIST_SHEET_MODULE = "@/src/components/shared/KeyboardListSheet";

/** Os únicos arquivos que renderizam o `KeyboardSafeView`. */
const KEYBOARD_CONTAINERS = [KEYBOARD_SHEET, KEYBOARD_LIST_SHEET];

/** Os formulários em modal da auditoria das Stories 13.3 e 13.4. */
const MODAL_FORMS = [
  "src/components/transaction/TransactionBottomSheet.tsx",
  "src/components/shared/AccountFormModal.tsx",
  "src/components/wishlist/CreateListModal.tsx",
  "src/components/wishlist/AddItemModal.tsx",
  "app/about.tsx",
  "src/components/tour/WelcomeCarousel.tsx",
];

/** Rodapé fora do padrão "botão principal" (Story 13.4), com o motivo. */
const FOOTER_EXCEPTIONS: Record<string, string> = {
  "src/components/tour/WelcomeCarousel.tsx":
    "barra própria do carrossel (pontos e \"Próximo\"/\"Começar Tour!\"), sem TButton",
};

/** Modais sem fechar tocando fora (não se acrescenta comportamento), com o motivo. */
const NO_BACKDROP: Record<string, string> = {
  "app/about.tsx": "diálogo \"APAGAR TUDO\": tocar fora não fecha hoje (R-4)",
  "src/components/tour/WelcomeCarousel.tsx": "tela cheia, sem fundo tocável",
  "src/components/shared/CategoryPickerModal.tsx": "sem fechar tocando fora hoje",
  "src/components/debug/DebugTools.tsx": "sem fechar tocando fora hoje",
};

/**
 * As buscas em lista dentro de modal (Story 13.4) e quantas rolagens cada uma
 * tem, todas no `list=` (o DebugTools alterna FlashList e ScrollView por aba).
 */
const MODAL_LISTS: Record<string, { scrolls: number; measureKey?: boolean }> = {
  "src/components/shared/CategoryPickerModal.tsx": { scrolls: 1 },
  "src/components/wishlist/StoreGridModal.tsx": { scrolls: 1 },
  "src/components/shared/AccountPicker.tsx": { scrolls: 1 },
  "src/components/debug/DebugTools.tsx": { scrolls: 2, measureKey: true },
};

/** Componentes com `<Modal` e campo em que nenhum campo fica dentro do modal, com o motivo. */
const MODAL_FIELDS_OUTSIDE: Record<string, string> = {
  "app/sync.tsx": "modal do QR sem campo; campos na tela (13.2)",
};

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
  "src/components/tour/WelcomeCarousel.tsx": {
    component: "ScrollView",
    count: 1,
    reason: "paginador horizontal dos slides (R-3)",
  },
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

/** Usos em JSX de `<Name` e se cada um está dentro de um `<Modal>…</Modal>` (ou de um alias do Modal). */
function jsxUsesInsideModal(source: string, name: string): boolean[] {
  const code = stripComments(source);
  const ranges = modalRanges(code);
  const result: boolean[] = [];
  for (const m of code.matchAll(jsxPattern(name, false))) {
    const at = (m.index ?? 0) + m[0].length;
    result.push(ranges.some(([start, end]) => at > start && at <= end));
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
  return hasFieldTag(code) || /\bonChangeText\s*=/.test(code);
}

/** Campo como tag JSX (`<TextInput`, `<TInput`, `<RN.TextInput`…); `onChangeText` sozinho não conta (R2). */
function hasFieldTag(source: string): boolean {
  const code = stripComments(source);
  return jsxPattern(FIELD_TAGS, false).test(code) || jsxPattern("TextInput|Input|TextArea", true).test(code);
}

// ─── Modais com formulário (Story 13.3) ──────────────────────────────────────

interface JsxOpeningTag {
  /** Atributos do nível de cima (o conteúdo de `{…}` vira `{}`, salvo `{true}`/`{false}`). */
  attrs: string;
  /** Expressão crua de cada atributo `nome={…}` do nível de cima. */
  exprs: Record<string, string>;
}

/**
 * Cada abertura `<Name …>` em JSX, com os atributos do nível de cima e a
 * expressão crua de cada `nome={…}` (para saber se a tag tem `footer=`,
 * `horizontal` e o que vai no `footer`).
 */
function scanJsxOpeningTags(source: string, name: string, namespaced = false): JsxOpeningTag[] {
  const code = stripComments(source);
  const tags: JsxOpeningTag[] = [];
  for (const m of code.matchAll(jsxPattern(name, namespaced))) {
    let i = (m.index ?? 0) + m[0].length;
    let depth = 0;
    let attrs = "";
    let inner = "";
    let attrName: string | null = null;
    const exprs: Record<string, string> = {};
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
        if (depth === 0) {
          inner = "";
          attrName = attrs.match(/([\w$-]+)\s*=\s*$/)?.[1] ?? null;
        } else inner += ch;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          attrs += /^\s*(true|false)\s*$/.test(inner) ? `{${inner.trim()}}` : "{}";
          if (attrName) exprs[attrName] = inner.trim();
        } else inner += ch;
      } else if (depth > 0) {
        inner += ch;
      } else if (ch === ">") {
        break;
      } else {
        attrs += ch;
      }
      i++;
    }
    tags.push({ attrs, exprs });
  }
  return tags;
}

/** Atributos do nível de cima de cada abertura `<Name …>` (ver scanJsxOpeningTags). */
function jsxOpeningTags(source: string, name: string, namespaced = false): string[] {
  return scanJsxOpeningTags(source, name, namespaced).map((t) => t.attrs);
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

/**
 * Nomes com que o arquivo renderiza o `Modal`: `Modal` e os alias de import
 * (`import { Modal as RNModal } from "react-native"`), R2.
 */
function modalNames(code: string): string[] {
  const names = new Set(["Modal"]);
  for (const m of code.matchAll(/(?:^|[;\n])\s*import\s+(?!type\s)[^;]*?\{([^}]*)\}[^;]*?from\s*["'][^"']+["']/g)) {
    for (const member of m[1].split(",")) {
      const alias = member.trim().match(/^Modal\s+as\s+([\w$]+)$/);
      if (alias) names.add(alias[1]);
    }
  }
  return [...names];
}

/** Componente com `<Modal` (ou alias, ou `<NS.Modal`) e campo. */
function hasModalWithField(source: string): boolean {
  const code = stripComments(source);
  const names = modalNames(code).join("|");
  return (jsxPattern(names, false).test(code) || jsxPattern("Modal", true).test(code)) && hasField(source);
}

/** Intervalos [início, fim] dos `<Modal …>…</Modal>` do nível de cima, no código sem comentários. */
function modalRanges(code: string): [number, number][] {
  const names = modalNames(code).map((n) => n.replace(/\$/g, "\\$")).join("|");
  const tag = `(?:[\\w$]+\\s*\\.\\s*)?(?:${names})`;
  const tokens = new RegExp(`<\\s*${tag}\\b|<\\s*\\/\\s*${tag}\\s*>`, "g");
  const ranges: [number, number][] = [];
  let depth = 0;
  let start = -1;
  for (const m of code.matchAll(tokens)) {
    const at = m.index ?? 0;
    if (/^<\s*\//.test(m[0])) {
      if (depth === 0) continue;
      depth--;
      if (depth === 0) ranges.push([start, at + m[0].length]);
    } else {
      if (depth === 0) start = at;
      depth++;
    }
  }
  if (depth > 0) ranges.push([start, code.length]);
  return ranges;
}

/**
 * Trechos `<Modal …>…</Modal>` do nível de cima (o modal aninhado fica dentro
 * do trecho do de fora), no código já sem comentários.
 */
function modalSegments(source: string): string[] {
  const code = stripComments(source);
  return modalRanges(code).map(([start, end]) => code.slice(start, end));
}

/** O trecho `<Modal>` que renderiza `<Name`, ou "" se nenhum. */
function modalSegmentWith(source: string, name: string): string {
  return modalSegments(source).find((seg) => jsxPattern(name, false).test(seg)) ?? "";
}

/** Corpo `(…)` balanceado a partir de `open` (índice do `(`), pulando strings. */
function balancedParens(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) {
        if (code[j] === "\\") j++;
        j++;
      }
      i = j;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  return code.slice(open);
}

/** Corpo `{…}` balanceado a partir de `open` (índice do `{`), pulando strings. */
function balancedBraces(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) {
        if (code[j] === "\\") j++;
        j++;
      }
      i = j;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  return code.slice(open);
}

/** Tira o conteúdo das strings (o nome dentro de um texto não é uso do identificador). */
function withoutStrings(code: string): string {
  return code.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
}

/** Profundidade máxima da resolução de identificadores locais. */
const LOCAL_JSX_DEPTH = 3;

/**
 * A expressão mais as definições locais que ela usa, em até `LOCAL_JSX_DEPTH`
 * níveis (R2): `const nome = (<…>)` / `const nome = <…>` citados como valor
 * (não como chave `nome:` nem `.nome`, nem dentro de string) e componentes do
 * arquivo usados como `<Nome` (`function Nome(…) {…}` ou `const Nome = (…) =>`).
 * Assim o campo declarado à parte (`{searchBar}`, `<SearchField />`) conta, e um
 * nome parecido não.
 */
function expandLocalJsx(expr: string, source: string, depth = LOCAL_JSX_DEPTH): string {
  const code = stripComments(source);
  const defs: { name: string; body: string }[] = [];
  for (const m of code.matchAll(/\bconst\s+([\w$]+)\s*=\s*(\(\s*<|<)/g)) {
    const at = (m.index ?? 0) + m[0].length - m[2].length;
    const body = code[at] === "(" ? balancedParens(code, at) : code.slice(at, code.indexOf(";", at) + 1 || undefined);
    defs.push({ name: m[1], body });
  }
  for (const m of code.matchAll(/\bfunction\s+([A-Z][\w$]*)\s*\(/g)) {
    const open = code.indexOf("{", code.indexOf(")", m.index ?? 0));
    if (open !== -1) defs.push({ name: m[1], body: balancedBraces(code, open) });
  }
  for (const m of code.matchAll(/\bconst\s+([A-Z][\w$]*)\s*=\s*\([^)]*\)\s*=>\s*/g)) {
    const at = (m.index ?? 0) + m[0].length;
    const body = code[at] === "(" ? balancedParens(code, at) : code[at] === "{" ? balancedBraces(code, at) : "";
    defs.push({ name: m[1], body });
  }
  let out = expr;
  let frontier = expr;
  const seen = new Set<string>();
  for (let level = 0; level < depth; level++) {
    const plain = withoutStrings(frontier);
    let next = "";
    for (const def of defs) {
      if (seen.has(def.name)) continue;
      const id = def.name.replace(/\$/g, "\\$");
      const asValue = [...plain.matchAll(new RegExp(`(?<![\\w$.])${id}(?![\\w$])`, "g"))].some((u) => {
        // `{ nome: …}` / `, nome: …` é chave de objeto, não uso do valor.
        const before = plain.slice(0, u.index).trimEnd().slice(-1);
        const after = plain.slice((u.index ?? 0) + u[0].length).trimStart()[0];
        return !((before === "{" || before === ",") && after === ":");
      });
      const asTag = jsxPattern(id, false).test(plain);
      if (!asValue && !asTag) continue;
      seen.add(def.name);
      next += `\n${def.body}`;
    }
    if (!next) break;
    out += next;
    frontier = next;
  }
  return out;
}

/** Os componentes do teclado de `names` usados em JSX, ou importados e não usados fora de `segment`. */
function secondKeyboardSystems(source: string, segment: string, names: string[]): string[] {
  const code = stripComments(source);
  const outside = code.replace(segment, "");
  const imports = parseImports(code);
  const hits: string[] = [];
  for (const name of names) {
    if (jsxPattern(name, false).test(segment) || jsxPattern(name, true).test(segment)) hits.push(`<${name}`);
    else if (
      imports.some((imp) => imp.named.includes(name)) &&
      !jsxPattern(name, false).test(outside) &&
      !jsxPattern(name, true).test(outside)
    ) {
      hits.push(`import ${name}`);
    }
  }
  return hits;
}

/** O toque no fundo passa pelo useSheetBackdropPress (com teclado aberto só fecha o teclado). */
function backdropViolations(code: string): string[] {
  const backdropImported = parseImports(code).some(
    (imp) => imp.module === KEYBOARD_SHEET_MODULE && imp.named.includes("useSheetBackdropPress"),
  );
  const backdropHandler = code.match(/\bconst\s+([\w$]+)\s*=\s*useSheetBackdropPress\s*\(/)?.[1];
  if (!backdropImported || !backdropHandler) return ["fundo sem useSheetBackdropPress"];
  if (!new RegExp(`\\bonPress\\s*=\\s*\\{\\s*${backdropHandler.replace(/\$/g, "\\$")}\\s*\\}`).test(code)) {
    return [`${backdropHandler} não está em nenhum onPress`];
  }
  return [];
}

interface ModalFormOptions {
  /** Sem fundo tocável (NO_BACKDROP). */
  noBackdrop?: boolean;
  /** Rodapé próprio (FOOTER_EXCEPTIONS): só precisa ser um elemento JSX. */
  footerException?: boolean;
}

/** Motivos pelos quais um formulário em modal foge do padrão KeyboardSheet. */
function modalFormViolations(
  source: string,
  horizontal?: { component: string; count: number },
  options: ModalFormOptions = {},
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

  // 2. passa ao KeyboardSheet um footer={<…>} com o botão principal (e só ele:
  //    "Cancelar" fica no fim da rolagem), sem esconder o rodapé de vez. No
  //    diálogo (placement="center", D-2) o principal pode ser `danger` e
  //    "Cancelar" fica ao lado.
  for (const tag of scanJsxOpeningTags(source, "KeyboardSheet")) {
    if (!/(?:^|\s)footer\s*=/.test(tag.attrs)) {
      hits.push("KeyboardSheet sem footer=");
      continue;
    }
    const dialog = /(?:^|\s)placement\s*=\s*["']center["']/.test(tag.attrs);
    hits.push(...footerViolations(tag.exprs.footer, { dialog, exception: options.footerException }));
    if (/(?:^|\s)footerVisible\s*=\s*\{false\}/.test(tag.attrs)) hits.push("footerVisible={false}");
  }

  // 3. nenhuma segunda compensação de teclado no <Modal> do KeyboardSheet (a
  //    tela em volta pode ter a dela, como o about.tsx com a da 13.2).
  const segment = modalSegmentWith(source, "KeyboardSheet") || code;
  hits.push(...secondKeyboardSystems(source, segment, SECOND_KEYBOARD_SYSTEMS));

  // 4. sem rolagem vertical crua no modal; horizontais só as da exceção, na contagem.
  let horizontalCount = 0;
  for (const name of SCROLL_COMPONENTS) {
    const tags = [...jsxOpeningTags(segment, name), ...jsxOpeningTags(segment, name, true)];
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

  // 5. o toque no fundo passa pelo useSheetBackdropPress (salvo NO_BACKDROP).
  if (!options.noBackdrop) hits.push(...backdropViolations(code));
  return hits;
}

/** O que há de errado no `footer={…}` de um KeyboardSheet (expressão crua). */
function footerViolations(
  expr: string | undefined,
  { dialog = false, exception = false }: { dialog?: boolean; exception?: boolean } = {},
): string[] {
  if (expr === undefined) return ["footer sem expressão {…}"];
  const body = expr.replace(/^\(+\s*/, "").replace(/\s*\)+$/, "");
  if (!body.startsWith("<") || /^<\s*>\s*<\s*\/\s*>$/.test(body)) return ["footer não é um elemento JSX"];
  if (exception) return [];
  const hits: string[] = [];
  const primary = dialog ? /\bvariant\s*=\s*["'](primary|danger)["']/ : /\bvariant\s*=\s*["']primary["']/;
  if (!primary.test(body)) hits.push("footer sem botão principal");
  if (!dialog && /Cancelar/.test(body)) hits.push("Cancelar no footer");
  return hits;
}

/** O que falta no próprio KeyboardSheet.tsx para o padrão da 13.3 valer. */
function keyboardSheetViolations(source: string): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  const scrolls = scanJsxOpeningTags(source, "ScrollView");
  if (scrolls.length !== 1) hits.push(`${scrolls.length} × <ScrollView (esperado 1)`);
  for (const tag of scrolls) {
    if (!/(?:^|\s)keyboardShouldPersistTaps\s*=\s*["']handled["']/.test(tag.attrs)) {
      hits.push('ScrollView sem keyboardShouldPersistTaps="handled"');
    }
  }
  for (const style of ["sheet", "scroll"]) {
    if (!new RegExp(`\\b${style}\\s*:\\s*\\{[^}]*\\bflexShrink\\s*:\\s*1\\b`).test(code)) hits.push(`${style} sem flexShrink: 1`);
  }
  const safe = scanJsxOpeningTags(source, "KeyboardSafeView");
  if (safe.length !== 1) hits.push(`${safe.length} × <KeyboardSafeView (esperado 1)`);
  for (const tag of safe) {
    if (!/^sheetLiftDiscount\s*\(/.test(tag.exprs.liftDiscount ?? "")) hits.push("liftDiscount sem sheetLiftDiscount(…)");
  }
  for (const name of SECOND_KEYBOARD_SYSTEMS.filter((n) => n !== "KeyboardSafeView")) {
    if (jsxPattern(name, false).test(code) || jsxPattern(name, true).test(code)) hits.push(`<${name}`);
  }
  // Estado do teclado: começa em 0 e só segue os eventos depois de montar (R6).
  if (/\buseKeyboardState\b|KeyboardController\s*\.\s*state\s*\(/.test(code)) hits.push("lê o estado global do teclado");
  for (const event of ["keyboardDidShow", "keyboardDidHide"]) {
    if (!new RegExp(`KeyboardEvents\\s*\\.\\s*addListener\\(\\s*["']${event}["']`).test(code)) hits.push(`sem ${event}`);
  }
  // Diálogo (R3 da revisão da 13.4): a raiz e o desconto do espaçador recebem o insets.bottom.
  if (!/\bsheetRootPadding\s*\(\s*insets\.top\s*,\s*placement\s*,\s*insets\.bottom\s*\)/.test(code)) {
    hits.push("sheetRootPadding sem insets.bottom");
  }
  for (const tag of safe) {
    if (!/,\s*insets\.bottom\s*\)\s*$/.test(tag.exprs.liftDiscount ?? "")) hits.push("liftDiscount sem insets.bottom");
  }
  // Ajuste até o campo: medido no conteúdo da rolagem, sem scrollY guardado (R3/R4).
  if (!/\.measureLayout\s*\(/.test(code)) hits.push("campo sem measureLayout");
  if (/\bonScroll\s*=|\bscrollY\b/.test(code)) hits.push("scrollY em cache");
  return hits;
}

// ─── Buscas e diálogos em modal (Story 13.4) ─────────────────────────────────

/** Rolagens que contam nas buscas em lista (a FlashList entra só aqui). */
const LIST_SCROLL_COMPONENTS = [...SCROLL_COMPONENTS, "FlashList"];

const PERSIST_HANDLED = /(?:^|\s)keyboardShouldPersistTaps\s*=\s*["']handled["']/;

/** O que falta no próprio KeyboardListSheet.tsx para o padrão da 13.4 valer. */
function keyboardListSheetViolations(source: string): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  for (const style of ["sheet", "list"]) {
    if (!new RegExp(`\\b${style}\\s*:\\s*\\{[^}]*\\bflexShrink\\s*:\\s*1\\b`).test(code)) hits.push(`${style} sem flexShrink: 1`);
  }
  const safe = scanJsxOpeningTags(source, "KeyboardSafeView");
  if (safe.length !== 1) hits.push(`${safe.length} × <KeyboardSafeView (esperado 1)`);
  for (const tag of safe) {
    if (!/^sheetLiftDiscount\s*\(/.test(tag.exprs.liftDiscount ?? "")) hits.push("liftDiscount sem sheetLiftDiscount(…)");
  }
  // A rolagem é a do chamador (`list`); a busca fica no cabeçalho, que nunca rola.
  for (const name of LIST_SCROLL_COMPONENTS) {
    if (jsxPattern(name, false).test(code) || jsxPattern(name, true).test(code)) hits.push(`<${name} próprio`);
  }
  for (const name of SECOND_KEYBOARD_SYSTEMS.filter((n) => n !== "KeyboardSafeView")) {
    if (jsxPattern(name, false).test(code) || jsxPattern(name, true).test(code)) hits.push(`<${name}`);
  }
  // Estado do teclado: começa em 0 e só segue os eventos depois de montar (R6).
  if (/\buseKeyboardState\b|KeyboardController\s*\.\s*state\s*\(/.test(code)) hits.push("lê o estado global do teclado");
  const events = ["keyboardDidShow", "keyboardDidHide"].every((event) =>
    new RegExp(`KeyboardEvents\\s*\\.\\s*addListener\\(\\s*["']${event}["']`).test(code),
  );
  if (!/\buseSheetKeyboardHeight\s*\(/.test(code) && !events) hits.push("sem useSheetKeyboardHeight nem os eventos do teclado");
  // R1: os filhos saem de listSheetSlots (busca sempre no mesmo lugar); nada de trocar cabeçalhos.
  if (!/\blistSheetSlots\s*\(/.test(code)) hits.push("filhos fora do listSheetSlots(…)");
  if (/\bcompactHeader\b/.test(code)) hits.push("compactHeader (troca de cabeçalho remonta o campo)");
  // R5: a medida do título é descartada quando o measureKey muda.
  if (!/useEffect\s*\([\s\S]*?\[\s*measureKey\s*\]\s*\)/.test(code)) hits.push("measureKey não refaz a medida");
  return hits;
}

/** O que falta no WelcomeCarousel: voltar a rolagem ao topo ao trocar de slide (R7) e o "Pular" inteiro no cabeçalho (R8). */
function carouselViolations(source: string): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  const ref = scanJsxOpeningTags(source, "KeyboardSheet")[0]?.exprs.scrollRef;
  if (!ref) hits.push("KeyboardSheet sem scrollRef=");
  const goTo = code.match(/\bconst\s+goTo\s*=\s*\([^)]*\)\s*=>\s*\{/);
  const body = goTo ? balancedBraces(code, (goTo.index ?? 0) + goTo[0].length - 1) : "";
  if (!ref || !new RegExp(`\\b${ref.replace(/[.$]/g, "\\$&")}\\.current\\??\\.scrollTo\\(\\s*\\{\\s*y\\s*:\\s*0\\b`).test(body)) {
    hits.push("goTo não volta a rolagem vertical ao topo");
  }
  const header = scanJsxOpeningTags(source, "KeyboardSheet")[0]?.exprs.header ?? "";
  if (!/\bminHeight\s*:\s*skipHeaderMinHeight\s*\(/.test(header)) hits.push("cabeçalho sem minHeight: skipHeaderMinHeight(…)");
  return hits;
}

interface ModalListOptions {
  /** Quantas rolagens o modal tem, todas no `list=`. */
  scrolls: number;
  /** Sem fundo tocável (NO_BACKDROP). */
  noBackdrop?: boolean;
  /** O título muda de altura sem estar à mostra (abas): exige `measureKey=` (R5). */
  measureKey?: boolean;
}

/**
 * Motivos pelos quais uma busca em lista dentro de modal foge do padrão
 * KeyboardListSheet. Vale só no trecho do `<Modal>` (o AccountPicker em modo
 * lista tem a busca inline fora dele).
 */
function modalListViolations(
  source: string,
  { scrolls, noBackdrop = false, measureKey = false }: ModalListOptions,
): string[] {
  const code = stripComments(source);
  const hits: string[] = [];

  // 1. importa e renderiza o KeyboardListSheet exatamente uma vez, dentro de <Modal>.
  const imported = parseImports(code).some(
    (imp) => imp.module === KEYBOARD_LIST_SHEET_MODULE && imp.named.includes("KeyboardListSheet"),
  );
  if (!imported) hits.push(`não importa KeyboardListSheet de ${KEYBOARD_LIST_SHEET_MODULE}`);
  const uses = jsxUsesInsideModal(source, "KeyboardListSheet");
  if (uses.length !== 1) hits.push(`${uses.length} × <KeyboardListSheet (esperado 1)`);
  if (uses.some((inside) => !inside)) hits.push("KeyboardListSheet fora de Modal");

  // 2. o campo fica no espaço único `search` (sempre renderizado, mesma
  //    instância com o título à mostra ou recolhido, R1) e nunca no `title`,
  //    que some em janela baixa. Campo = tag JSX, resolvendo definições locais (R2).
  const tags = scanJsxOpeningTags(source, "KeyboardListSheet");
  for (const tag of tags) {
    for (const prop of ["title", "search", "list"]) {
      if (tag.exprs[prop] === undefined) hits.push(`KeyboardListSheet sem ${prop}={…}`);
    }
    for (const prop of ["header", "compactHeader"]) {
      if (new RegExp(`(?:^|\\s)${prop}\\s*=`).test(tag.attrs)) hits.push(`${prop}= (use title e search)`);
    }
    if (tag.exprs.search !== undefined && !hasFieldTag(expandLocalJsx(tag.exprs.search, source))) hits.push("search sem campo");
    if (tag.exprs.title !== undefined && hasFieldTag(expandLocalJsx(tag.exprs.title, source))) hits.push("campo no title");
    if (measureKey && !/(?:^|\s)measureKey\s*=/.test(tag.attrs)) hits.push("sem measureKey= (título muda de altura)");
  }

  // 3. nenhuma segunda compensação de teclado no modal.
  const segment = modalSegmentWith(source, "KeyboardListSheet") || code;
  hits.push(...secondKeyboardSystems(source, segment, SECOND_KEYBOARD_SYSTEMS));

  // 4. toda rolagem do modal tem toque persistente e fica no list=, na contagem.
  const listExpr = tags[0]?.exprs.list ?? "";
  let total = 0;
  let inList = 0;
  for (const name of LIST_SCROLL_COMPONENTS) {
    const all = [...scanJsxOpeningTags(segment, name), ...scanJsxOpeningTags(segment, name, true)];
    total += all.length;
    for (const tag of all) {
      if (!PERSIST_HANDLED.test(tag.attrs)) hits.push(`${name} sem keyboardShouldPersistTaps="handled"`);
    }
    inList += scanJsxOpeningTags(listExpr, name).length + scanJsxOpeningTags(listExpr, name, true).length;
  }
  if (total !== scrolls) hits.push(`${total} × rolagem no modal (esperado ${scrolls})`);
  if (inList !== total) hits.push(`${total - inList} × rolagem fora do list=`);

  // 5. o toque no fundo passa pelo useSheetBackdropPress (salvo NO_BACKDROP).
  if (!noBackdrop) hits.push(...backdropViolations(code));
  return hits;
}

/** Quantos campos ficam dentro de um `<Modal>…</Modal>` (MODAL_FIELDS_OUTSIDE exige 0). */
function fieldsInsideModal(source: string): number {
  return jsxUsesInsideModal(source, FIELD_TAGS).filter(Boolean).length;
}

/** Componente com `Modal` e campo que já cuida do teclado (está numa das três listas). */
function isSelfManagedModal(relPath: string): boolean {
  return MODAL_FORMS.includes(relPath) || relPath in MODAL_LISTS || relPath in MODAL_FIELDS_OUTSIDE;
}

// ─── Chat da IA (Story 13.5) ─────────────────────────────────────────────────

const ROOT_LAYOUT = "app/_layout.tsx";
const CHAT_LAYOUT = "src/components/ai/chatKeyboardLayout.ts";
const CHAT_LAYOUT_MODULE = "@/src/components/ai/chatKeyboardLayout";
const GIFTED_CHAT_MODULE = "react-native-gifted-chat";

/** Componentes dos próprios componentes do chat, que sobem com o KAV do GiftedChat (sem compensação própria). */
const CHAT_COMPONENTS = [
  "src/components/ai/ChatInputBar.tsx",
  "src/components/ai/ChatActionMenu.tsx",
  "src/components/ai/QuickSuggestions.tsx",
  "src/components/ai/ProviderSwitchModal.tsx",
  "src/components/ai/DataPermissionModal.tsx",
  "src/components/ai/FinancialTooltip.tsx",
];

/** Versões que a conta do offset do chat pressupõe (sentinela). */
const CHAT_SENTINEL_VERSIONS = { giftedChat: "3.3.2", keyboardController: "1.18.5" };
const CHAT_SENTINEL_FILES = {
  giftedPkg: "node_modules/react-native-gifted-chat/package.json",
  kcPkg: "node_modules/react-native-keyboard-controller/package.json",
  giftedIndex: "node_modules/react-native-gifted-chat/src/GiftedChat/index.tsx",
  kav: "node_modules/react-native-keyboard-controller/src/components/KeyboardAvoidingView/index.tsx",
};
const CHAT_SENTINEL_MESSAGE = "rever a Story 13.5 (offset do chat)";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** O arquivo importa algo do keyboard-controller (inclusive `import type`, `require`, `import()` e reexportação). */
function importsKeyboardController(code: string): boolean {
  return (
    new RegExp(`\\bfrom\\s*${KC}`).test(code) ||
    new RegExp(`\\b(?:require|import)\\(\\s*${KC}\\s*\\)`).test(code) ||
    new RegExp(`\\bimport\\s*${KC}`).test(code)
  );
}

/**
 * Motivos pelos quais o arquivo importa ou renderiza o `KeyboardProvider`
 * (nomeado, alias, namespace, `require`, `import()`, reexportação ou `<KeyboardProvider`).
 */
function keyboardProviderUses(source: string): string[] {
  const code = stripComments(source);
  const plain = withoutStrings(code);
  const mentions = /(?<![\w$])KeyboardProvider(?![\w$])/.test(plain);
  const hits: string[] = [];
  for (const imp of parseImports(code)) {
    if (imp.module !== KC_MODULE) continue;
    if (imp.named.includes("KeyboardProvider")) hits.push("import nomeado");
    if (imp.namespace && mentions) hits.push("import * as");
    if (imp.defaultName && mentions) hits.push("import default");
  }
  for (const m of code.matchAll(new RegExp(`export\\s+(type\\s+)?\\{([^}]*)\\}\\s*from\\s*${KC}`, "g"))) {
    const values = m[1] ? [] : m[2].split(",").map((x) => x.trim()).filter((x) => x && !/^type\s/.test(x));
    if (values.some((x) => x.split(/\s+as\s+/)[0].trim() === "KeyboardProvider")) hits.push("reexportação");
  }
  if (new RegExp(`export\\s+\\*\\s*(?:as\\s+[\\w$]+\\s*)?from\\s*${KC}`).test(code)) hits.push("export * from");
  if (mentions && new RegExp(`\\brequire\\(\\s*${KC}\\s*\\)`).test(code)) hits.push("require");
  if (mentions && new RegExp(`\\bimport\\(\\s*${KC}\\s*\\)`).test(code)) hits.push("import()");
  if (jsxPattern("KeyboardProvider", false).test(code) || jsxPattern("KeyboardProvider", true).test(code)) {
    hits.push("<KeyboardProvider");
  }
  return hits;
}

/** Quantos `<KeyboardProvider` (direto ou por namespace) o arquivo renderiza. */
function countKeyboardProviders(source: string): number {
  const code = stripComments(source);
  return [...code.matchAll(jsxPattern("KeyboardProvider", false))].length + [...code.matchAll(jsxPattern("KeyboardProvider", true))].length;
}

/** Nomes com que o arquivo renderiza o GiftedChat: `GiftedChat`, alias de import e default (R2 da 13.4). */
function giftedChatNames(code: string): string[] {
  const names = new Set(["GiftedChat"]);
  const re = new RegExp(`(?:^|[;\\n])\\s*import\\s+(?!type\\s)([^;]*?)\\s+from\\s*["']${escapeRe(GIFTED_CHAT_MODULE)}["']`, "g");
  for (const m of code.matchAll(re)) {
    const clause = m[1];
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const member of braces[1].split(",")) {
        const alias = member.trim().match(/^GiftedChat\s+as\s+([\w$]+)$/);
        if (alias) names.add(alias[1]);
      }
    }
    const def = clause.replace(/\{[^}]*\}/, "").replace(/\*\s*as\s+[\w$]+/, "").replace(/,/g, " ").trim();
    if (def) names.add(def);
  }
  return [...names];
}

/** Fim (índice do `>`) da abertura que começa em `at`, pulando strings e `{…}`; e se ela fecha sozinha (`/>`). */
function openingTagEnd(code: string, at: number): { end: number; selfClosing: boolean } {
  let depth = 0;
  for (let i = at; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) {
        if (code[j] === "\\") j++;
        j++;
      }
      i = j;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return { end: i, selfClosing: code[i - 1] === "/" };
  }
  return { end: code.length, selfClosing: false };
}

/** Intervalos [início, fim] de cada `<View …>…</View>` cuja abertura passa em `match(attrs)`. */
function viewRanges(code: string, match: (attrs: string) => boolean): [number, number][] {
  // Aberturas só em posição de JSX (não pega genérico como `useRef<View>`).
  const opens = [...code.matchAll(jsxPattern("View", false))].map((m) => {
    const at = (m.index ?? 0) + m[0].lastIndexOf("<");
    return { at, close: false, after: (m.index ?? 0) + m[0].length };
  });
  const closes = [...code.matchAll(/<\s*\/\s*View\s*>/g)].map((m) => ({
    at: m.index ?? 0,
    close: true,
    after: (m.index ?? 0) + m[0].length,
  }));
  const ranges: [number, number][] = [];
  const stack: { start: number; wanted: boolean }[] = [];
  for (const { at, close, after } of [...opens, ...closes].sort((a, b) => a.at - b.at)) {
    if (close) {
      const open = stack.pop();
      if (open?.wanted) ranges.push([open.start, after]);
      continue;
    }
    const { end, selfClosing } = openingTagEnd(code, after);
    if (selfClosing) continue;
    stack.push({ start: at, wanted: match(code.slice(at, end + 1)) });
  }
  return ranges;
}

/** A expressão de um prop, resolvendo um identificador local (`const x = useMemo(…)` ou `const x = {…}`). */
function resolveLocalValue(expr: string, code: string): string {
  const id = expr.trim();
  if (!/^[\w$]+$/.test(id)) return expr;
  const def = code.match(new RegExp(`\\bconst\\s+${escapeRe(id)}\\s*(?::[^=]+)?=\\s*`));
  if (!def) return expr;
  const at = (def.index ?? 0) + def[0].length;
  const rest = code.slice(at);
  const memo = rest.match(/^useMemo\s*\(/);
  if (memo) return balancedParens(code, at + memo[0].length - 1);
  if (rest.startsWith("{")) return balancedBraces(code, at);
  return code.slice(at, code.indexOf(";", at) + 1 || undefined);
}

/** Motivos pelos quais uma tela de chat (CHAT_SCREENS) foge do padrão da Story 13.5. */
function chatScreenViolations(source: string): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  const imports = parseImports(code);

  // 1. sem provider próprio nem segunda compensação.
  if (importsKeyboardController(code)) hits.push("importa react-native-keyboard-controller");
  for (const name of SECOND_KEYBOARD_SYSTEMS) {
    if (jsxPattern(name, false).test(code) || jsxPattern(name, true).test(code)) hits.push(`<${name}`);
    else if (imports.some((imp) => imp.named.includes(name))) hits.push(`import ${name}`);
  }
  if (/\bKeyboard\s*\.\s*addListener\s*\(/.test(code)) hits.push("Keyboard.addListener");
  for (const hook of ["useKeyboardHandler", "useKeyboardAnimation"]) {
    if (new RegExp(`\\b${hook}\\s*\\(`).test(code)) hits.push(hook);
  }

  // 2. exatamente um <GiftedChat (alias resolvido).
  const names = giftedChatNames(code);
  const tags = names.flatMap((n) => scanJsxOpeningTags(source, escapeRe(n)));
  const nsTags = scanJsxOpeningTags(source, "GiftedChat", true);
  const all = [...tags, ...nsTags];
  if (all.length !== 1) hits.push(`${all.length} × <GiftedChat (esperado 1)`);

  // 3. o KAV interno ajustado por props.
  for (const tag of all) {
    const kav = tag.exprs.keyboardAvoidingViewProps;
    if (kav === undefined) hits.push("GiftedChat sem keyboardAvoidingViewProps={…}");
    else {
      const value = resolveLocalValue(kav, code);
      if (!/\bkeyboardVerticalOffset\s*:\s*chatKeyboardVerticalOffset\s*\(/.test(value)) {
        hits.push("keyboardVerticalOffset sem chatKeyboardVerticalOffset(…)");
      }
      if (/\benabled\s*:/.test(value)) hits.push("keyboardAvoidingViewProps com enabled:");
      if (/\bbehavior\s*:/.test(value)) hits.push("keyboardAvoidingViewProps com behavior:");
    }
    if (tag.exprs.keyboardProviderProps?.trim() !== "CHAT_KEYBOARD_PROVIDER_PROPS") {
      hits.push("keyboardProviderProps não é CHAT_KEYBOARD_PROVIDER_PROPS");
    }
  }
  const layoutImport = imports.find((imp) => imp.module === CHAT_LAYOUT_MODULE);
  for (const name of ["CHAT_KEYBOARD_PROVIDER_PROPS", "chatKeyboardVerticalOffset"]) {
    if (!layoutImport?.named.includes(name)) hits.push(`não importa ${name} de ${CHAT_LAYOUT_MODULE}`);
  }

  // 4. invólucro: <View style={styles.chatFrame} onLayout=…> em volta do GiftedChat; chatFrame com flex: 1 e overflow: "hidden".
  const frames = viewRanges(code, (attrs) => /\bstyle\s*=\s*\{\s*styles\.chatFrame\s*\}/.test(attrs) && /\bonLayout\s*=/.test(attrs));
  const tagNames = [...names.map(escapeRe), "[\\w$]+\\s*\\.\\s*GiftedChat"].join("|");
  const giftedAt = [...code.matchAll(new RegExp(`<\\s*(?:${tagNames})\\b`, "g"))].map((m) => m.index ?? 0);
  if (giftedAt.length === 0 || !giftedAt.every((at) => frames.some(([s, e]) => at > s && at < e))) {
    hits.push("GiftedChat fora de <View style={styles.chatFrame} onLayout=…>");
  }
  const frameStyle = code.match(/\bchatFrame\s*:\s*\{([^}]*)\}/)?.[1];
  if (frameStyle === undefined) hits.push("sem styles.chatFrame");
  else {
    if (!/\boverflow\s*:\s*["']hidden["']/.test(frameStyle)) hits.push('chatFrame sem overflow: "hidden"');
    if (!/\bflex\s*:\s*1\b/.test(frameStyle)) hits.push("chatFrame sem flex: 1");
  }
  return hits;
}

/** O módulo das contas do chat nunca desliga o provider interno (mataria o deslocamento). */
function chatLayoutModuleViolations(source: string): string[] {
  return /\benabled\s*:\s*false\b/.test(stripComments(source)) ? ["enabled: false"] : [];
}

/** A rota do chat começa no topo da janela (D-2 a): sem cabeçalho nativo e sem `presentation:`. */
function chatRouteViolations(layoutSource: string, route = "ai-chat"): string[] {
  const hits: string[] = [];
  const screens = scanJsxOpeningTags(layoutSource, "Screen", true).filter((t) =>
    new RegExp(`(?:^|\\s)name\\s*=\\s*["']${escapeRe(route)}["']`).test(t.attrs),
  );
  if (screens.length !== 1) return [`${screens.length} × Stack.Screen name="${route}" (esperado 1)`];
  const options = screens[0].exprs.options ?? "";
  if (!/\bheaderShown\s*:\s*false\b/.test(options)) hits.push(`${route} sem headerShown: false`);
  if (/\bpresentation\s*:/.test(options)) hits.push(`${route} com presentation:`);
  for (const stack of scanJsxOpeningTags(layoutSource, "Stack")) {
    if (/\bpresentation\s*:/.test(stack.exprs.screenOptions ?? "")) hits.push("Stack com presentation: em screenOptions");
  }
  return hits;
}

/** Componente do chat sem compensação própria de teclado. */
function chatComponentViolations(source: string): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  if (importsKeyboardController(code)) hits.push("importa react-native-keyboard-controller");
  const imports = parseImports(code);
  for (const name of SECOND_KEYBOARD_SYSTEMS) {
    if (jsxPattern(name, false).test(code) || jsxPattern(name, true).test(code)) hits.push(`<${name}`);
    else if (imports.some((imp) => imp.named.includes(name))) hits.push(`import ${name}`);
  }
  return hits;
}

interface ChatSentinelSources {
  giftedPkg: string;
  kcPkg: string;
  giftedIndex: string;
  kav: string;
}

/** Sentinela de versão: o que a conta do offset do chat pressupõe do GiftedChat e do keyboard-controller. */
function chatSentinelViolations(src: ChatSentinelSources): string[] {
  const hits: string[] = [];
  const version = (pkg: string) => {
    try {
      return (JSON.parse(pkg) as { version?: string }).version ?? "?";
    } catch {
      return "?";
    }
  };
  if (version(src.giftedPkg) !== CHAT_SENTINEL_VERSIONS.giftedChat) {
    hits.push(`react-native-gifted-chat ${version(src.giftedPkg)} (esperado ${CHAT_SENTINEL_VERSIONS.giftedChat})`);
  }
  if (version(src.kcPkg) !== CHAT_SENTINEL_VERSIONS.keyboardController) {
    hits.push(`react-native-keyboard-controller ${version(src.kcPkg)} (esperado ${CHAT_SENTINEL_VERSIONS.keyboardController})`);
  }
  const after = (code: string, first: RegExp, second: RegExp) => {
    const a = code.search(first);
    const b = code.search(second);
    return a !== -1 && b !== -1 && b > a;
  };
  if (!after(src.giftedIndex, /\bkeyboardVerticalOffset\s*=/, /\{\s*\.\.\.\s*props\.keyboardAvoidingViewProps\s*\}/)) {
    hits.push("GiftedChat: {...props.keyboardAvoidingViewProps} não vem depois de keyboardVerticalOffset=");
  }
  if (!after(src.giftedIndex, /\bnavigationBarTranslucent\b/, /\{\s*\.\.\.\s*keyboardProviderProps\s*\}/)) {
    hits.push("GiftedChat: {...keyboardProviderProps} não vem depois de navigationBarTranslucent");
  }
  if (!src.kav.includes("frame.value.y + frame.value.height - keyboardY")) {
    hits.push("KeyboardAvoidingView: sem frame.value.y + frame.value.height - keyboardY");
  }
  if (!/screenHeight\s*-\s*keyboard\.heightWhenOpened\.value\s*-\s*keyboardVerticalOffset/.test(src.kav)) {
    hits.push("KeyboardAvoidingView: keyboardY mudou");
  }
  return hits.map((h) => `${h}: ${CHAT_SENTINEL_MESSAGE}`);
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
 * MODAL_FORMS, MODAL_LISTS e MODAL_FIELDS_OUTSIDE), ou da lista
 * INLINE_FIELD_COMPONENTS.
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

  it("encontra os contêineres e os modais das listas", () => {
    for (const file of [...KEYBOARD_CONTAINERS, ...MODAL_FORMS, ...Object.keys(MODAL_LISTS), ...Object.keys(MODAL_FIELDS_OUTSIDE)]) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
    }
    for (const file of Object.keys(MODAL_HORIZONTAL_SCROLLS)) expect(MODAL_FORMS, file).toContain(file);
    for (const file of Object.keys(FOOTER_EXCEPTIONS)) expect(MODAL_FORMS, file).toContain(file);
    for (const file of Object.keys(NO_BACKDROP)) {
      expect(MODAL_FORMS.includes(file) || file in MODAL_LISTS, file).toBe(true);
    }
  });

  it.each(MODAL_FORMS)("%s usa o KeyboardSheet com footer, sem segunda compensação nem rolagem vertical crua", (file) => {
    expect(
      modalFormViolations(read(file), MODAL_HORIZONTAL_SCROLLS[file], {
        noBackdrop: file in NO_BACKDROP,
        footerException: file in FOOTER_EXCEPTIONS,
      }),
    ).toEqual([]);
  });

  it("o KeyboardSheet persiste o toque, encolhe, desconta a área segura, começa sem teclado e mede o campo no conteúdo", () => {
    expect(keyboardSheetViolations(read(KEYBOARD_SHEET))).toEqual([]);
  });

  it("só os contêineres (KeyboardSheet e KeyboardListSheet) renderizam o KeyboardSafeView", () => {
    const hits = files
      .filter((f) => !KEYBOARD_CONTAINERS.includes(rel(f)))
      .filter((f) => rendersKeyboardSafeView(fs.readFileSync(f, "utf8")))
      .map(rel);
    expect(hits).toEqual([]);
    for (const file of KEYBOARD_CONTAINERS) expect(rendersKeyboardSafeView(read(file)), file).toBe(true);
  });

  it("todo componente com <Modal e campo está em MODAL_FORMS, MODAL_LISTS ou MODAL_FIELDS_OUTSIDE", () => {
    const missing = files
      .filter((f) => hasModalWithField(fs.readFileSync(f, "utf8")))
      .map(rel)
      .filter((f) => !isSelfManagedModal(f));
    expect(missing).toEqual([]);
  });

  it("cada lista aponta para arquivos que existem e ainda têm <Modal (sem repetir arquivo entre listas)", () => {
    const all = [...MODAL_FORMS, ...Object.keys(MODAL_LISTS), ...Object.keys(MODAL_FIELDS_OUTSIDE)];
    expect(new Set(all).size).toBe(all.length);
    for (const file of all) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(hasModalWithField(read(file)), file).toBe(true);
    }
  });
});

describe("buscas e diálogos em modal (Story 13.4)", () => {
  it.each(Object.keys(MODAL_LISTS))(
    "%s usa o KeyboardListSheet com a busca no espaço search (único) e as rolagens no list=, com toque persistente",
    (file) => {
      expect(modalListViolations(read(file), { ...MODAL_LISTS[file], noBackdrop: file in NO_BACKDROP })).toEqual([]);
    },
  );

  it("o KeyboardListSheet encolhe a lista, desconta a área segura, começa sem teclado e não tem rolagem própria", () => {
    expect(keyboardListSheetViolations(read(KEYBOARD_LIST_SHEET))).toEqual([]);
  });

  it("o carrossel volta a rolagem ao topo ao trocar de slide e mantém o \"Pular\" inteiro no cabeçalho (R7, R8)", () => {
    expect(carouselViolations(read("src/components/tour/WelcomeCarousel.tsx"))).toEqual([]);
  });

  it.each(Object.keys(MODAL_FIELDS_OUTSIDE))("%s não tem campo dentro de <Modal>", (file) => {
    expect(fieldsInsideModal(read(file))).toBe(0);
  });
});

describe("chat da IA (Story 13.5)", () => {
  const files: string[] = [];
  for (const dir of DIRS) collect(path.join(ROOT, dir), files);

  it("só o app/_layout.tsx importa ou renderiza KeyboardProvider, e renderiza exatamente um", () => {
    const hits = files
      .filter((f) => rel(f) !== ROOT_LAYOUT)
      .flatMap((f) => keyboardProviderUses(fs.readFileSync(f, "utf8")).map((why) => `${rel(f)}: ${why}`));
    expect(hits).toEqual([]);
    expect(keyboardProviderUses(read(ROOT_LAYOUT))).toContain("import nomeado");
    expect(countKeyboardProviders(read(ROOT_LAYOUT))).toBe(1);
  });

  it.each(Object.keys(CHAT_SCREENS))(
    "%s: sem provider próprio nem segunda compensação; o GiftedChat ajustado por props dentro do invólucro",
    (file) => {
      expect(chatScreenViolations(read(file))).toEqual([]);
    },
  );

  it("o chatKeyboardLayout.ts nunca desliga o provider interno", () => {
    expect(chatLayoutModuleViolations(read(CHAT_LAYOUT))).toEqual([]);
  });

  it("a rota ai-chat começa no topo da janela (sem cabeçalho nativo e sem presentation:, D-2 a)", () => {
    expect(chatRouteViolations(read(ROOT_LAYOUT))).toEqual([]);
  });

  it.each(CHAT_COMPONENTS)("%s não tem compensação própria de teclado", (file) => {
    expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
    expect(chatComponentViolations(read(file))).toEqual([]);
  });

  it(`sentinela de versão do GiftedChat e do keyboard-controller (${CHAT_SENTINEL_MESSAGE})`, () => {
    const sources = Object.fromEntries(
      Object.entries(CHAT_SENTINEL_FILES).map(([k, f]) => {
        const full = path.join(ROOT, f);
        return [k, fs.existsSync(full) ? fs.readFileSync(full, "utf8") : ""];
      }),
    ) as unknown as ChatSentinelSources;
    expect(chatSentinelViolations(sources)).toEqual([]);
  });

  it("toda tela de CHAT_SCREENS existe e está nas exceções da descoberta", () => {
    for (const file of Object.keys(CHAT_SCREENS)) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(DISCOVERY_EXCEPTIONS[file], file).toMatch(/CHAT_SCREENS/);
    }
  });
});

describe("auto-teste dos detectores", () => {
  describe("chat da IA (Story 13.5)", () => {
    const KC_IMPORT = `import { KeyboardProvider } from "react-native-keyboard-controller";`;

    it.each([
      [KC_IMPORT, "import nomeado"],
      [`import { KeyboardProvider as KP } from "react-native-keyboard-controller";\n<KP />`, "import nomeado"],
      [`import * as KC from "react-native-keyboard-controller";\nreturn <KC.KeyboardProvider>{x}</KC.KeyboardProvider>;`, "import * as"],
      [`import * as KC from "react-native-keyboard-controller";\nconst P = KC.KeyboardProvider;`, "import * as"],
      [`const { KeyboardProvider } = require("react-native-keyboard-controller");`, "require"],
      [`const P = require("react-native-keyboard-controller").KeyboardProvider;`, "require"],
      [`const { KeyboardProvider } = await import("react-native-keyboard-controller");`, "import()"],
      [`export { KeyboardProvider } from "react-native-keyboard-controller";`, "reexportação"],
      [`return <KeyboardProvider>{x}</KeyboardProvider>;`, "<KeyboardProvider"],
    ])("acusa KeyboardProvider fora do _layout: %s", (code, why) => {
      expect(keyboardProviderUses(code)).toContain(why);
    });

    it.each([
      `import { KeyboardStickyView } from "react-native-keyboard-controller";`,
      `import type { KeyboardProviderProps } from "react-native-keyboard-controller";`,
      `import type { KeyboardProvider } from "react-native-keyboard-controller";`,
      `// <KeyboardProvider> fica só na raiz\nimport { View } from "react-native";`,
      `const msg = "o KeyboardProvider da raiz";`,
      `import * as KC from "react-native-keyboard-controller";\nKC.KeyboardController.dismiss();`,
      `const P = require("react-native-keyboard-controller").KeyboardStickyView;`,
    ])("não acusa: %s", (code) => {
      expect(keyboardProviderUses(code)).toEqual([]);
    });

    it("conta os <KeyboardProvider renderizados", () => {
      expect(countKeyboardProviders(`return <KeyboardProvider a>{x}</KeyboardProvider>;`)).toBe(1);
      expect(countKeyboardProviders(`return <KeyboardProvider><KC.KeyboardProvider /></KeyboardProvider>;`)).toBe(2);
      expect(countKeyboardProviders(`// <KeyboardProvider>\nreturn <View />;`)).toBe(0);
    });

    const imp = [
      `import { View, StyleSheet } from "react-native";`,
      `import { GiftedChat } from "react-native-gifted-chat";`,
      `import { CHAT_KEYBOARD_PROVIDER_PROPS, chatKeyboardVerticalOffset } from "@/src/components/ai/chatKeyboardLayout";`,
      ``,
    ].join("\n");
    const memo = `const kavProps = useMemo(() => ({ keyboardVerticalOffset: chatKeyboardVerticalOffset(chatTop) }), [chatTop]);\n`;
    const chat = [
      `${imp}${memo}return (`,
      `  <SafeAreaView>`,
      `    <View style={styles.header}><Text>DOMUS IA</Text></View>`,
      `    <View style={styles.chatFrame} onLayout={onChatFrameLayout}>`,
      `      <GiftedChat`,
      `        messages={m}`,
      `        renderAvatar={() => <View style={styles.avatar} />}`,
      `        keyboardAvoidingViewProps={kavProps}`,
      `        keyboardProviderProps={CHAT_KEYBOARD_PROVIDER_PROPS}`,
      `      />`,
      `    </View>`,
      `    <SelectionModal visible={v} />`,
      `  </SafeAreaView>`,
      `);`,
      `const styles = StyleSheet.create({ safe: { flex: 1 }, chatFrame: { flex: 1, overflow: "hidden" } });`,
    ].join("\n");

    it("aceita o padrão (offset memoizado ou direto no prop)", () => {
      expect(chatScreenViolations(chat)).toEqual([]);
      const inline = chat
        .replace(memo, "")
        .replace("keyboardAvoidingViewProps={kavProps}", "keyboardAvoidingViewProps={{ keyboardVerticalOffset: chatKeyboardVerticalOffset(chatTop) }}");
      expect(chatScreenViolations(inline)).toEqual([]);
    });

    it("acusa GiftedChat sem keyboardAvoidingViewProps", () => {
      expect(chatScreenViolations(chat.replace("        keyboardAvoidingViewProps={kavProps}\n", ""))).toContain(
        "GiftedChat sem keyboardAvoidingViewProps={…}",
      );
    });

    it("acusa offset literal ou insets.top em vez da função, e enabled/behavior no KAV", () => {
      const literal = chat.replace("chatKeyboardVerticalOffset(chatTop) }", "0 }");
      expect(chatScreenViolations(literal)).toContain("keyboardVerticalOffset sem chatKeyboardVerticalOffset(…)");
      const insets = chat.replace("chatKeyboardVerticalOffset(chatTop) }", "insets.top }");
      expect(chatScreenViolations(insets)).toContain("keyboardVerticalOffset sem chatKeyboardVerticalOffset(…)");
      const enabled = chat.replace("({ keyboardVerticalOffset", "({ enabled: false, keyboardVerticalOffset");
      expect(chatScreenViolations(enabled)).toContain("keyboardAvoidingViewProps com enabled:");
      const behavior = chat.replace("({ keyboardVerticalOffset", `({ behavior: "padding", keyboardVerticalOffset`);
      expect(chatScreenViolations(behavior)).toContain("keyboardAvoidingViewProps com behavior:");
    });

    it("acusa keyboardProviderProps fora do CHAT_KEYBOARD_PROVIDER_PROPS (inclusive enabled: false)", () => {
      const off = chat.replace("keyboardProviderProps={CHAT_KEYBOARD_PROVIDER_PROPS}", "keyboardProviderProps={{ enabled: false }}");
      expect(chatScreenViolations(off)).toContain("keyboardProviderProps não é CHAT_KEYBOARD_PROVIDER_PROPS");
      const none = chat.replace("        keyboardProviderProps={CHAT_KEYBOARD_PROVIDER_PROPS}\n", "");
      expect(chatScreenViolations(none)).toContain("keyboardProviderProps não é CHAT_KEYBOARD_PROVIDER_PROPS");
      expect(chatLayoutModuleViolations(`export const P = { statusBarTranslucent: true, enabled: false };`)).toEqual(["enabled: false"]);
      expect(chatLayoutModuleViolations(`export const P = { statusBarTranslucent: true, preload: false };`)).toEqual([]);
    });

    it("acusa o import das contas ausente", () => {
      const noImport = chat.replace(/import \{ CHAT_KEYBOARD_PROVIDER_PROPS[^\n]*\n/, "");
      expect(chatScreenViolations(noImport)).toEqual(
        expect.arrayContaining([
          "não importa CHAT_KEYBOARD_PROVIDER_PROPS de @/src/components/ai/chatKeyboardLayout",
          "não importa chatKeyboardVerticalOffset de @/src/components/ai/chatKeyboardLayout",
        ]),
      );
    });

    it("acusa KeyboardAvoidingView do RN, provider próprio e listeners de teclado no chat", () => {
      const rnKav = chat
        .replace(`import { View, StyleSheet } from "react-native";`, `import { View, StyleSheet, KeyboardAvoidingView } from "react-native";`)
        .replace("      <GiftedChat", "      <KeyboardAvoidingView behavior=\"padding\">\n      <GiftedChat")
        .replace("      />\n    </View>", "      />\n      </KeyboardAvoidingView>\n    </View>");
      expect(chatScreenViolations(rnKav)).toContain("<KeyboardAvoidingView");
      expect(chatScreenViolations(`${KC_IMPORT}\n${chat}`)).toContain("importa react-native-keyboard-controller");
      expect(chatScreenViolations(`${chat}\nKeyboard.addListener("keyboardDidShow", f);`)).toContain("Keyboard.addListener");
      expect(chatScreenViolations(`${chat}\nuseKeyboardHandler({ onMove });`)).toContain("useKeyboardHandler");
      expect(chatScreenViolations(`${chat}\nconst { height } = useKeyboardAnimation();`)).toContain("useKeyboardAnimation");
      expect(chatScreenViolations(`${chat}\nKeyboard.dismiss();`)).toEqual([]);
    });

    it("resolve alias do GiftedChat (GiftedChat as Chat) e conta os usos", () => {
      const aliased = chat
        .replace("import { GiftedChat } from", "import { GiftedChat as Chat } from")
        .replace("<GiftedChat", "<Chat");
      expect(chatScreenViolations(aliased)).toEqual([]);
      const bare = aliased.replace("keyboardAvoidingViewProps={kavProps}", "");
      expect(chatScreenViolations(bare)).toContain("GiftedChat sem keyboardAvoidingViewProps={…}");
      const two = chat.replace("    <SelectionModal", "    <GiftedChat messages={n} />\n    <SelectionModal");
      expect(chatScreenViolations(two)).toContain("2 × <GiftedChat (esperado 1)");
      expect(chatScreenViolations(chat.replace(/<GiftedChat[\s\S]*?\/>\n/, ""))).toContain("0 × <GiftedChat (esperado 1)");
    });

    it("acusa o GiftedChat fora do invólucro e o chatFrame sem recorte ou sem flex", () => {
      const noHidden = chat.replace(`chatFrame: { flex: 1, overflow: "hidden" }`, "chatFrame: { flex: 1 }");
      expect(chatScreenViolations(noHidden)).toContain('chatFrame sem overflow: "hidden"');
      const noFlex = chat.replace(`chatFrame: { flex: 1, overflow: "hidden" }`, `chatFrame: { overflow: "hidden" }`);
      expect(chatScreenViolations(noFlex)).toContain("chatFrame sem flex: 1");
      const noLayout = chat.replace(" onLayout={onChatFrameLayout}", "");
      expect(chatScreenViolations(noLayout)).toContain("GiftedChat fora de <View style={styles.chatFrame} onLayout=…>");
      const outside = chat
        .replace("    <View style={styles.chatFrame} onLayout={onChatFrameLayout}>\n", "    <View style={styles.chatFrame} onLayout={onChatFrameLayout} />\n")
        .replace("      />\n    </View>", "      />");
      expect(chatScreenViolations(outside)).toContain("GiftedChat fora de <View style={styles.chatFrame} onLayout=…>");
      // genérico useRef<View> não abre elemento
      expect(chatScreenViolations(`const r = useRef<View>(null);\n${chat}`)).toEqual([]);
    });

    it("rota ai-chat: exige headerShown: false e barra presentation:", () => {
      const layout = `<Stack screenOptions={{ headerBackTitle: "Voltar" }}>\n  <Stack.Screen name="ai-chat" options={{ headerShown: false }} />\n  <Stack.Screen name="x" options={{ presentation: "modal" }} />\n</Stack>`;
      expect(chatRouteViolations(layout)).toEqual([]);
      expect(chatRouteViolations(layout.replace("{{ headerShown: false }}", `{{ headerShown: false, presentation: "modal" }}`))).toContain(
        "ai-chat com presentation:",
      );
      expect(chatRouteViolations(layout.replace("headerShown: false", "headerShown: true"))).toContain("ai-chat sem headerShown: false");
      expect(chatRouteViolations(layout.replace(`name="ai-chat"`, `name="chat"`))).toEqual([`0 × Stack.Screen name="ai-chat" (esperado 1)`]);
      expect(chatRouteViolations(layout.replace(`headerBackTitle: "Voltar"`, `presentation: "modal"`))).toContain(
        "Stack com presentation: em screenOptions",
      );
    });

    it("componentes do chat: acusa KeyboardStickyView e o keyboard-controller", () => {
      const bar = `import { View, TextInput } from "react-native";\nreturn <View><TextInput /></View>;`;
      expect(chatComponentViolations(bar)).toEqual([]);
      const sticky = `import { KeyboardStickyView } from "react-native-keyboard-controller";\nreturn <KeyboardStickyView><TextInput /></KeyboardStickyView>;`;
      expect(chatComponentViolations(sticky)).toEqual(expect.arrayContaining(["importa react-native-keyboard-controller", "<KeyboardStickyView"]));
      expect(chatComponentViolations(`import { KeyboardAvoidingView } from "react-native";`)).toContain("import KeyboardAvoidingView");
    });

    describe("sentinela de versão", () => {
      const ok: ChatSentinelSources = {
        giftedPkg: `{ "name": "react-native-gifted-chat", "version": "3.3.2" }`,
        kcPkg: `{ "name": "react-native-keyboard-controller", "version": "1.18.5" }`,
        giftedIndex: `<KeyboardAvoidingView behavior='translate-with-padding' keyboardVerticalOffset={insets.top} {...props.keyboardAvoidingViewProps}>\n<KeyboardProvider statusBarTranslucent navigationBarTranslucent {...keyboardProviderProps}>`,
        kav: `const keyboardY =\n  screenHeight - keyboard.heightWhenOpened.value - keyboardVerticalOffset;\nreturn Math.max(frame.value.y + frame.value.height - keyboardY, 0);`,
      };

      it("aceita as versões e o código que a conta pressupõe", () => {
        expect(chatSentinelViolations(ok)).toEqual([]);
      });

      it.each([
        ["giftedPkg", `"3.3.2"`, `"3.4.0"`],
        ["kcPkg", `"1.18.5"`, `"1.19.0"`],
        ["giftedPkg", `"version": "3.3.2"`, `"v": 1`],
        ["giftedIndex", ` {...props.keyboardAvoidingViewProps}>`, `>`],
        ["giftedIndex", `keyboardVerticalOffset={insets.top} {...props.keyboardAvoidingViewProps}`, `{...props.keyboardAvoidingViewProps} keyboardVerticalOffset={insets.top}`],
        ["giftedIndex", `navigationBarTranslucent {...keyboardProviderProps}`, `{...keyboardProviderProps} navigationBarTranslucent`],
        ["kav", `frame.value.y + frame.value.height - keyboardY`, `frame.value.height - keyboardY`],
        ["kav", `- keyboardVerticalOffset;`, `;`],
      ] as [keyof ChatSentinelSources, string, string][])("acusa %s: %s → %s", (key, from, to) => {
        const hits = chatSentinelViolations({ ...ok, [key]: ok[key].replace(from, to) });
        expect(hits.length).toBeGreaterThan(0);
        for (const hit of hits) expect(hit).toContain(CHAT_SENTINEL_MESSAGE);
      });

      it("acusa arquivo ausente (node_modules sem a biblioteca)", () => {
        expect(chatSentinelViolations({ ...ok, kav: "" })).not.toEqual([]);
        expect(chatSentinelViolations({ ...ok, giftedPkg: "" })).not.toEqual([]);
      });
    });
  });

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
    const imp = `import { KeyboardSheet, useSheetBackdropPress } from "@/src/components/shared/KeyboardSheet";\n`;
    const backdrop = `const onBackdrop = useSheetBackdropPress(close);\n`;
    const ok = `${imp}${backdrop}return (\n  <Modal visible transparent>\n    <Pressable onPress={onBackdrop} />\n    <View>\n      <KeyboardSheet\n        header={<Text>Título</Text>}\n        footer={<TButton variant="primary" onPress={() => save()}>Salvar</TButton>}\n      >\n        <TInput />\n      </KeyboardSheet>\n    </View>\n  </Modal>\n);`;
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
      expect(modalFormViolations(none)).toContain("fundo sem useSheetBackdropPress");
      expect(modalFormViolations(ok.replace(imp, ""))).toContain(
        "não importa KeyboardSheet de @/src/components/shared/KeyboardSheet",
      );
    });

    it("acusa KeyboardSheet sem footer", () => {
      const code = ok.replace('footer={<TButton variant="primary" onPress={() => save()}>Salvar</TButton>}', "");
      expect(modalFormViolations(code)).toContain("KeyboardSheet sem footer=");
      // footer só dentro de um filho não conta
      const nested = ok.replace("footer={", "header2={<X footer={1} />} data-x={");
      expect(modalFormViolations(nested)).toContain("KeyboardSheet sem footer=");
    });

    it("acusa footer nulo, vazio, sem botão principal ou com Cancelar", () => {
      const primary = '<TButton variant="primary" onPress={() => save()}>Salvar</TButton>';
      const withFooter = (footer: string) => ok.replace(`footer={${primary}}`, `footer={${footer}}`);
      expect(modalFormViolations(withFooter("null"))).toContain("footer não é um elemento JSX");
      expect(modalFormViolations(withFooter("undefined"))).toContain("footer não é um elemento JSX");
      expect(modalFormViolations(withFooter("<></>"))).toContain("footer não é um elemento JSX");
      expect(modalFormViolations(withFooter("ok ? <B /> : null"))).toContain("footer não é um elemento JSX");
      expect(modalFormViolations(ok.replace(`footer={${primary}}`, 'footer="x"'))).toContain("footer sem expressão {…}");
      expect(modalFormViolations(withFooter('<TButton variant="outline">Cancelar</TButton>'))).toEqual(
        expect.arrayContaining(["footer sem botão principal", "Cancelar no footer"]),
      );
      const both = `(\n  <View>\n    <TButton variant="outline">Cancelar</TButton>\n    ${primary}\n  </View>\n)`;
      expect(modalFormViolations(withFooter(both))).toEqual(["Cancelar no footer"]);
      expect(modalFormViolations(withFooter(`(\n  ${primary}\n)`))).toEqual([]);
      expect(modalFormViolations(ok.replace("footer={", "footerVisible={false} footer={"))).toContain("footerVisible={false}");
      expect(modalFormViolations(ok.replace("footer={", "footerVisible={isValid} footer={"))).toEqual([]);
    });

    it("acusa fundo que não passa pelo useSheetBackdropPress", () => {
      expect(modalFormViolations(ok.replace(backdrop, ""))).toContain("fundo sem useSheetBackdropPress");
      expect(modalFormViolations(ok.replace("useSheetBackdropPress } from", "x } from"))).toContain(
        "fundo sem useSheetBackdropPress",
      );
      expect(modalFormViolations(ok.replace("onPress={onBackdrop}", "onPress={close}"))).toContain(
        "onBackdrop não está em nenhum onPress",
      );
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
      expect(isSelfManagedModal("app/sync.tsx")).toBe(true); // MODAL_FIELDS_OUTSIDE
    });

    describe("keyboardSheetViolations", () => {
      const sheet = [
        `const show = KeyboardEvents.addListener("keyboardDidShow", f);`,
        `const hide = KeyboardEvents.addListener("keyboardDidHide", g);`,
        `input.measureLayout(content, ok, fail);`,
        `const rootPadding = sheetRootPadding(insets.top, placement, insets.bottom);`,
        `return (`,
        `  <KeyboardSafeView liftDiscount={sheetLiftDiscount(pb, placement, insets.bottom)}>`,
        `    <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">{c}</ScrollView>`,
        `  </KeyboardSafeView>`,
        `);`,
        `const s = StyleSheet.create({ sheet: { flexShrink: 1, minHeight: 0 }, scroll: { flexShrink: 1 } });`,
      ].join("\n");

      it("aceita o padrão", () => {
        expect(keyboardSheetViolations(sheet)).toEqual([]);
      });

      it.each([
        ['keyboardShouldPersistTaps="handled"', "", 'ScrollView sem keyboardShouldPersistTaps="handled"'],
        ['keyboardShouldPersistTaps="handled"', 'keyboardShouldPersistTaps="never"', 'ScrollView sem keyboardShouldPersistTaps="handled"'],
        ["sheet: { flexShrink: 1, minHeight: 0 }", "sheet: { minHeight: 0 }", "sheet sem flexShrink: 1"],
        ["scroll: { flexShrink: 1 }", "scroll: { flexGrow: 1 }", "scroll sem flexShrink: 1"],
        ["liftDiscount={sheetLiftDiscount(pb, placement, insets.bottom)}", "liftDiscount={pb - 12}", "liftDiscount sem sheetLiftDiscount(…)"],
        ["liftDiscount={sheetLiftDiscount(pb, placement, insets.bottom)}", "", "liftDiscount sem sheetLiftDiscount(…)"],
        ["sheetLiftDiscount(pb, placement, insets.bottom)", "sheetLiftDiscount(pb, placement)", "liftDiscount sem insets.bottom"],
        ["sheetRootPadding(insets.top, placement, insets.bottom)", "sheetRootPadding(insets.top, placement)", "sheetRootPadding sem insets.bottom"],
        ['"keyboardDidShow", f', '"keyboardWillShow", f', "sem keyboardDidShow"],
        ['"keyboardDidHide", g', '"keyboardWillHide", g', "sem keyboardDidHide"],
        ["input.measureLayout(content, ok, fail);", "input.measureInWindow(ok);", "campo sem measureLayout"],
        ["{c}</ScrollView>", "{c}<ScrollView /></ScrollView>", "2 × <ScrollView (esperado 1)"],
      ])("acusa %s → %s", (from, to, hit) => {
        expect(keyboardSheetViolations(sheet.replace(from, to))).toContain(hit);
      });

      it("acusa estado global do teclado, scrollY em cache e segunda compensação", () => {
        expect(keyboardSheetViolations(`${sheet}\nconst h = useKeyboardState((st) => st.height);`)).toContain(
          "lê o estado global do teclado",
        );
        expect(keyboardSheetViolations(`${sheet}\nconst h = KeyboardController.state().height;`)).toContain(
          "lê o estado global do teclado",
        );
        expect(keyboardSheetViolations(sheet.replace('="handled"', '="handled" onScroll={f}'))).toContain("scrollY em cache");
        expect(keyboardSheetViolations(`${sheet}\nconst scrollY = useRef(0);`)).toContain("scrollY em cache");
        expect(keyboardSheetViolations(sheet.replace("{c}", "<KeyboardStickyView />"))).toContain("<KeyboardStickyView");
      });
    });

    it("jsxOpeningTags lê só o nível de cima da tag", () => {
      const [tag] = jsxOpeningTags(`<KeyboardSheet a="x>y" footer={<B onPress={() => go()} />} h={a > b} n>{c}</KeyboardSheet>`, "KeyboardSheet");
      expect(tag).toBe(` a="x>y" footer={} h={} n`);
      expect(jsxOpeningTags(`<ScrollView horizontal={true}/>`, "ScrollView")).toEqual([` horizontal={true}/`]);
      const [raw] = scanJsxOpeningTags(`<KeyboardSheet header={<A b={1} />} footer={<B onPress={() => go()} />} n>`, "KeyboardSheet");
      expect(raw.exprs).toEqual({ header: "<A b={1} />", footer: "<B onPress={() => go()} />" });
    });
  });

  describe("buscas e diálogos em modal (Story 13.4)", () => {
    const listImp = `import { KeyboardListSheet } from "@/src/components/shared/KeyboardListSheet";\nimport { useSheetBackdropPress } from "@/src/components/shared/KeyboardSheet";\n`;
    const listBackdrop = `const onBackdrop = useSheetBackdropPress(close);\n`;
    const search = `const searchBar = (\n  <View>\n    <TextInput value={q} onChangeText={setQ} />\n  </View>\n);\n`;
    const flash = `<FlashList data={d} renderItem={r} keyboardShouldPersistTaps="handled" />`;
    const okList = `${listImp}${listBackdrop}${search}return (\n  <Modal visible transparent>\n    <Pressable onPress={onBackdrop} />\n    <KeyboardListSheet\n      basePaddingBottom={20}\n      title={<Text>Título</Text>}\n      search={searchBar}\n      list={${flash}}\n    />\n  </Modal>\n);`;
    const one = { scrolls: 1 };

    it("aceita o padrão (busca declarada à parte ou direto no search)", () => {
      expect(modalListViolations(okList, one)).toEqual([]);
      expect(modalListViolations(okList.replace("search={searchBar}", "search={<TInput value={q} />}"), one)).toEqual([]);
    });

    it("acusa KeyboardListSheet fora de Modal, ausente ou sem import", () => {
      const outside = okList.replace("<Modal visible transparent>", "<View>").replace("</Modal>", "</View>");
      expect(modalListViolations(outside, one)).toContain("KeyboardListSheet fora de Modal");
      const none = `${listImp}${listBackdrop}return <Modal visible><Pressable onPress={onBackdrop} /><View>${flash}<TextInput /></View></Modal>;`;
      expect(modalListViolations(none, one)).toContain("0 × <KeyboardListSheet (esperado 1)");
      expect(modalListViolations(okList.replace(/import \{ KeyboardListSheet \}[^\n]*\n/, ""), one)).toContain(
        "não importa KeyboardListSheet de @/src/components/shared/KeyboardListSheet",
      );
    });

    it("acusa search sem campo, campo no title e a API antiga de cabeçalhos (R1)", () => {
      expect(modalListViolations(okList.replace("search={searchBar}", "search={<Text />}"), one)).toContain("search sem campo");
      expect(modalListViolations(okList.replace("search={searchBar}", ""), one)).toContain("KeyboardListSheet sem search={…}");
      expect(modalListViolations(okList.replace("title={<Text>Título</Text>}", ""), one)).toContain("KeyboardListSheet sem title={…}");
      const inTitle = okList.replace("title={<Text>Título</Text>}", "title={<>{searchBar}</>}").replace("search={searchBar}", "search={<Text />}");
      expect(modalListViolations(inTitle, one)).toEqual(expect.arrayContaining(["campo no title", "search sem campo"]));
      const old = okList.replace("search={searchBar}", "search={searchBar} header={x} compactHeader={searchBar}");
      expect(modalListViolations(old, one)).toEqual(expect.arrayContaining(["header= (use title e search)", "compactHeader= (use title e search)"]));
    });

    it("exige o campo como tag JSX: onChangeText sozinho não conta (R2)", () => {
      const fake = okList.replace("search={searchBar}", "search={<Busca onChangeText={setQ} />}");
      expect(modalListViolations(fake, one)).toContain("search sem campo");
    });

    it("resolve definições locais em profundidade limitada (R2)", () => {
      // dois níveis de const
      const deep = okList.replace(search, `const field = <TextInput value={q} />;\nconst searchBar = (\n  <View>{field}</View>\n);\n`);
      expect(modalListViolations(deep, one)).toEqual([]);
      // componente local
      const comp = okList.replace(search, `function SearchField() {\n  return <TInput value={q} />;\n}\n`).replace("search={searchBar}", "search={<SearchField />}");
      expect(modalListViolations(comp, one)).toEqual([]);
      // campo escondido além da profundidade máxima não conta
      const chain = `const l0 = <TextInput />;\nconst l1 = (<View>{l0}</View>);\nconst l2 = (<View>{l1}</View>);\nconst l3 = (<View>{l2}</View>);\n`;
      expect(modalListViolations(okList.replace(search, chain).replace("search={searchBar}", "search={l3}"), one)).toContain("search sem campo");
    });

    it("não confunde o nome com chave de objeto, texto ou nome parecido (R2)", () => {
      const lookalike = okList.replace("search={searchBar}", "search={searchBarLabel}");
      expect(modalListViolations(lookalike, one)).toContain("search sem campo");
      const key = okList.replace("search={searchBar}", "search={<Busca style={{ searchBar: 1 }} />}");
      expect(modalListViolations(key, one)).toContain("search sem campo");
      const text = okList.replace("search={searchBar}", `search={<Text>{"searchBar"}</Text>}`);
      expect(modalListViolations(text, one)).toContain("search sem campo");
      // ternário continua sendo uso do valor
      const ternary = okList.replace("search={searchBar}", "search={tab ? searchBar : null}");
      expect(modalListViolations(ternary, one)).toEqual([]);
    });

    it("exige measureKey= quando o título muda de altura (R5)", () => {
      expect(modalListViolations(okList, { ...one, measureKey: true })).toContain("sem measureKey= (título muda de altura)");
      expect(modalListViolations(okList.replace("basePaddingBottom={20}", "basePaddingBottom={20}\n      measureKey={tab}"), { ...one, measureKey: true })).toEqual([]);
    });

    it("reconhece alias de import do Modal (R2)", () => {
      const aliased = okList
        .replace(listImp, `${listImp}import { Modal as RNModal } from "react-native";\n`)
        .replace("<Modal visible transparent>", "<RNModal visible transparent>")
        .replace("</Modal>", "</RNModal>");
      expect(modalListViolations(aliased, one)).toEqual([]);
      const probe = `import { Modal as Dialog, TextInput } from "react-native";\nreturn <Dialog visible><TextInput /></Dialog>;`;
      expect(hasModalWithField(probe)).toBe(true);
      expect(fieldsInsideModal(probe)).toBe(1);
      expect(modalSegments(probe)).toHaveLength(1);
    });

    it("acusa FlashList sem keyboardShouldPersistTaps=\"handled\"", () => {
      expect(modalListViolations(okList.replace(' keyboardShouldPersistTaps="handled"', ""), one)).toContain(
        'FlashList sem keyboardShouldPersistTaps="handled"',
      );
      expect(modalListViolations(okList.replace('"handled"', '"never"'), one)).toContain(
        'FlashList sem keyboardShouldPersistTaps="handled"',
      );
    });

    it("acusa FlashList fora do list= e contagem errada", () => {
      const moved = okList
        .replace(`list={${flash}}`, "list={null}")
        .replace("    />\n  </Modal>", `    />\n    ${flash}\n  </Modal>`);
      expect(modalListViolations(moved, one)).toContain("1 × rolagem fora do list=");
      const two = okList.replace(`list={${flash}}`, `list={tab ? ${flash} : <ScrollView keyboardShouldPersistTaps="handled" />}`);
      expect(modalListViolations(two, one)).toContain("2 × rolagem no modal (esperado 1)");
      expect(modalListViolations(two, { scrolls: 2 })).toEqual([]);
    });

    it("acusa KeyboardAvoidingView dentro do modal de busca", () => {
      const code = okList.replace("<Pressable onPress={onBackdrop} />", "<KeyboardAvoidingView><Pressable onPress={onBackdrop} /></KeyboardAvoidingView>");
      expect(modalListViolations(code, one)).toContain("<KeyboardAvoidingView");
      expect(modalListViolations(`import { KeyboardAvoidingView } from "react-native";\n${okList}`, one)).toContain(
        "import KeyboardAvoidingView",
      );
    });

    it("acusa fundo sem useSheetBackdropPress, salvo NO_BACKDROP", () => {
      const raw = okList.replace("onPress={onBackdrop}", "onPress={close}");
      expect(modalListViolations(raw, one)).toContain("onBackdrop não está em nenhum onPress");
      expect(modalListViolations(okList.replace(listBackdrop, ""), one)).toContain("fundo sem useSheetBackdropPress");
      expect(modalListViolations(okList.replace(listBackdrop, ""), { ...one, noBackdrop: true })).toEqual([]);
    });

    it("vale só no trecho do <Modal> (busca inline fora dele não conta)", () => {
      const inlineOutside = `${okList}\nfunction Inline() {\n  return (\n    <View>\n      <ScrollView>{x}</ScrollView>\n      <TextInput />\n    </View>\n  );\n}`;
      expect(modalListViolations(inlineOutside, one)).toEqual([]);
    });

    describe("keyboardListSheetViolations", () => {
      const listSheet = [
        `const keyboardHeight = useSheetKeyboardHeight();`,
        `useEffect(() => {\n  setTitleHeight(0);\n}, [measureKey]);`,
        `return (`,
        `  <KeyboardSafeView liftDiscount={sheetLiftDiscount(pb)}>`,
        `    <Reanimated.View style={s.sheet}>{listSheetSlots(collapsed).map((k) => (k ? slots[k] : null))}<View style={s.list}>{list}</View></Reanimated.View>`,
        `  </KeyboardSafeView>`,
        `);`,
        `const s = StyleSheet.create({ sheet: { flexShrink: 1, minHeight: 0 }, list: { flexShrink: 1, minHeight: 0 } });`,
      ].join("\n");

      it("aceita o padrão (com o hook ou com os dois eventos)", () => {
        expect(keyboardListSheetViolations(listSheet)).toEqual([]);
        const events = listSheet.replace(
          "const keyboardHeight = useSheetKeyboardHeight();",
          `KeyboardEvents.addListener("keyboardDidShow", f);\nKeyboardEvents.addListener("keyboardDidHide", g);`,
        );
        expect(keyboardListSheetViolations(events)).toEqual([]);
      });

      it.each([
        ["sheet: { flexShrink: 1, minHeight: 0 }", "sheet: { minHeight: 0 }", "sheet sem flexShrink: 1"],
        ["list: { flexShrink: 1, minHeight: 0 }", "list: { flexGrow: 1 }", "list sem flexShrink: 1"],
        ["liftDiscount={sheetLiftDiscount(pb)}", "liftDiscount={pb - 12}", "liftDiscount sem sheetLiftDiscount(…)"],
        ["{list}</View>", "{list}<FlashList data={d} /></View>", "<FlashList próprio"],
        ["{list}</View>", "{list}<ScrollView /></View>", "<ScrollView próprio"],
        ["{list}</View>", "{list}<KeyboardStickyView /></View>", "<KeyboardStickyView"],
        ["const keyboardHeight = useSheetKeyboardHeight();", "", "sem useSheetKeyboardHeight nem os eventos do teclado"],
        ["</KeyboardSafeView>", "</KeyboardSafeView><KeyboardSafeView />", "2 × <KeyboardSafeView (esperado 1)"],
        ["{listSheetSlots(collapsed).map((k) => (k ? slots[k] : null))}", "{collapsed ? compactHeader : header}", "filhos fora do listSheetSlots(…)"],
        ["{listSheetSlots(collapsed).map((k) => (k ? slots[k] : null))}", "{collapsed ? compactHeader : header}", "compactHeader (troca de cabeçalho remonta o campo)"],
        ["}, [measureKey]);", "}, []);", "measureKey não refaz a medida"],
      ])("acusa %s → %s", (from, to, hit) => {
        expect(keyboardListSheetViolations(listSheet.replace(from, to))).toContain(hit);
      });

      it("acusa estado global do teclado", () => {
        expect(keyboardListSheetViolations(`${listSheet}\nconst h = useKeyboardState((st) => st.height);`)).toContain(
          "lê o estado global do teclado",
        );
      });
    });

    describe("carouselViolations (R7, R8)", () => {
      const carousel = [
        `const goTo = (idx: number) => {`,
        `  pager.current?.scrollTo({ x: idx * W, animated: true });`,
        `  sheetScrollRef.current?.scrollTo({ y: 0, animated: false });`,
        `  setSlide(idx);`,
        `};`,
        `return (`,
        `  <KeyboardSheet placement="fill" scrollRef={sheetScrollRef} header={<View style={{ paddingTop: p, minHeight: skipHeaderMinHeight(SKIP_TOP, fontScale) }} />} footer={<View />}>`,
        `    {slides}`,
        `  </KeyboardSheet>`,
        `);`,
      ].join("\n");

      it("aceita o padrão", () => {
        expect(carouselViolations(carousel)).toEqual([]);
      });

      it.each([
        [" scrollRef={sheetScrollRef}", "", "KeyboardSheet sem scrollRef="],
        ["  sheetScrollRef.current?.scrollTo({ y: 0, animated: false });\n", "", "goTo não volta a rolagem vertical ao topo"],
        ["sheetScrollRef.current?.scrollTo({ y: 0,", "other.current?.scrollTo({ y: 0,", "goTo não volta a rolagem vertical ao topo"],
        [", minHeight: skipHeaderMinHeight(SKIP_TOP, fontScale)", "", "cabeçalho sem minHeight: skipHeaderMinHeight(…)"],
      ])("acusa %s → %s", (from, to, hit) => {
        expect(carouselViolations(carousel.replace(from, to))).toContain(hit);
      });
    });

    describe("formulário com placement (D-2, D-3)", () => {
      const imp = `import { KeyboardSheet } from "@/src/components/shared/KeyboardSheet";\nimport { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";\n`;
      const dialogFooter = `<View>\n  <TButton variant="outline">Cancelar</TButton>\n  <TButton variant="danger" onPress={reset}>Resetar</TButton>\n</View>`;
      const dialog = `${imp}return (\n  <>\n    <KeyboardAwareScrollViewCompat>{tela}</KeyboardAwareScrollViewCompat>\n    <Modal visible transparent>\n      <View style={s.overlay} />\n      <KeyboardSheet placement="center" header={<Text>Resetar</Text>} footer={${dialogFooter}}>\n        <TextInput />\n      </KeyboardSheet>\n    </Modal>\n  </>\n);`;
      const noBackdrop = { noBackdrop: true };

      it("aceita o diálogo com danger e Cancelar lado a lado, e a tela com a rolagem da 13.2 fora do modal", () => {
        expect(modalFormViolations(dialog, undefined, noBackdrop)).toEqual([]);
      });

      it("fora do diálogo, danger não é principal e Cancelar não vai no footer", () => {
        const bottom = dialog.replace(' placement="center"', "");
        expect(modalFormViolations(bottom, undefined, noBackdrop)).toEqual(
          expect.arrayContaining(["footer sem botão principal", "Cancelar no footer"]),
        );
        expect(modalFormViolations(dialog.replace('variant="danger"', 'variant="ghost"'), undefined, noBackdrop)).toContain(
          "footer sem botão principal",
        );
      });

      it("acusa KeyboardAwareScrollViewCompat dentro do <Modal>, não fora dele", () => {
        const inside = dialog.replace("<TextInput />", "<KeyboardAwareScrollViewCompat><TextInput /></KeyboardAwareScrollViewCompat>");
        expect(modalFormViolations(inside, undefined, noBackdrop)).toContain("<KeyboardAwareScrollViewCompat");
        expect(modalFormViolations(dialog, undefined, noBackdrop)).not.toContain("<KeyboardAwareScrollViewCompat");
        expect(modalFormViolations(dialog, undefined, noBackdrop)).not.toContain("import KeyboardAwareScrollViewCompat");
      });

      it("acusa ScrollView vertical dentro do modal, mas não a rolagem da tela fora dele", () => {
        const inside = dialog.replace("<TextInput />", "<ScrollView><TextInput /></ScrollView>");
        expect(modalFormViolations(inside, undefined, noBackdrop)).toContain("ScrollView vertical");
        const screen = dialog.replace("{tela}", "<ScrollView horizontal />");
        expect(modalFormViolations(screen, undefined, noBackdrop)).toEqual([]);
      });

      it("footer próprio (FOOTER_EXCEPTIONS) só precisa ser JSX", () => {
        const custom = dialog.replace(' placement="center"', ' placement="fill"').replace(dialogFooter, "<View><Pressable /></View>");
        expect(modalFormViolations(custom, undefined, noBackdrop)).toContain("footer sem botão principal");
        expect(modalFormViolations(custom, undefined, { ...noBackdrop, footerException: true })).toEqual([]);
        expect(modalFormViolations(custom.replace("<View><Pressable /></View>", "null"), undefined, { footerException: true, noBackdrop: true })).toContain(
          "footer não é um elemento JSX",
        );
      });

      it("sem NO_BACKDROP, o diálogo precisa do useSheetBackdropPress", () => {
        expect(modalFormViolations(dialog)).toContain("fundo sem useSheetBackdropPress");
      });
    });

    it("conta os campos dentro de <Modal> (MODAL_FIELDS_OUTSIDE)", () => {
      const outside = `return (\n  <View>\n    <TInput value={v} />\n    <Modal visible><ScrollView><Text>QR</Text></ScrollView></Modal>\n  </View>\n);`;
      expect(fieldsInsideModal(outside)).toBe(0);
      const inside = outside.replace("<Text>QR</Text>", "<TInput value={code} />");
      expect(fieldsInsideModal(inside)).toBe(1);
    });

    it("detecta <Modal + campo fora das três listas", () => {
      const probe = `return <Modal visible><TextInput value={v} /></Modal>;`;
      expect(hasModalWithField(probe)).toBe(true);
      expect(isSelfManagedModal("src/components/novo/ProbeModal.tsx")).toBe(false);
      expect(isSelfManagedModal("src/components/shared/CategoryPickerModal.tsx")).toBe(true);
      expect(isSelfManagedModal("app/about.tsx")).toBe(true);
    });

    it("modalSegments separa os modais do nível de cima e mantém o aninhado dentro", () => {
      const code = `<View />\n<Modal a>\n  <X />\n  <Modal b><Y /></Modal>\n</Modal>\n<Modal c><Z /></Modal>`;
      const segs = modalSegments(code);
      expect(segs).toHaveLength(2);
      expect(segs[0]).toContain("<Modal b><Y /></Modal>");
      expect(segs[0].endsWith("</Modal>")).toBe(true);
      expect(segs[1]).toBe("<Modal c><Z /></Modal>");
      expect(modalSegmentWith(code, "Z")).toBe(segs[1]);
      expect(modalSegmentWith(code, "W")).toBe("");
    });
  });
});
