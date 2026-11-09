import { describe, it, expect, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { PRIVACY_FLAG_TEXTS } from "@/src/constants/privacyFlagTexts";
import {
  generateGroupSecret,
  deriveStrongGroupKeys,
  GROUP_SECRET_BYTES,
} from "@/src/modules/strongGroup/groupSecret";
import {
  encryptStrongPayload,
  decryptStrongPayload,
  STRONG_KEY_BYTES,
} from "@/src/modules/strongGroup/eventCipher";
import {
  LEGACY_CUTOFF_TIMESTAMP,
  LEGACY_MIN_APP_VERSION,
  isLegacyCutoffReached,
  isLegacySyncDisabled,
} from "@/src/context/strongGroupSync";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("@/src/modules/security/infrastructure/webSecrets", () => ({
  webSecrets: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

const ROOT = path.resolve(__dirname, "../../../..");

function normalize(text: string): string {
  return text.replace(/\s+/g, " ");
}

function readFile(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Verificação Formal NFR-6 / Story 4.10: Criptografia Ponta a Ponta", () => {
  describe("1. Declarações Públicas em Políticas, Loja e Data Safety", () => {
    it("src/constants/privacyFlagTexts.ts declara ponta a ponta na flag sync", () => {
      const syncFlag = PRIVACY_FLAG_TEXTS.sync;
      expect(syncFlag.sends).toContain("com criptografia ponta a ponta (AES-256-GCM)");
      expect(syncFlag.sends).not.toMatch(/["{}&<>\n]/);
    });

    it("docs/politica-de-privacidade.md contém ponta a ponta, data de 9/11/2026 e risco residual", () => {
      const content = readFile("docs/politica-de-privacidade.md");
      expect(content).toContain("Última atualização: 9 de novembro de 2026");
      expect(content).toContain("criptografia de ponta a ponta autenticada (AES-256-GCM)");
      expect(content).toContain("Segredo de grupo de 256 bits");
      expect(content).toContain("docs/risco-residual-xor.md");
      expect(normalize(content)).toContain(normalize(PRIVACY_FLAG_TEXTS.sync.sends));
      expect(normalize(content)).toContain(normalize(PRIVACY_FLAG_TEXTS.sync.loses));
    });

    it("app/privacy-policy.tsx reflete a política com LAST_UPDATED sincronizado e ponta a ponta", () => {
      const content = readFile("app/privacy-policy.tsx");
      expect(content).toContain('const LAST_UPDATED = "9 de novembro de 2026";');
      expect(content).toContain("criptografia de ponta a ponta autenticada (AES-256-GCM)");
      expect(content).toContain("Segredo de grupo de 256 bits");
      expect(content).toContain("docs/risco-residual-xor.md");
      expect(normalize(content)).toContain(normalize(PRIVACY_FLAG_TEXTS.sync.sends));
      expect(normalize(content)).toContain(normalize(PRIVACY_FLAG_TEXTS.sync.loses));
    });

    it("PLAY_STORE_LISTING.md declara ponta a ponta na descrição, nas tags e na cópia da política", () => {
      const content = readFile("PLAY_STORE_LISTING.md");
      // Descrição completa
      expect(content).toContain(
        "Sincronize seus aparelhos por relays Nostr públicos, com criptografia ponta a ponta (AES-256-GCM). Sem servidor do DOMUS.",
      );
      // Tags de busca
      expect(content).toContain("criptografia ponta a ponta");
      // Cópia da política
      expect(content).toContain("Última atualização: 9 de novembro de 2026");
      expect(content).toContain("criptografia de ponta a ponta autenticada (AES-256-GCM)");
      expect(content).toContain("docs/risco-residual-xor.md");
      expect(normalize(content)).toContain(normalize(PRIVACY_FLAG_TEXTS.sync.sends));
      expect(normalize(content)).toContain(normalize(PRIVACY_FLAG_TEXTS.sync.loses));
    });

    it("docs/data-safety.md atesta 'Sim' para ponta a ponta com justificativa no AES-256-GCM", () => {
      const content = readFile("docs/data-safety.md");
      expect(content).toContain("Última atualização: 9 de novembro de 2026");
      expect(content).toMatch(/\|\s*Os dados ficam cifrados de ponta a ponta\?\s*\|\s*\*\*Sim\*\*\s*\|/);
      expect(content).toContain("AES-256-GCM");
      expect(content).toContain("Story 4.9");
      expect(content).toContain("eventCipher.ts");
      expect(content).toContain("groupSecret.ts");
    });

    it("app/sync.tsx informa criptografia ponta a ponta nos cards informativos", () => {
      const content = readFile("app/sync.tsx");
      expect(content).toContain("criptografia ponta a ponta (AES-256-GCM)");
    });

    it("src/tour/screenIntroContent.ts atualiza o modal de introdução para criptografia ponta a ponta", () => {
      const content = readFile("src/tour/screenIntroContent.ts");
      expect(content).toContain("criptografia ponta a ponta (AES-256-GCM)");
      expect(content).not.toContain("cifra simples derivada do código do grupo");
    });
  });

  describe("2. Documentação Técnica de Conformidade e Risco Residual", () => {
    it("docs/checklist-nfr-6-ponta-a-ponta.md existe e cobre a matriz de auditoria", () => {
      expect(existsSync(path.join(ROOT, "docs/checklist-nfr-6-ponta-a-ponta.md"))).toBe(true);
      const checklist = readFile("docs/checklist-nfr-6-ponta-a-ponta.md");
      expect(checklist).toContain("NFR-6");
      expect(checklist).toContain("SM-3");
      expect(checklist).toContain("FR-14");
      expect(checklist).toContain("eventCipher.ts");
      expect(checklist).toContain("groupSecret.ts");
      expect(checklist).toContain("strongGroupSync.ts");
      expect(checklist).toContain("docs/risco-residual-xor.md");
      // Afirmações negativas (honestidade técnica)
      expect(checklist).toContain("SQLite");
      expect(checklist).toContain("WebRTC");
    });

    it("docs/risco-residual-xor.md existe e detalha o corte e o risco residual do formato antigo", () => {
      expect(existsSync(path.join(ROOT, "docs/risco-residual-xor.md"))).toBe(true);
      const doc = readFile("docs/risco-residual-xor.md");
      expect(doc).toContain("XOR");
      expect(doc).toContain("AES-GCM");
      expect(doc).toContain("2026-11-20T00:00:00.000Z");
      expect(doc).toContain("Story 4.9");
    });
  });

  describe("3. Invariantes de Código e Segurança Criptográfica", () => {
    it("cifra AEAD opera com chave de 256 bits e garante integridade contra adulteração", () => {
      const secret = generateGroupSecret();
      expect(secret.length).toBe(GROUP_SECRET_BYTES); // 32 bytes = 256 bits

      const keys = deriveStrongGroupKeys(secret);
      expect(keys.encryptionKey.length).toBe(STRONG_KEY_BYTES); // 32 bytes
      expect(typeof keys.nostrPublicKey).toBe("string");
      expect(keys.nostrPublicKey.length).toBe(64);

      const plaintext = JSON.stringify({ type: "TRANSACTION_CREATED", amount: 150.75, note: "Compras" });
      const ciphertext = encryptStrongPayload(plaintext, keys);
      expect(ciphertext.startsWith("domus-gcm-v1.")).toBe(true);

      const decrypted = decryptStrongPayload(ciphertext, keys);
      expect(decrypted.ok).toBe(true);
      if (decrypted.ok) {
        expect(decrypted.plaintext).toBe(plaintext);
      }

      // Adulteração de texto cifrado é rejeitada por falha de integridade AEAD
      const prefix = "domus-gcm-v1.";
      const rawB64 = ciphertext.slice(prefix.length);
      const tamperedB64 =
        rawB64.slice(0, 10) +
        (rawB64[10] === "A" ? "B" : "A") +
        rawB64.slice(11);
      const tamperedCiphertext = prefix + tamperedB64;

      const tamperedResult = decryptStrongPayload(tamperedCiphertext, keys);
      expect(tamperedResult.ok).toBe(false);
      if (!tamperedResult.ok) {
        expect(tamperedResult.reason).toBe("auth-failed");
      }
    });

    it("corte do canal legado é incondicional pós-data de corte ou em versão obsoleta", () => {
      expect(LEGACY_CUTOFF_TIMESTAMP).toBe(Date.parse("2026-11-20T00:00:00.000Z"));
      expect(LEGACY_MIN_APP_VERSION).toBe("1.8.0");

      // Pré-corte: desligado = falso
      const preCutoffTime = Date.parse("2026-11-19T23:59:59.999Z");
      expect(isLegacyCutoffReached(preCutoffTime)).toBe(false);

      // Pós-corte: desligado = verdadeiro
      const postCutoffTime = Date.parse("2026-11-20T00:00:00.001Z");
      expect(isLegacyCutoffReached(postCutoffTime)).toBe(true);
      expect(isLegacySyncDisabled({ now: postCutoffTime, version: "1.8.0" })).toBe(true);

      // Versão depreciada: desligado = verdadeiro mesmo antes do corte
      expect(isLegacySyncDisabled({ now: preCutoffTime, version: "1.7.9" })).toBe(true);
    });
  });

  describe("4. Regras do Projeto e Higiene de Código", () => {
    it("não utiliza diálogos nativos (Alert.alert, window.alert) nas telas de privacidade e sync", () => {
      const privacyScreen = readFile("app/privacy-policy.tsx");
      const syncScreen = readFile("app/sync.tsx");

      expect(privacyScreen).not.toMatch(/\bAlert\.alert\b/);
      expect(privacyScreen).not.toMatch(/\bwindow\.alert\b/);
      expect(privacyScreen).not.toMatch(/\bwindow\.confirm\b/);

      expect(syncScreen).not.toMatch(/\bAlert\.alert\b/);
      expect(syncScreen).not.toMatch(/\bwindow\.alert\b/);
      expect(syncScreen).not.toMatch(/\bwindow\.confirm\b/);
    });
  });
});
