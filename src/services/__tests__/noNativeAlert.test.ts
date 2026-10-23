import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * O app só usa o alerta customizado (`appAlert`/`appConfirm` em
 * src/services/appAlert.ts). Este teste barra o alerta nativo em todo o código
 * do app, em qualquer formato conhecido (ver o auto-teste no fim).
 */

const ROOT = path.resolve(__dirname, "../../..");
const DIRS = ["app", "src", "components", "lib", "constants"];
const SOURCE = /\.(ts|tsx|js|jsx)$/;

const FORBIDDEN: { label: string; pattern: RegExp }[] = [
  // Alert.alert(, Alert?.alert(, window.confirm(, w.confirm(, RN.Alert.prompt(, (globalThis as any).alert(
  { label: ".alert/.confirm/.prompt(", pattern: /\??\.\s*(alert|confirm|prompt)\s*\(/ },
  // confirm(, alert(, prompt( soltos (appAlert/appConfirm não casam: maiúscula e prefixo)
  { label: "alert/confirm/prompt( global", pattern: /(^|[^\w$.])(alert|confirm|prompt)\s*\(/ },
  // Alert["alert"](, window['confirm'](
  { label: '["alert"/"confirm"/"prompt"]', pattern: /\[\s*["'`](alert|confirm|prompt)["'`]\s*\]/ },
  // import { Alert } / { Alert as X } de react-native ou react-native-web
  {
    label: 'import Alert from "react-native"',
    pattern: /import\s[^;]*?\bAlert\b[^;]*?from\s*["']react-native(-web)?["']/,
  },
  // const { Alert } = require("react-native")
  {
    label: 'require("react-native") Alert',
    pattern: /\{[^}]*\bAlert\b[^}]*\}\s*=\s*require\(\s*["']react-native(-web)?["']\s*\)/,
  },
  { label: 'require("react-native").Alert', pattern: /require\(\s*["']react-native(-web)?["']\s*\)\s*\??\.\s*Alert\b/ },
  // RN.Alert (import * as RN from "react-native")
  { label: "X.Alert", pattern: /[\w$)\]]\s*\??\.\s*Alert\b/ },
];

/**
 * Remove comentários sem mexer no conteúdo de strings, templates e regex
 * (um "//" dentro de uma URL ou um "/*" dentro de um glob não viram comentário).
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
      // Literal de regex: copia até a barra final, fora de classes [...]
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

function findForbidden(source: string): string[] {
  const code = stripComments(source);
  return FORBIDDEN.filter(({ pattern }) => pattern.test(code)).map(({ label }) => label);
}

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

describe("alerta nativo proibido no código do app", () => {
  const files: string[] = [];
  for (const dir of DIRS) collect(path.join(ROOT, dir), files);

  it("encontra os arquivos do app", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("nenhum arquivo usa o alerta nativo (Alert, window.alert/confirm/prompt)", () => {
    const hits: string[] = [];
    for (const file of files) {
      for (const label of findForbidden(fs.readFileSync(file, "utf8"))) {
        hits.push(`${path.relative(ROOT, file)}: ${label}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("auto-teste do detector", () => {
  const bypasses = [
    `Alert.alert("x")`,
    `Alert?.alert("x")`,
    `Alert["alert"]("x")`,
    `Alert.prompt("x")`,
    `window.alert("x")`,
    `window.confirm("x")`,
    `window?.confirm("x")`,
    `window["confirm"]("x")`,
    `window.prompt("x")`,
    `globalThis.confirm("x")`,
    `(globalThis as any).confirm("x")`,
    `const w = globalThis as unknown as { confirm?: (m: string) => boolean };\nconst keep = w.confirm ? w.confirm("x") : true;`,
    `const ok = confirm("Remover?");`,
    `alert("x")`,
    `prompt("x")`,
    `import { Alert } from "react-native";`,
    `import { View, Alert } from 'react-native';`,
    `import {\n  View,\n  Alert,\n} from "react-native";`,
    `import { Alert as NativeAlert } from "react-native";`,
    `import { Alert } from "react-native-web";`,
    `import * as RN from "react-native";\nRN.Alert.alert("a")`,
    `import * as RN from "react-native";\nconst A = RN.Alert;`,
    `import RN from "react-native"; const X = RN.Alert; X.alert("a")`,
    `const { Alert } = require("react-native");`,
    `const { Alert: N } = require("react-native"); N.alert("x")`,
    `const A = require("react-native").Alert;`,
    `const u = "http://x"; Alert.alert("a")`,
    `const g = "src/**/*.ts"; Alert.alert("hi"); const h = "*/";`,
    `const r = /["']/g; window.confirm("x")`,
  ];

  it.each(bypasses)("detecta: %s", (code) => {
    expect(findForbidden(code)).not.toEqual([]);
  });

  const allowed = [
    `appAlert("Erro", "Falhou");`,
    `await appConfirm({ title: "T", confirmLabel: "Sim" });`,
    `// Alert.alert("x") num comentário`,
    `/* window.confirm("x") */ appAlert("ok");`,
    `const g = "src/**/*.ts"; appAlert("hi"); const h = "*/";`,
    `const u = "http://x"; appAlert("a")`,
    `import { View, Text } from "react-native";`,
    `import { AlertTriangle } from "lucide-react-native";`,
    `const showAlert = true; type AlertKind = "info";`,
    `if (!(await askConfirmation())) return;`,
    `const r = /https?:\\/\\/[^\\s]+/; appAlert("x")`,
  ];

  it.each(allowed)("não acusa: %s", (code) => {
    expect(findForbidden(code)).toEqual([]);
  });
});
