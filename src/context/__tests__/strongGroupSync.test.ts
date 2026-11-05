import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createStrongSyncGroup,
  loadActiveSyncGroup,
  clearAllSyncGroupSecrets,
  resolveJoinSyncGroup,
} from "../strongGroupSync";
import {
  GROUP_CODE_KEY,
  STRONG_GROUP_SECRET_KEY,
  generateGroupCode,
} from "../syncStorage";
import * as syncStorageModule from "../syncStorage";
import { parseGroupSecret } from "@/src/modules/strongGroup/groupSecret";

// ─── Mocks de persistência em memória ─────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  secure: new Map<string, string>(),
  legacy: new Map<string, string>(),
  web: new Map<string, string>(),
  secureFails: { value: false },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => {
    if (mocks.secureFails.value) throw new Error("keystore indisponível");
    return mocks.secure.get(key) ?? null;
  }),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    if (mocks.secureFails.value) throw new Error("keystore indisponível");
    mocks.secure.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    mocks.secure.delete(key);
  }),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => mocks.legacy.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mocks.legacy.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      mocks.legacy.delete(key);
    }),
  },
}));

vi.mock("@/src/modules/security/infrastructure/webSecrets", () => ({
  webSecrets: {
    get: vi.fn(async (key: string) => mocks.web.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      mocks.web.set(key, value);
      return true;
    }),
    remove: vi.fn(async (key: string) => {
      mocks.web.delete(key);
    }),
  },
}));

const { secure, legacy, web, secureFails } = mocks;

beforeEach(() => {
  secure.clear();
  legacy.clear();
  web.clear();
  secureFails.value = false;
  process.env.EXPO_OS = "android";
  vi.clearAllMocks();
});

describe("Story 4.3: Criação de Grupo forte e persistência segura", () => {
  it("cria grupo exclusivamente com formato DOMUS1-... (79 caracteres) e chaves derivadas", async () => {
    const group = await createStrongSyncGroup();

    expect(group.isStrong).toBe(true);
    expect(group.code).toMatch(/^DOMUS1(-[A-Z2-7]{4}){14}-[A-Z2-7]{2}$/);
    expect(group.code).toHaveLength(79);

    // O código gerado deve ser um segredo criptográfico de 256 bits válido
    const parsed = parseGroupSecret(group.code);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.secret).toHaveLength(32);
    }

    // Chaves derivadas válidas
    expect(group.keys.publicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(group.keys.privateKey).toHaveLength(32);
    expect(group.keys.encryptionKey).toHaveLength(32);
  });

  it("nunca chama generateGroupCode para criar novos grupos", async () => {
    const spy = vi.spyOn(syncStorageModule, "generateGroupCode");
    await createStrongSyncGroup();
    expect(spy).not.toHaveBeenCalled();
  });

  it("salva o segredo forte em SecureStore e NUNCA em AsyncStorage no nativo", async () => {
    const group = await createStrongSyncGroup();

    expect(secure.get(STRONG_GROUP_SECRET_KEY)).toBe(group.code);
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
  });

  it("limpa código legado anterior ao criar novo Grupo forte", async () => {
    secure.set(GROUP_CODE_KEY, "OLD123");
    legacy.set(GROUP_CODE_KEY, "OLD123");

    await createStrongSyncGroup();

    expect(secure.has(GROUP_CODE_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });

  it("se o SecureStore falhar ao salvar, lança erro e NUNCA grava em AsyncStorage", async () => {
    secureFails.value = true;

    await expect(createStrongSyncGroup()).rejects.toThrow("keystore indisponível");
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
  });

  it("na web, salva em webSecrets e nunca toca AsyncStorage nem SecureStore", async () => {
    process.env.EXPO_OS = "web";

    const group = await createStrongSyncGroup();

    expect(web.get(STRONG_GROUP_SECRET_KEY)).toBe(group.code);
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(secure.size).toBe(0);
  });
});

describe("Story 4.3: Carregamento do grupo ativo no boot", () => {
  it("prioriza Grupo forte sobre grupo legado quando ambos existem", async () => {
    const strongGroup = await createStrongSyncGroup();
    // Simula existência concomitante de código legado
    secure.set(GROUP_CODE_KEY, "LEG123");

    const active = await loadActiveSyncGroup();
    expect(active).not.toBeNull();
    expect(active?.isStrong).toBe(true);
    expect(active?.code).toBe(strongGroup.code);
  });

  it("carrega grupo legado quando não há segredo forte (compatibilidade de transição)", async () => {
    const legacyCode = generateGroupCode();
    secure.set(GROUP_CODE_KEY, legacyCode);

    const active = await loadActiveSyncGroup();
    expect(active).not.toBeNull();
    expect(active?.isStrong).toBe(false);
    expect(active?.code).toBe(legacyCode);
    expect(active?.keys.publicKey).toBeDefined();
  });

  it("retorna null quando nenhum grupo existe no boot", async () => {
    const active = await loadActiveSyncGroup();
    expect(active).toBeNull();
  });
});

describe("Story 4.3: Limpeza total ao sair do grupo", () => {
  it("remove segredo forte e código legado de todos os armazenamentos", async () => {
    const strongGroup = await createStrongSyncGroup();
    secure.set(GROUP_CODE_KEY, "OLD123");
    legacy.set(GROUP_CODE_KEY, "OLD123");

    expect(secure.get(STRONG_GROUP_SECRET_KEY)).toBe(strongGroup.code);

    await clearAllSyncGroupSecrets();

    expect(secure.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(secure.has(GROUP_CODE_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });
});

describe("Story 4.3: resolveJoinSyncGroup", () => {
  it("aceita e persiste segredo forte válido", async () => {
    // Segredo forte válido de 79 caracteres
    const strongGroup = await createStrongSyncGroup();
    secure.clear();
    legacy.clear();

    const resolved = await resolveJoinSyncGroup(strongGroup.code);
    expect(resolved.isStrong).toBe(true);
    expect(resolved.code).toBe(strongGroup.code);
    expect(secure.get(STRONG_GROUP_SECRET_KEY)).toBe(strongGroup.code);
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });

  it("rejeita segredo 'DOMUS...' corrompido e NÃO grava em AsyncStorage nem como grupo legado", async () => {
    // Código começando com DOMUS mas com checksum inválido
    const corrupted = "DOMUS1-AAAQ-EAYE-AUDA-OCAJ-BIFQ-YDIO-B4IB-CEQT-CQKR-MFYY-DENB-WHA5-DYPS-NINV-XX";

    await expect(resolveJoinSyncGroup(corrupted)).rejects.toThrow("Segredo de grupo inválido.");
    expect(secure.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(legacy.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });

  it("aceita código legado válido e o persiste em armazenamento legado", async () => {
    const legacyCode = "ABC234";

    const resolved = await resolveJoinSyncGroup(legacyCode);
    expect(resolved.isStrong).toBe(false);
    expect(resolved.code).toBe("ABC234");
    expect(secure.get(GROUP_CODE_KEY)).toBe("ABC234");
    expect(secure.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
  });

  it("rejeita string vazia ou apenas espaços", async () => {
    await expect(resolveJoinSyncGroup("")).rejects.toThrow("Código de grupo vazio.");
    await expect(resolveJoinSyncGroup("   ")).rejects.toThrow("Código de grupo vazio.");
  });
});

describe("Story 4.3: Interface app/sync.tsx e conformidade", () => {
  const syncScreenSource = readFileSync(
    path.resolve(__dirname, "../../../app/sync.tsx"),
    "utf8",
  );

  it("exibe badge de grupo seguro na tela", () => {
    expect(syncScreenSource).toContain("Grupo seguro");
  });

  it("copia via expo-clipboard e não usa Share.share para o segredo", () => {
    expect(syncScreenSource).toContain("expo-clipboard");
    expect(syncScreenSource).toContain("Clipboard.setStringAsync");
    expect(syncScreenSource).not.toContain("Share.share");
  });

  it("gera o QR Code diretamente com o texto do Grupo forte quando ativo", () => {
    expect(syncScreenSource).toContain("isStrongGroup ? groupId : `domus://${groupId}`");
  });

  it("não usa alertas nativos (Alert.alert, window.alert, confirm)", () => {
    expect(syncScreenSource).not.toContain("Alert.alert");
    expect(syncScreenSource).not.toContain("window.alert");
    expect(syncScreenSource).not.toContain("window.confirm");
  });

  it("preserva exatamente 1 ScrollView no modal de QR (Story 13.2)", () => {
    const modalMatch = syncScreenSource.match(/<Modal[\s\S]*?<\/Modal>/g);
    expect(modalMatch).not.toBeNull();
    const qrModal = modalMatch?.[0] ?? "";
    const scrollCount = (qrModal.match(/<ScrollView/g) || []).length;
    expect(scrollCount).toBe(1);
    expect(qrModal).not.toContain("<TextInput");
    expect(qrModal).not.toContain("<TInput");
  });

  it("trata falha de cópia para área de transferência com appAlert e feedback amigável (Matriz Linha 4)", () => {
    expect(syncScreenSource).toContain("appAlert(\"Aviso\", \"Não foi possível copiar para a área de transferência.\")");
    expect(syncScreenSource).toContain("if (!ok) throw new Error");
  });

  it("limpa o timeout de cópia no desmonte do componente", () => {
    expect(syncScreenSource).toContain("clearTimeout(copyTimeoutRef.current)");
  });

  it("atribui accessibilityRole='button' aos pressables de QR e cópia", () => {
    expect(syncScreenSource).toContain('accessibilityRole="button"');
  });
});

describe("Story 4.3: useSyncEngine e tratamento de falhas (Matriz)", () => {
  const engineSource = readFileSync(
    path.resolve(__dirname, "../useSyncEngine.ts"),
    "utf8",
  );

  it("testa conexão com relays antes de criar grupo e não grava segredo se relays falharem (Matriz Linha 2)", () => {
    // Verifica que o teste de relay ocorre antes de createStrongSyncGroup
    const relayCheckIdx = engineSource.indexOf("testRelayConnection()");
    const createStrongIdx = engineSource.indexOf("createStrongSyncGroup()");
    expect(relayCheckIdx).toBeGreaterThan(0);
    expect(createStrongIdx).toBeGreaterThan(relayCheckIdx);

    // Verifica que define erro amigável se connected for vazio
    expect(engineSource).toContain("Nenhum relay acessível. Verifique sua conexão com a internet.");
  });

  it("limpa segredos de ambos os formatos ao executar leaveGroup (Matriz Linha 6)", () => {
    expect(engineSource).toContain("clearAllSyncGroupSecrets()");
  });
});

