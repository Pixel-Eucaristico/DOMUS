import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../../../..");
const PROD_DIRS = ["app", "src", "packages"];
const SOURCE_EXT = /\.(ts|tsx|js|jsx)$/;
const INVENTORY_PATH = path.join(ROOT, "docs/inventario-dados.md");

export const VALID_CLASSES = new Set([
  "vira evento",
  "usa outro canal",
  "não sincroniza",
  "não sincroniza (consentimento por aparelho)",
  "é segredo",
]);

export interface InventoryEntry {
  rawKey: string;
  normalizedKey: string;
  isPrefix: boolean;
  storage: string;
  origin: string;
  classification: string;
  reason: string;
}

export interface ExtractedKeyUse {
  file: string;
  storageType: "AsyncStorage" | "SecureStore" | "webSecrets";
  method: string;
  keyExpression: string;
  resolvedKey: string | null;
  isPrefix: boolean;
}

function isTestFile(file: string): boolean {
  return (
    file.includes(`${path.sep}__tests__${path.sep}`) ||
    /\.(test|spec)\.[jt]sx?$/.test(file)
  );
}

function collectProductionFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (rel === "packages/sync" || rel.startsWith("packages/sync/")) continue;
    if (entry.isDirectory()) collectProductionFiles(full, out);
    else if (SOURCE_EXT.test(entry.name) && !isTestFile(full)) out.push(full);
  }
}

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
    if (
      ch === "/" &&
      (lastSignificant === "" || regexAllowedAfter.includes(lastSignificant))
    ) {
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

function extractCallArguments(code: string, openParenIndex: number): string[] {
  const args: string[] = [];
  let current = "";
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let i = openParenIndex + 1;
  const n = code.length;

  while (i < n) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && code[j] !== ch) {
        if (code[j] === "\\") j++;
        j++;
      }
      current += code.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === "(") {
      depthParen++;
      current += ch;
    } else if (ch === ")") {
      if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
        if (current.trim()) args.push(current.trim());
        break;
      }
      depthParen--;
      current += ch;
    } else if (ch === "[") {
      depthBracket++;
      current += ch;
    } else if (ch === "]") {
      depthBracket = Math.max(0, depthBracket - 1);
      current += ch;
    } else if (ch === "{") {
      depthBrace++;
      current += ch;
    } else if (ch === "}") {
      depthBrace = Math.max(0, depthBrace - 1);
      current += ch;
    } else if (
      ch === "," &&
      depthParen === 0 &&
      depthBracket === 0 &&
      depthBrace === 0
    ) {
      args.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
    i++;
  }
  return args;
}

function collectStringConstants(
  code: string,
  exportedOnly = false,
): Map<string, string> {
  const map = new Map<string, string>();
  const prefix = exportedOnly ? "\\bexport\\s+" : "\\b(?:export\\s+)?";
  const regex = new RegExp(
    `${prefix}(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=;]+?)?=\\s*("([^"\\\\]|\\\\.)*"|'([^'\\\\]|\\\\.)*'|` +
      "`([^`\\\\$]|\\\\.)*`)",
    "g",
  );
  let match: RegExpExecArray | null;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1];
    const literal = match[2];
    map.set(name, literal.slice(1, -1));
  }
  return map;
}

function collectTemplatePrefixConstants(
  code: string,
  localConsts: Map<string, string>,
  globalConsts: Map<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  const regex = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+?)?=\s*(`[^`]*`)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1];
    const tpl = match[2];
    if (!tpl.includes("${")) continue;
    const inner = tpl.slice(1, -1);
    const firstInterp = inner.indexOf("${");
    const staticPrefix = inner.slice(0, firstInterp);
    if (staticPrefix.length > 0) {
      map.set(name, staticPrefix);
      continue;
    }
    const closeBrace = inner.indexOf("}", firstInterp + 2);
    if (closeBrace !== -1) {
      const firstVar = inner.slice(firstInterp + 2, closeBrace).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(firstVar)) {
        const val = localConsts.get(firstVar) ?? globalConsts.get(firstVar);
        if (val !== undefined) map.set(name, val);
      }
    }
  }
  return map;
}

function resolveKeyExpression(
  expr: string,
  localConsts: Map<string, string>,
  globalConsts: Map<string, string>,
  localTemplatePrefixes: Map<string, string> = new Map(),
): { resolvedKey: string | null; isPrefix: boolean } {
  const trimmed = expr.trim();

  // Direct string literal: "foo" or 'foo' or `foo` (without ${})
  const directMatch = trimmed.match(/^("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\$]|\\.)*`)$/);
  if (directMatch) {
    return { resolvedKey: trimmed.slice(1, -1), isPrefix: false };
  }

  // Identifier: THEME_MODE_KEY or local template-prefix const (e.g. warnKey)
  if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) {
    const val = localConsts.get(trimmed) ?? globalConsts.get(trimmed);
    if (val !== undefined) {
      return { resolvedKey: val, isPrefix: false };
    }
    const tplPrefix = localTemplatePrefixes.get(trimmed);
    if (tplPrefix !== undefined) {
      return { resolvedKey: tplPrefix, isPrefix: true };
    }
    return { resolvedKey: null, isPrefix: false };
  }

  // Template literal with prefix + interpolation: `${AI_KEY_PREFIX}${provider}` or `domus_prefix_${id}`
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    const inner = trimmed.slice(1, -1);
    const firstInterp = inner.indexOf("${");
    if (firstInterp !== -1) {
      const staticPrefix = inner.slice(0, firstInterp);
      if (staticPrefix.length > 0) {
        return { resolvedKey: staticPrefix, isPrefix: true };
      }
      const closeBrace = inner.indexOf("}", firstInterp + 2);
      if (closeBrace !== -1) {
        const firstVar = inner.slice(firstInterp + 2, closeBrace).trim();
        if (/^[A-Za-z_$][\w$]*$/.test(firstVar)) {
          const val = localConsts.get(firstVar) ?? globalConsts.get(firstVar);
          if (val !== undefined) {
            return { resolvedKey: val, isPrefix: true };
          }
        }
      }
    }
  }

  // Concatenation: PREFIX + screenKey
  const concatMatch = trimmed.match(/^([A-Za-z_$][\w$]*|"[^"]*"|'[^']*')\s*\+/);
  if (concatMatch) {
    const lhs = concatMatch[1].trim();
    if (lhs.startsWith('"') || lhs.startsWith("'")) {
      return { resolvedKey: lhs.slice(1, -1), isPrefix: true };
    }
    const val = localConsts.get(lhs) ?? globalConsts.get(lhs);
    if (val !== undefined) {
      return { resolvedKey: val, isPrefix: true };
    }
  }

  return { resolvedKey: null, isPrefix: false };
}

function extractArrayKeyExpressions(arg: string): string[] {
  const trimmed = arg.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [trimmed];
  const elems = extractCallArguments("(" + trimmed.slice(1, -1) + ")", 0);
  const out: string[] = [];
  for (const el of elems) {
    const t = el.trim();
    if (t.startsWith("[") && t.endsWith("]")) {
      const tuple = extractCallArguments("(" + t.slice(1, -1) + ")", 0);
      if (tuple.length > 0) out.push(tuple[0]);
    } else {
      out.push(t);
    }
  }
  return out;
}

export function extractStorageKeysFromSource(
  source: string,
  relativeFilePath: string,
  globalConsts: Map<string, string> = new Map(),
): ExtractedKeyUse[] {
  const code = stripComments(source);
  const localConsts = collectStringConstants(code);
  const localTemplatePrefixes = collectTemplatePrefixConstants(code, localConsts, globalConsts);
  const results: ExtractedKeyUse[] = [];

  // Collect for-of array variables like: for (const key of [RELAY_CURSOR_KEY, LEGACY_LAST_PULL_TS_KEY])
  const loopArrayVars = new Map<string, string[]>();
  const forOfRegex = /for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s+(\[[^\]]*\])\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = forOfRegex.exec(code)) !== null) {
    loopArrayVars.set(m[1], extractArrayKeyExpressions(m[2]));
  }

  const recordKey = (
    storageType: ExtractedKeyUse["storageType"],
    method: string,
    keyExpr: string,
  ) => {
    const trimmed = keyExpr.trim();
    const loopItems = loopArrayVars.get(trimmed);
    if (loopItems) {
      for (const item of loopItems) {
        const resolved = resolveKeyExpression(item, localConsts, globalConsts, localTemplatePrefixes);
        results.push({
          file: relativeFilePath,
          storageType,
          method,
          keyExpression: item,
          ...resolved,
        });
      }
      return;
    }

    const resolved = resolveKeyExpression(trimmed, localConsts, globalConsts, localTemplatePrefixes);
    results.push({
      file: relativeFilePath,
      storageType,
      method,
      keyExpression: trimmed,
      ...resolved,
    });
  };

  // 1. AsyncStorage & injected storage objects (storage.getItem, AsyncStorage.setItem, etc.)
  const asyncCallRegex =
    /\b(?:AsyncStorage|storage|deps\.storage)\s*\??\.\s*(getItem|setItem|removeItem|mergeItem|multiSet|multiGet|multiRemove)\s*\(/g;
  while ((m = asyncCallRegex.exec(code)) !== null) {
    const method = m[1];
    const openParen = m.index + m[0].length - 1;
    const args = extractCallArguments(code, openParen);
    if (args.length === 0) continue;
    const keyExprs =
      method.startsWith("multi") ? extractArrayKeyExpressions(args[0]) : [args[0]];
    for (const k of keyExprs) recordKey("AsyncStorage", method, k);
  }

  // useAsyncStorage(key)
  const useAsyncRegex = /\buseAsyncStorage\s*\(/g;
  while ((m = useAsyncRegex.exec(code)) !== null) {
    const openParen = m.index + m[0].length - 1;
    const args = extractCallArguments(code, openParen);
    if (args.length > 0) recordKey("AsyncStorage", "useAsyncStorage", args[0]);
  }

  // createSyncGroupTracker({ storage: AsyncStorage, key: SYNC_GROUP_TRACKING_KEY })
  const trackerRegex = /\bcreateSyncGroupTracker\s*\(\s*\{([^}]*)\}\s*\)/g;
  while ((m = trackerRegex.exec(code)) !== null) {
    const keyProp = m[1].match(/\bkey\s*:\s*([^,\n}]+)/);
    if (keyProp) recordKey("AsyncStorage", "createSyncGroupTracker", keyProp[1]);
  }

  // 2. SecureStore & SecureStorageService & local secureGet/secureSet/secureDelete wrappers
  const secureCallRegex =
    /\b(?:SecureStore\s*\??\.\s*(getItemAsync|setItemAsync|deleteItemAsync)|SecureStorageService\s*\??\.\s*(get|set|delete)|(?:secureGet|secureSet|secureDelete))\s*\(/g;
  while ((m = secureCallRegex.exec(code)) !== null) {
    const method = m[1] ?? m[2] ?? m[0].replace(/\s*\($/, "");
    const openParen = m.index + m[0].length - 1;
    const args = extractCallArguments(code, openParen);
    if (args.length > 0) recordKey("SecureStore", method, args[0]);
  }

  // 3. webSecrets & deps.secrets
  const webSecretsRegex =
    /\b(?:webSecrets|secrets|deps\.secrets)\s*\??\.\s*(get|set|remove)\s*\(/g;
  while ((m = webSecretsRegex.exec(code)) !== null) {
    const method = m[1];
    const openParen = m.index + m[0].length - 1;
    const args = extractCallArguments(code, openParen);
    if (args.length > 0) recordKey("webSecrets", method, args[0]);
  }

  return results;
}

export function parseInventoryMarkdown(markdown: string): InventoryEntry[] {
  const entries: InventoryEntry[] = [];
  const lines = markdown.split(/\r?\n/);
  let inInventorySection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Inventário Completo\b/i.test(trimmed)) {
      inInventorySection = true;
      continue;
    }
    if (inInventorySection && /^##\s+/.test(trimmed)) {
      break;
    }
    if (!inInventorySection || !trimmed.startsWith("|")) continue;
    // Split pipe-delimited cells
    const cells = trimmed
      .slice(1, trimmed.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((c) => c.trim());
    if (cells.length < 5) continue;
    // Skip header and separator rows
    if (cells[0] === "Chave" || /^[-:\s]+$/.test(cells[0])) continue;

    const stripTicks = (s: string) => s.replace(/^`+|`+$/g, "").trim();
    const rawKey = stripTicks(cells[0]);
    const isPrefix = rawKey.endsWith("*");
    const normalizedKey = isPrefix ? rawKey.slice(0, -1) : rawKey;

    entries.push({
      rawKey,
      normalizedKey,
      isPrefix,
      storage: cells[1],
      origin: cells[2],
      classification: stripTicks(cells[3]),
      reason: cells[4],
    });
  }

  return entries;
}

export function findUninventoriedKeys(
  extracted: readonly ExtractedKeyUse[],
  inventory: readonly InventoryEntry[],
): ExtractedKeyUse[] {
  const exactKeys = new Set(
    inventory.filter((e) => !e.isPrefix).map((e) => e.normalizedKey),
  );
  const prefixes = inventory
    .filter((e) => e.isPrefix)
    .map((e) => e.normalizedKey);

  return extracted.filter((use) => {
    if (use.resolvedKey === null) return false;
    if (exactKeys.has(use.resolvedKey)) return false;
    return !prefixes.some((p) => use.resolvedKey!.startsWith(p));
  });
}

describe("Story 9.1: inventário e classificação de dados fora do log", () => {
  const files: string[] = [];
  for (const dir of PROD_DIRS) {
    collectProductionFiles(path.join(ROOT, dir), files);
  }

  const globalConsts = new Map<string, string>();
  const fileContents = new Map<string, string>();

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    fileContents.set(rel, content);
    for (const [k, v] of collectStringConstants(stripComments(content), true)) {
      globalConsts.set(k, v);
    }
  }

  const inventoryMarkdown = fs.readFileSync(INVENTORY_PATH, "utf8");
  const inventory = parseInventoryMarkdown(inventoryMarkdown);

  it("varre arquivos de produção sem depender de react-native", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(inventory.length).toBeGreaterThanOrEqual(40);
  });

  it("todas as entradas de docs/inventario-dados.md possuem classe válida, motivo não vazio, sem duplicatas e origens existentes", () => {
    const invalid = inventory.filter(
      (entry) =>
        !entry.rawKey ||
        !VALID_CLASSES.has(entry.classification) ||
        !entry.reason.trim(),
    );
    expect(invalid).toEqual([]);

    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const entry of inventory) {
      if (seen.has(entry.rawKey)) duplicates.push(entry.rawKey);
      seen.add(entry.rawKey);
    }
    expect(duplicates).toEqual([]);

    const missingOrigins: string[] = [];
    for (const entry of inventory) {
      const originMatches = entry.origin.match(/`([^`]+)`/g) ?? [];
      for (const m of originMatches) {
        const relPath = m.slice(1, -1);
        if (!fs.existsSync(path.join(ROOT, relPath))) {
          missingOrigins.push(`${entry.rawKey}: ${relPath}`);
        }
      }
    }
    expect(missingOrigins).toEqual([]);
  });

  it("registra AIDataPermissions como 'não sincroniza (consentimento por aparelho)' e domus_is_catholic_v1 como 'vira evento' (exclusivo do Grupo forte)", () => {
    const aiPerms = inventory.find((e) =>
      e.rawKey.startsWith("AIDataPermissions"),
    );
    expect(aiPerms).toBeDefined();
    expect(aiPerms?.classification).toBe(
      "não sincroniza (consentimento por aparelho)",
    );
    expect(aiPerms?.reason.trim().length).toBeGreaterThan(0);

    const catholic = inventory.find(
      (e) => e.normalizedKey === "domus_is_catholic_v1",
    );
    expect(catholic).toBeDefined();
    expect(catholic?.classification).toBe("vira evento");
    expect(catholic?.reason).toMatch(/Grupo forte/i);
  });

  it("100% das chaves de AsyncStorage, SecureStore e webSecrets usadas em produção constam em docs/inventario-dados.md", () => {
    const allExtracted: ExtractedKeyUse[] = [];
    for (const [rel, content] of fileContents.entries()) {
      allExtracted.push(
        ...extractStorageKeysFromSource(content, rel, globalConsts),
      );
    }

    expect(allExtracted.length).toBeGreaterThan(30);
    const missing = findUninventoriedKeys(allExtracted, inventory);
    expect(missing).toEqual([]);
  });
});

describe("auto-teste do detector de chaves não inventariadas", () => {
  const inventory = parseInventoryMarkdown(
    fs.readFileSync(INVENTORY_PATH, "utf8"),
  );

  it("detecta nova chave não listada em AsyncStorage", () => {
    const snippet = `await AsyncStorage.setItem("nova_chave_nao_listada", v);`;
    const extracted = extractStorageKeysFromSource(snippet, "<inline>");
    const missing = findUninventoriedKeys(extracted, inventory);
    expect(missing).toHaveLength(1);
    expect(missing[0]?.resolvedKey).toBe("nova_chave_nao_listada");
    expect(missing[0]?.storageType).toBe("AsyncStorage");
  });

  it("detecta nova chave não listada em SecureStore", () => {
    const snippet = `await SecureStore.setItemAsync("nova_secreta", v);`;
    const extracted = extractStorageKeysFromSource(snippet, "<inline>");
    const missing = findUninventoriedKeys(extracted, inventory);
    expect(missing).toHaveLength(1);
    expect(missing[0]?.resolvedKey).toBe("nova_secreta");
    expect(missing[0]?.storageType).toBe("SecureStore");
  });

  it("detecta nova chave não listada em SecureStorageService e webSecrets", () => {
    const snippet = `
      await SecureStorageService.set("nova_secure_service", v);
      await webSecrets.set("nova_web_secreta", v);
    `;
    const extracted = extractStorageKeysFromSource(snippet, "<inline>");
    const missing = findUninventoriedKeys(extracted, inventory);
    expect(missing.map((m) => m.resolvedKey)).toEqual([
      "nova_secure_service",
      "nova_web_secreta",
    ]);
  });

  it("detecta chave não listada via constante local ou prefixo dinâmico", () => {
    const snippet = `
      const NOVA_KEY = "chave_via_constante";
      const NOVO_PREFIXO = "prefixo_nao_listado_";
      await AsyncStorage.setItem(NOVA_KEY, "1");
      await AsyncStorage.getItem(NOVO_PREFIXO + id);
    `;
    const extracted = extractStorageKeysFromSource(snippet, "<inline>");
    const missing = findUninventoriedKeys(extracted, inventory);
    expect(missing.map((m) => m.resolvedKey)).toEqual([
      "chave_via_constante",
      "prefixo_nao_listado_",
    ]);
  });

  it("detecta chave via variável local de template literal", () => {
    const snippet = `
      const k = \`domus_new_\${id}\`;
      await AsyncStorage.setItem(k, "1");
    `;
    const extracted = extractStorageKeysFromSource(snippet, "<inline>");
    const missing = findUninventoriedKeys(extracted, inventory);
    expect(missing.map((m) => m.resolvedKey)).toEqual(["domus_new_"]);
  });

  it("aceita chaves já inventariadas (exatas e por prefixo)", () => {
    const snippet = `
      await AsyncStorage.getItem("domus_theme_mode_v1");
      await SecureStorageService.get("domus_ai_key_openai");
      await AsyncStorage.setItem("domus_screen_intro_v1_home", "1");
    `;
    const extracted = extractStorageKeysFromSource(snippet, "<inline>");
    const missing = findUninventoriedKeys(extracted, inventory);
    expect(missing).toEqual([]);
  });
});
