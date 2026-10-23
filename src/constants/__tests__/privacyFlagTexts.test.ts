import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import {
  PRIVACY_FLAG_TEXTS,
  formatPrivacyFlagText,
  type PrivacyFlagId,
} from "../privacyFlagTexts";

// Story 12.7: cada flag diz o que envia e o que se perde, com as mesmas frases
// no app, na política, na tela da política e na cópia da política do listing.

const ROOT = path.resolve(__dirname, "../../..");

/** Junta quebras de linha e espaços repetidos, como o Markdown e o JSX fazem. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ");
}

function read(relative: string): string {
  return normalize(readFileSync(path.join(ROOT, relative), "utf-8"));
}

/** Só o bloco da política dentro do listing, não a descrição da loja. */
function listingPolicyCopy(): string {
  const raw = readFileSync(path.join(ROOT, "PLAY_STORE_LISTING.md"), "utf-8");
  const start = raw.indexOf("````markdown");
  const end = raw.indexOf("````", start + "````markdown".length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return normalize(raw.slice(start, end));
}

const EXPECTED_FLAGS: PrivacyFlagId[] = [
  "ai",
  "aiDataPermissions",
  "voice",
  "visionOcr",
  "cloudVision",
  "sync",
  "googleDrive",
  "firebaseAnalytics",
  "firebasePerformance",
  "firebaseCrashlytics",
  "adModes",
  "personalizedAds",
  "externalLookups",
];

const COPIES: Record<string, () => string> = {
  "docs/politica-de-privacidade.md": () => read("docs/politica-de-privacidade.md"),
  "app/privacy-policy.tsx": () => read("app/privacy-policy.tsx"),
  "PLAY_STORE_LISTING.md (cópia da política)": listingPolicyCopy,
};

describe("PRIVACY_FLAG_TEXTS", () => {
  it("cobre todas as flags que enviam dados", () => {
    expect(Object.keys(PRIVACY_FLAG_TEXTS).sort()).toEqual([...EXPECTED_FLAGS].sort());
  });

  it.each(EXPECTED_FLAGS)("%s tem título, o que envia e o que se perde", (id) => {
    const t = PRIVACY_FLAG_TEXTS[id];
    expect(t.title.trim().length).toBeGreaterThan(0);
    expect(t.sends.trim().length).toBeGreaterThan(20);
    expect(t.loses.trim().length).toBeGreaterThan(20);
  });

  it.each(EXPECTED_FLAGS)("%s cabe num atributo JSX (sem aspas duplas, chaves, &, <, > nem quebra de linha)", (id) => {
    const { sends, loses, title } = PRIVACY_FLAG_TEXTS[id];
    for (const phrase of [sends, loses, title]) {
      expect(phrase).not.toMatch(/["{}&<>\n]/);
    }
  });

  it("Consultas de itens tem linha curta, do tamanho das outras linhas da tela Sobre", () => {
    const short = PRIVACY_FLAG_TEXTS.externalLookups.shortDescription ?? "";
    expect(short.length).toBeGreaterThan(10);
    expect(short.length).toBeLessThanOrEqual(50);
    expect(short).not.toMatch(/["{}&<>\n]/);
  });

  it("formata em duas linhas, Envia e Sem isso", () => {
    const t = PRIVACY_FLAG_TEXTS.sync;
    expect(formatPrivacyFlagText("sync")).toBe(`Envia: ${t.sends}\nSem isso: ${t.loses}`);
  });
});

describe.each(Object.entries(COPIES))("cópia em %s", (_name, load) => {
  const content = load();

  it.each(EXPECTED_FLAGS)("contém as frases de %s", (id) => {
    const { sends, loses } = PRIVACY_FLAG_TEXTS[id];
    expect(content).toContain(normalize(sends));
    expect(content).toContain(normalize(loses));
  });
});

/** Todos os .ts/.tsx de uma pasta, fora os testes. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "__tests__" && name !== "node_modules") out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("cada flag aparece no app", () => {
  const uiSources = [
    ...sourceFiles(path.join(ROOT, "app")),
    ...sourceFiles(path.join(ROOT, "src/components")),
  ]
    .filter((f) => !f.endsWith(path.join("app", "privacy-policy.tsx")))
    .map((f) => readFileSync(f, "utf-8"))
    .join("\n");

  it.each(EXPECTED_FLAGS)("%s é usada em alguma tela ou componente", (id) => {
    const uses = [`flag="${id}"`, `formatPrivacyFlagText("${id}")`, `PRIVACY_FLAG_TEXTS.${id}`];
    expect(uses.some((u) => uiSources.includes(u))).toBe(true);
  });
});

describe("textos que contradiziam a política", () => {
  it("a política cita os achados D17 e D22", () => {
    const policy = read("docs/politica-de-privacidade.md");
    expect(policy).toContain("código de afiliado");
    expect(policy).toContain("ID da instalação do app");
    expect(policy).toContain("localização aproximada");
    expect(policy).toContain("não personalizados por padrão");
  });
});
