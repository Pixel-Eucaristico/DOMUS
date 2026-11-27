import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Story 6.5 (FR-23, NFR-1):
 * Verifica automaticamente por máquina que nenhuma chamada de escrita no
 * `AsyncStorage` (`setItem`, `mergeItem`, `multiSet` ou `useAsyncStorage`)
 * utiliza chave cujo identificador ou valor contenha `PASSWORD`, `SECRET`,
 * `TOKEN` ou `API_KEY` (ou chaves protegidas do DOMUS migradas para
 * `SecureStore` / `webSecrets`), exceto se listada em `ALLOWED_EXCEPTIONS`
 * com justificativa escrita (`reason`).
 *
 * Após as Stories 6.1 a 6.4, `ALLOWED_EXCEPTIONS` deve permanecer vazia (`[]`).
 */

const ROOT = path.resolve(__dirname, "../../../..");
const DIRS = ["app", "src", "packages", "components", "lib", "constants", "modules"];
const SOURCE = /\.(ts|tsx|js|jsx)$/;

export interface AsyncStorageSecretException {
  /** Caminho relativo à raiz do repositório (ex.: "src/services/exemplo.ts"). */
  file: string;
  /** Nome ou expressão da chave permitida na chamada ao AsyncStorage. */
  key: string;
  /** Motivo obrigatório escrito explicando por que a exceção existe. */
  reason: string;
}

/**
 * Lista de exceções justificadas.
 * Após as Stories 6.1 a 6.4, nenhuma exceção é necessária.
 */
export const ALLOWED_EXCEPTIONS: readonly AsyncStorageSecretException[] = [];

/**
 * Termos proibidos em nomes/valores de chaves gravadas no AsyncStorage (NFR-1 / FR-23),
 * além das chaves específicas migradas para SecureStore / webSecrets no Épico 4 e Épico 6.
 */
const FORBIDDEN_KEY_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "PASSWORD", pattern: /password/i },
  { label: "SECRET", pattern: /secret/i },
  { label: "TOKEN", pattern: /token/i },
  { label: "API_KEY", pattern: /api_?key/i },
  {
    label: "Chave protegida do DOMUS (SecureStore/webSecrets)",
    pattern:
      /\b(CLOUD_VISION_API_KEY_STORAGE|DEVICE_KEY_STORAGE|GROUP_CODE_KEY|STRONG_GROUP_SECRET_KEY|EVENTS_BACKUP_KEY|domus_ocr_cloud_vision_api_key|domus_auto_backup_device_key|domus_nostr_group_code|domus_strong_group_secret_v1|domus_events_v1|domus_security_settings_v1)\b/,
  },
];

/**
 * Remove comentários de linha e de bloco preservando literais de string,
 * template strings e expressões regulares.
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

interface StorageBindings {
  /** Identificadores de objetos/propriedades que referenciam AsyncStorage (ex.: AsyncStorage, storage, s) */
  objectNames: Set<string>;
  /** Identificadores de métodos desestruturados (ex.: const { setItem: save } = AsyncStorage) */
  destructuredMethods: Map<string, string>;
  /** Identificadores de useAsyncStorage (ex.: import { useAsyncStorage } from "...") */
  hookNames: Set<string>;
}

/**
 * Identifica todos os nomes locais que referenciam `AsyncStorage` no arquivo:
 * - import default / namespace / named (`useAsyncStorage`) / require
 * - variáveis locais (`const s = AsyncStorage`)
 * - parâmetros default de injeção de dependência (`storage: Pick<...> = AsyncStorage`)
 * - propriedades de objeto de configuração (`{ storage: AsyncStorage }` -> `deps.storage`)
 * - desestruturação de métodos (`const { setItem } = AsyncStorage`)
 */
function collectAsyncStorageBindings(code: string): StorageBindings {
  const objectNames = new Set<string>(["AsyncStorage"]);
  const destructuredMethods = new Map<string, string>();
  const hookNames = new Set<string>(["useAsyncStorage"]);

  // import X, { useAsyncStorage as u } from "@react-native-async-storage/async-storage"
  const importRegex =
    /import\s+([^;]+?)\s+from\s*["']@react-native-async-storage\/async-storage["']/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(code)) !== null) {
    const clause = match[1].trim();
    const nsMatch = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (nsMatch) {
      objectNames.add(nsMatch[1]);
      continue;
    }
    const defaultMatch = clause.match(/^([A-Za-z_$][\w$]*)/);
    if (defaultMatch) {
      objectNames.add(defaultMatch[1]);
    }
    const bracesMatch = clause.match(/\{([^}]*)\}/);
    if (bracesMatch) {
      for (const spec of bracesMatch[1].split(",")) {
        const parts = spec
          .trim()
          .split(/\s+as\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length === 0) continue;
        const orig = parts[0];
        const local = parts[1] ?? parts[0];
        if (orig === "default") objectNames.add(local);
        else if (orig === "useAsyncStorage") hookNames.add(local);
        else if (orig === "setItem" || orig === "mergeItem" || orig === "multiSet") {
          destructuredMethods.set(local, orig);
        }
      }
    }
  }

  // const X = require("@react-native-async-storage/async-storage")
  const requireRegex =
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*["']@react-native-async-storage\/async-storage["']\s*\)(?:\.default)?/g;
  while ((match = requireRegex.exec(code)) !== null) {
    if (match[1]) objectNames.add(match[1]);
  }

  // Propagação transitiva para variáveis, parâmetros default e propriedades de objeto
  let added = true;
  while (added) {
    added = false;
    // const s = AsyncStorage  OU  storage: Pick<typeof AsyncStorage, "setItem"> = AsyncStorage
    const assignOrDefaultParamRegex =
      /\b([A-Za-z_$][\w$]*)\s*(?::\s*(?:[^=;,)]|<[^>]*>)+)?=\s*([A-Za-z_$][\w$]*)(?:\.default)?\b/g;
    while ((match = assignOrDefaultParamRegex.exec(code)) !== null) {
      const lhs = match[1];
      const rhs = match[2];
      if (objectNames.has(rhs) && !objectNames.has(lhs)) {
        objectNames.add(lhs);
        added = true;
      }
    }

    // { storage: AsyncStorage } -> monitora também `.storage.setItem`
    const propPassRegex = /\b([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)\b/g;
    while ((match = propPassRegex.exec(code)) !== null) {
      const prop = match[1];
      const val = match[2];
      if (objectNames.has(val) && !objectNames.has(prop)) {
        objectNames.add(prop);
        added = true;
      }
    }
  }

  // const { setItem, mergeItem: myMerge } = AsyncStorage (ou outro alias)
  const destructRegex =
    /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*([A-Za-z_$][\w$]*)(?:\.default)?\b/g;
  while ((match = destructRegex.exec(code)) !== null) {
    const rhs = match[2];
    if (!objectNames.has(rhs)) continue;
    for (const field of match[1].split(",")) {
      const parts = field
        .trim()
        .split(/\s*:\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length === 0) continue;
      const orig = parts[0];
      const local = (parts[1] ?? parts[0]).split("=")[0].trim();
      if (orig === "setItem" || orig === "mergeItem" || orig === "multiSet") {
        destructuredMethods.set(local, orig);
      }
    }
  }

  return { objectNames, destructuredMethods, hookNames };
}

/**
 * Extrai a expressão de inicialização completa (inclusive multi-linha com `{...}`, `[...]` ou `(...)`)
 * a partir do índice logo após o `=` até o fim da instrução.
 */
function readInitializerExpression(code: string, startIndex: number): string {
  let i = startIndex;
  const n = code.length;
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let out = "";

  while (i < n) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && code[j] !== ch) {
        if (code[j] === "\\") j++;
        j++;
      }
      out += code.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === "(") depthParen++;
    else if (ch === ")") {
      if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) break;
      depthParen = Math.max(0, depthParen - 1);
    } else if (ch === "[") depthBracket++;
    else if (ch === "]") {
      if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) break;
      depthBracket = Math.max(0, depthBracket - 1);
    } else if (ch === "{") depthBrace++;
    else if (ch === "}") {
      if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) break;
      depthBrace = Math.max(0, depthBrace - 1);
    } else if (
      ch === ";" &&
      depthParen === 0 &&
      depthBracket === 0 &&
      depthBrace === 0
    ) {
      break;
    }
    out += ch;
    i++;
  }

  return out.trim();
}

/**
 * Coleta todas as declarações `const/let/var IDENT = <inicializador>` (incluindo
 * multi-linha e múltiplas declarações de mesmo nome em escopos distintos) e `enum`
 * no arquivo para resolver valores passados ao `AsyncStorage`.
 */
function collectLocalConstants(code: string): Map<string, string[]> {
  const constants = new Map<string, string[]>();
  const addConst = (name: string, val: string) => {
    if (!val) return;
    const list = constants.get(name) ?? [];
    list.push(val);
    constants.set(name, list);
  };

  const declRegex =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+?)?=\s*/g;
  let match: RegExpExecArray | null;
  while ((match = declRegex.exec(code)) !== null) {
    const ident = match[1];
    const expr = readInitializerExpression(code, match.index + match[0].length);
    addConst(ident, expr);
  }

  // Suporte a enum NomeEnum { CHAVE = "valor" }
  const enumRegex = /\benum\s+([A-Za-z_$][\w$]*)\s*\{([^}]*)\}/g;
  while ((match = enumRegex.exec(code)) !== null) {
    addConst(match[1], match[2].trim());
  }

  return constants;
}

/**
 * Extrai a lista de argumentos de uma chamada `fn(arg1, arg2, ...)` a partir do
 * índice logo após o `(` de abertura, respeitando parênteses, colchetes, chaves e strings.
 */
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

/**
 * Para `multiSet([[k1, v1], [k2, v2]])`, extrai apenas a expressão da chave (`k1`, `k2`)
 * de cada tupla literal quando o argumento é um array literal, evitando falsos positivos
 * nos valores e permitindo exceções por chave individual.
 */
function extractMultiSetKeyExpressions(arg0: string): string[] {
  const trimmed = arg0.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [trimmed];
  }
  const inner = "(" + trimmed.slice(1, -1) + ")";
  const tuples = extractCallArguments(inner, 0);
  if (tuples.length === 0) return [trimmed];

  const keys: string[] = [];
  for (const tuple of tuples) {
    const t = tuple.trim();
    if (t.startsWith("[") && t.endsWith("]")) {
      const tupleElems = extractCallArguments("(" + t.slice(1, -1) + ")", 0);
      if (tupleElems.length > 0) {
        keys.push(tupleElems[0]);
      }
    } else {
      keys.push(t);
    }
  }
  return keys.length > 0 ? keys : [trimmed];
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Expande um argumento de chave combinando a própria expressão com os valores
 * de quaisquer constantes locais referenciadas nela.
 */
function expandKeyExpression(
  keyExpr: string,
  constants: Map<string, string[]>
): string {
  const parts = [keyExpr];
  const visited = new Set<string>();
  const queue: string[] = [...(keyExpr.match(/[A-Za-z_$][\w$]*/g) ?? [])];

  while (queue.length > 0 && visited.size < 64) {
    const ident = queue.shift()!;
    if (visited.has(ident)) continue;
    visited.add(ident);
    const vals = constants.get(ident);
    if (vals) {
      for (const val of vals) {
        parts.push(val);
        const nested = val.match(/[A-Za-z_$][\w$]*/g) ?? [];
        for (const n of nested) {
          if (!visited.has(n)) queue.push(n);
        }
      }
    }
  }

  return parts.join(" ");
}

export interface SecretWriteViolation {
  file: string;
  method: string;
  keyExpression: string;
  matchedRule: string;
}

export function validateExceptions(
  exceptions: readonly AsyncStorageSecretException[]
): string[] {
  const errors: string[] = [];
  for (const ex of exceptions) {
    if (!ex.file || !ex.file.trim()) {
      errors.push(`Exceção com campo 'file' vazio para a chave '${ex.key}'`);
    }
    if (!ex.key || !ex.key.trim()) {
      errors.push(`Exceção no arquivo '${ex.file}' com campo 'key' vazio`);
    }
    if (!ex.reason || !ex.reason.trim()) {
      errors.push(
        `Exceção para '${ex.file}' (${ex.key}) não possui motivo escrito ('reason' vazio)`
      );
    }
  }
  return errors;
}

export function findSecretWritesInSource(
  source: string,
  relativeFilePath = "<inline>",
  exceptions: readonly AsyncStorageSecretException[] = ALLOWED_EXCEPTIONS
): SecretWriteViolation[] {
  const code = stripComments(source);
  const { objectNames, destructuredMethods, hookNames } =
    collectAsyncStorageBindings(code);
  const constants = collectLocalConstants(code);
  const violations: SecretWriteViolation[] = [];

  const checkKeyCandidate = (method: string, keyExpression: string) => {
    const isExcepted = exceptions.some(
      (ex) =>
        ex.file === relativeFilePath &&
        ex.key === keyExpression &&
        Boolean(ex.reason && ex.reason.trim())
    );
    if (isExcepted) return;

    const expanded = expandKeyExpression(keyExpression, constants);
    for (const rule of FORBIDDEN_KEY_PATTERNS) {
      if (rule.pattern.test(expanded)) {
        violations.push({
          file: relativeFilePath,
          method,
          keyExpression,
          matchedRule: rule.label,
        });
        break;
      }
    }
  };

  // 1. Chamadas qualificadas: AsyncStorage.setItem(, deps.storage.setItem(, Storage.default.setItem(, AsyncStorage["setItem"](
  const namesAlt = Array.from(objectNames).map(escapeRegExp).join("|");
  const qualifiedCallRegex = new RegExp(
    `\\b(?:${namesAlt})\\s*(?:(?:\\?\\.|\\.)\\s*default\\s*)?(?:\\?\\.\\s*(setItem|mergeItem|multiSet)|\\.\\s*(setItem|mergeItem|multiSet)|(?:\\?\\.)?\\[\\s*["'\`](setItem|mergeItem|multiSet)["'\`]\\s*\\])\\s*\\(`,
    "g"
  );

  let match: RegExpExecArray | null;
  while ((match = qualifiedCallRegex.exec(code)) !== null) {
    const method = match[1] || match[2] || match[3];
    const openParenIndex = match.index + match[0].length - 1;
    const args = extractCallArguments(code, openParenIndex);
    if (args.length === 0) continue;

    const keyCandidates =
      method === "multiSet"
        ? extractMultiSetKeyExpressions(args[0])
        : [args[0]];
    for (const keyCandidate of keyCandidates) {
      checkKeyCandidate(method, keyCandidate);
    }
  }

  // 2. Chamadas de métodos desestruturados: const { setItem } = AsyncStorage; setItem("user_password", val)
  if (destructuredMethods.size > 0) {
    const destructAlt = Array.from(destructuredMethods.keys())
      .map(escapeRegExp)
      .join("|");
    const bareMethodRegex = new RegExp(
      `(?:^|[^\\w$.])(${destructAlt})\\s*\\(`,
      "g"
    );
    while ((match = bareMethodRegex.exec(code)) !== null) {
      const localName = match[1];
      const method = destructuredMethods.get(localName)!;
      const openParenIndex = match.index + match[0].length - 1;
      const args = extractCallArguments(code, openParenIndex);
      if (args.length === 0) continue;

      const keyCandidates =
        method === "multiSet"
          ? extractMultiSetKeyExpressions(args[0])
          : [args[0]];
      for (const keyCandidate of keyCandidates) {
        checkKeyCandidate(method, keyCandidate);
      }
    }
  }

  // 3. Hook useAsyncStorage(keyExpr)
  if (hookNames.size > 0) {
    const hooksAlt = Array.from(hookNames).map(escapeRegExp).join("|");
    const hookCallRegex = new RegExp(
      `\\b(${hooksAlt})\\s*\\(`,
      "g"
    );
    while ((match = hookCallRegex.exec(code)) !== null) {
      const openParenIndex = match.index + match[0].length - 1;
      const args = extractCallArguments(code, openParenIndex);
      if (args.length === 0) continue;
      checkKeyCandidate("useAsyncStorage", args[0]);
    }
  }

  return violations;
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
    if (entry.isDirectory()) collectProductionFiles(full, out);
    else if (SOURCE.test(entry.name) && !isTestFile(full)) out.push(full);
  }
}

describe("Story 6.5: barrar por teste novo segredo em AsyncStorage (FR-23, NFR-1)", () => {
  const files: string[] = [];
  for (const dir of DIRS) collectProductionFiles(path.join(ROOT, dir), files);

  it("varre todos os arquivos de produção do repositório", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("a lista de exceções tem motivo escrito em todos os itens e, após as Stories 6.1 a 6.4, está vazia", () => {
    expect(validateExceptions(ALLOWED_EXCEPTIONS)).toEqual([]);
    expect(ALLOWED_EXCEPTIONS).toEqual([]);
  });

  it("nenhum arquivo grava segredo (PASSWORD, SECRET, TOKEN, API_KEY ou chaves protegidas) em AsyncStorage", () => {
    const hits: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf8");
      const violations = findSecretWritesInSource(content, rel, ALLOWED_EXCEPTIONS);
      for (const v of violations) {
        hits.push(
          `${v.file}: AsyncStorage.${v.method}(${v.keyExpression}) [regra: ${v.matchedRule}]`
        );
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("auto-teste do detector de segredos em AsyncStorage", () => {
  const forbiddenSnippets = [
    // Termos diretos no literal da chave
    `AsyncStorage.setItem("user_password", val)`,
    `AsyncStorage.setItem("DOMUS_PASSWORD_V1", val)`,
    `AsyncStorage.setItem("client_secret", val)`,
    `AsyncStorage.setItem("strong_group_secret", val)`,
    `AsyncStorage.setItem("auth_token", val)`,
    `AsyncStorage.setItem("refresh_token_v1", val)`,
    `AsyncStorage.setItem("cloud_vision_api_key", val)`,
    `AsyncStorage.setItem("openai_apikey", val)`,
    // Termos no nome do identificador da chave
    `AsyncStorage.setItem(USER_PASSWORD_KEY, val)`,
    `AsyncStorage.setItem(STRONG_SECRET_KEY, val)`,
    `AsyncStorage.setItem(ACCESS_TOKEN_KEY, val)`,
    `AsyncStorage.setItem(OCR_API_KEY, val)`,
    `AsyncStorage.setItem(apiKeyStorageKey, val)`,
    // Constante local cujo valor contém o segredo (mesmo com identificador neutro)
    `const STORAGE_K = "domus_user_password";\nawait AsyncStorage.setItem(STORAGE_K, val);`,
    `const K1 = "my_secret_key";\nconst K2 = K1;\nawait AsyncStorage.setItem(K2, val);`,
    `const CFG = "oauth_token_cache";\nawait AsyncStorage.setItem(CFG, val);`,
    `const K = "vision_api_key";\nawait AsyncStorage.setItem(K, val);`,
    // Constantes multi-linha (objeto, array multiSet, enum e duas funções com variável de mesmo nome)
    `const STORAGE_KEYS = {\n  AUTH: "user_password",\n};\nawait AsyncStorage.setItem(STORAGE_KEYS.AUTH, val);`,
    `const PAIRS = [\n  ["theme", "dark"],\n  ["user_password", val],\n];\nawait AsyncStorage.multiSet(PAIRS);`,
    `enum Keys {\n  A = "client_secret"\n}\nawait AsyncStorage.setItem(Keys.A, val);`,
    `function a() { const k = "user_password"; return AsyncStorage.setItem(k, "1"); }\nfunction b() { const k = "theme_mode"; return k; }`,
    // Injeção de dependência via parâmetro default e via propriedade de objeto
    `function save(v: string, storage: Pick<typeof AsyncStorage, "setItem"> = AsyncStorage) { return storage.setItem("auth_token", v); }`,
    `const deps = { storage: AsyncStorage };\ndeps.storage.setItem(EVENTS_BACKUP_KEY, "[]");`,
    // Desestruturação de métodos e hook useAsyncStorage
    `const { setItem } = AsyncStorage;\nawait setItem("user_password", val);`,
    `import { useAsyncStorage } from "@react-native-async-storage/async-storage";\nconst store = useAsyncStorage("auth_token");`,
    // Outras variantes de escrita (optional chaining, colchetes, mergeItem, multiSet, alias)
    `AsyncStorage?.setItem("user_password", val)`,
    `AsyncStorage["setItem"]("client_secret", val)`,
    `AsyncStorage.mergeItem("auth_token", val)`,
    `AsyncStorage.multiSet([["domus_api_key", val], ["other", "1"]])`,
    `import Storage from "@react-native-async-storage/async-storage";\nawait Storage.setItem("secret_value", val);`,
    `const s = AsyncStorage;\nawait s.setItem("access_token", val);`,
    // Chaves específicas do DOMUS protegidas nos Épicos 4 e 6
    `AsyncStorage.setItem("domus_ocr_cloud_vision_api_key", val)`,
    `AsyncStorage.setItem("domus_auto_backup_device_key", val)`,
    `AsyncStorage.setItem("domus_nostr_group_code", val)`,
    `AsyncStorage.setItem("domus_strong_group_secret_v1", val)`,
    `AsyncStorage.setItem("domus_events_v1", val)`,
    `AsyncStorage.setItem("domus_security_settings_v1", val)`,
    `AsyncStorage.setItem(DEVICE_KEY_STORAGE, val)`,
    `AsyncStorage.setItem(GROUP_CODE_KEY, val)`,
    `AsyncStorage.setItem(EVENTS_BACKUP_KEY, val)`,
  ];

  it.each(forbiddenSnippets)("detecta e barra: %s", (snippet) => {
    expect(findSecretWritesInSource(snippet)).not.toEqual([]);
  });

  const allowedSnippets = [
    `await AsyncStorage.setItem("domus_device_id", did);`,
    `await AsyncStorage.setItem(THEME_MODE_KEY, mode);`,
    `await AsyncStorage.setItem(LAST_SYNC_KEY, ts.toString());`,
    `await AsyncStorage.setItem("@domus:ocr_config", JSON.stringify(newConfig));`,
    // multiSet onde apenas o valor (2º item da tupla) tem palavra parecida, mas a chave é segura
    `await AsyncStorage.multiSet([["domus_theme", tokenLabel]]);`,
    // Leitura e remoção para migração legada são permitidas (apenas escritas são barradas)
    `const legacy = await AsyncStorage.getItem("domus_nostr_group_code");`,
    `await AsyncStorage.removeItem("domus_auto_backup_device_key");`,
    // Comentários não geram falso positivo
    `// AsyncStorage.setItem("user_password", "123")`,
    `/* AsyncStorage.setItem(API_KEY, "abc") */`,
  ];

  it.each(allowedSnippets)("permite código legítimo: %s", (snippet) => {
    expect(findSecretWritesInSource(snippet)).toEqual([]);
  });

  it("respeita uma exceção quando ela possui motivo escrito e rejeita exceção sem motivo", () => {
    const code = `AsyncStorage.setItem(LEGACY_TOKEN_KEY, val)`;

    // Sem exceção -> falha
    expect(findSecretWritesInSource(code, "src/legacy.ts", [])).toHaveLength(1);

    // Com exceção justificada -> passa
    const validExceptions: AsyncStorageSecretException[] = [
      {
        file: "src/legacy.ts",
        key: "LEGACY_TOKEN_KEY",
        reason: "Token público de telemetria anônima não-sensível",
      },
    ];
    expect(validateExceptions(validExceptions)).toEqual([]);
    expect(findSecretWritesInSource(code, "src/legacy.ts", validExceptions)).toEqual([]);

    // Exceção sem motivo -> ignorada pelo detector e reprovada por validateExceptions
    const invalidExceptions: AsyncStorageSecretException[] = [
      {
        file: "src/legacy.ts",
        key: "LEGACY_TOKEN_KEY",
        reason: "   ",
      },
    ];
    expect(validateExceptions(invalidExceptions)).not.toEqual([]);
    expect(findSecretWritesInSource(code, "src/legacy.ts", invalidExceptions)).toHaveLength(1);
  });
});
