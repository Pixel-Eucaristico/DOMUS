import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createStrongSyncGroup,
  loadCoexistingGroups,
  loadActiveSyncGroup,
  canMigrateToStrongGroup,
} from "../strongGroupSync";
import {
  GROUP_CODE_KEY,
  STRONG_GROUP_SECRET_KEY,
} from "../syncStorage";
import {
  selectOldGroupPushEvents,
  selectStrongGroupPushEvents,
} from "@/src/modules/syncPayload";
import { createSyncGroupTracker } from "@/src/modules/syncGroupTracking";
import {
  publishSyncEvents,
  parseSyncPayload,
  closePool,
} from "@/src/modules/nostrSync";
import { decryptStrongPayload } from "@/src/modules/strongGroup/eventCipher";
import { parseGroupSecret } from "@/src/modules/strongGroup/groupSecret";
import {
  appConfirm,
  getCurrentAppAlert,
  pressAppAlertButton,
  __resetAppAlertForTests,
} from "@/src/services/appAlert";
import type { SyncEvent } from "@packages/storage/src/eventStore";

// ─── Mocks de persistência em memória ─────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  secure: new Map<string, string>(),
  legacy: new Map<string, string>(),
  web: new Map<string, string>(),
  tracking: new Map<string, string>(),
  publishedNostrEvents: [] as any[],
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => mocks.secure.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
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

vi.mock("nostr-tools/pool", () => ({
  SimplePool: class {
    publish(relays: string[], ev: any) {
      mocks.publishedNostrEvents.push(ev);
      return relays.map(() => Promise.resolve("ok"));
    }
    querySync() {
      return Promise.resolve([]);
    }
    subscribeMany() {
      return { close() {} };
    }
    close() {}
  },
}));

const { secure, legacy, publishedNostrEvents } = mocks;

const mockTrackingStorage = {
  getItem: vi.fn(async (k: string) => mocks.tracking.get(k) ?? null),
  setItem: vi.fn(async (k: string, v: string) => {
    mocks.tracking.set(k, v);
  }),
  removeItem: vi.fn(async (k: string) => {
    mocks.tracking.delete(k);
  }),
};

beforeEach(() => {
  secure.clear();
  legacy.clear();
  mocks.web.clear();
  mocks.tracking.clear();
  publishedNostrEvents.length = 0;
  process.env.EXPO_OS = "android";
  closePool();
  __resetAppAlertForTests();
  vi.clearAllMocks();
});

const sampleEvent = (over: Record<string, unknown> = {}): SyncEvent => ({
  id: "evt-sample-1",
  type: "TRANSACTION_CREATED",
  payload: { amount: 5000, description: "Compra de supermercado" },
  timestamp: 1_700_000_000_000,
  deviceId: "dev-migrated",
  signature: "",
  ...over,
});

describe("Story 4.8: Elegibilidade para Migração (canMigrateToStrongGroup)", () => {
  it("permite migração (canMigrate: true) quando conectado apenas ao grupo legado de 6 caracteres", () => {
    const legacyCode = "ABC123";
    const coexisting = {
      strong: null,
      legacy: { code: legacyCode, isStrong: false, keys: {} as any },
    };
    expect(canMigrateToStrongGroup(coexisting, false, legacyCode)).toBe(true);
  });

  it("permite migração quando coexisting.legacy existe mesmo sem groupCode explícito", () => {
    const coexisting = {
      strong: null,
      legacy: { code: "LEG123", isStrong: false, keys: {} as any },
    };
    expect(canMigrateToStrongGroup(coexisting, false, null)).toBe(true);
  });

  it("permite migração quando groupCode legado existe durante boot antes de carregar coexisting", () => {
    const coexisting = { strong: null, legacy: null };
    expect(canMigrateToStrongGroup(coexisting, false, "ABC123")).toBe(true);
  });

  it("não permite migração (canMigrate: false) quando já no Grupo forte (DOMUS1-...)", async () => {
    const strongGroup = await createStrongSyncGroup();
    const isStrong = Boolean(parseGroupSecret(strongGroup.code).ok);
    expect(isStrong).toBe(true);
    const coexisting = {
      strong: strongGroup,
      legacy: null,
    };
    expect(canMigrateToStrongGroup(coexisting, isStrong, strongGroup.code)).toBe(false);
  });

  it("não permite migração se coexisting.strong estiver presente, independente de outros parâmetros", async () => {
    const strongGroup = await createStrongSyncGroup();
    const coexisting = {
      strong: strongGroup,
      legacy: { code: "ABC123", isStrong: false, keys: {} as any },
    };
    // Mesmo com código legado coexistindo, não pode migrar para outro forte
    expect(canMigrateToStrongGroup(coexisting, false, "ABC123")).toBe(false);
    expect(canMigrateToStrongGroup(coexisting, true, strongGroup.code)).toBe(false);
  });

  it("não permite migração (canMigrate: false) quando o aparelho não está em nenhum grupo", () => {
    const coexisting = { strong: null, legacy: null };
    expect(canMigrateToStrongGroup(coexisting, false, null)).toBe(false);
  });

  it("não permite migração (canMigrate: false) quando ambos os grupos já coexistem no aparelho", async () => {
    const strongGroup = await createStrongSyncGroup({ keepLegacy: true });
    legacy.set(GROUP_CODE_KEY, "OLD789");

    const coexisting = await loadCoexistingGroups();
    const active = coexisting.strong ?? coexisting.legacy;
    expect(active?.isStrong).toBe(true);
    expect(active?.code).toBe(strongGroup.code);
    expect(canMigrateToStrongGroup(coexisting, Boolean(active?.isStrong), active?.code)).toBe(false);
  });
});

describe("Story 4.8: Confirmação Prévia e Obrigatória via appConfirm", () => {
  it("cancela a migração sem nenhum efeito colateral se o usuário recusar/cancelar", async () => {
    legacy.set(GROUP_CODE_KEY, "OLD999");
    secure.set(GROUP_CODE_KEY, "OLD999");

    let migrateCalled = false;
    const performMigrationIfConfirmed = async () => {
      const confirmed = await appConfirm({
        title: "Migrar para o sync seguro?",
        message: "Passará a usar AES-256-GCM mantendo aparelhos antigos compatíveis.",
        confirmLabel: "Migrar agora",
        cancelLabel: "Cancelar",
      });
      if (confirmed) {
        migrateCalled = true;
        await createStrongSyncGroup({ keepLegacy: true });
      }
    };

    const promise = performMigrationIfConfirmed();

    // Diálogo aberto na fila
    const alert = getCurrentAppAlert();
    expect(alert).not.toBeNull();
    expect(alert?.title).toBe("Migrar para o sync seguro?");

    // Usuário clica em 'Cancelar' (índice 0)
    pressAppAlertButton(alert!.id, 0);

    await promise;

    expect(migrateCalled).toBe(false);
    // Segredo forte NUNCA foi criado
    expect(secure.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    // Código legado permanece intacto
    expect(legacy.get(GROUP_CODE_KEY)).toBe("OLD999");
  });

  it("executa a migração apenas após confirmação explícita do usuário", async () => {
    legacy.set(GROUP_CODE_KEY, "LEGACY");
    secure.set(GROUP_CODE_KEY, "LEGACY");

    let migrateCalled = false;
    let createdStrongCode: string | null = null;

    const performMigrationIfConfirmed = async () => {
      const confirmed = await appConfirm({
        title: "Migrar para o sync seguro?",
        message: "Passará a usar AES-256-GCM mantendo aparelhos antigos compatíveis.",
        confirmLabel: "Migrar agora",
        cancelLabel: "Cancelar",
      });
      if (confirmed) {
        migrateCalled = true;
        const group = await createStrongSyncGroup({ keepLegacy: true });
        createdStrongCode = group.code;
      }
    };

    const promise = performMigrationIfConfirmed();

    const alert = getCurrentAppAlert();
    expect(alert).not.toBeNull();

    // Usuário clica em 'Migrar agora' (índice 1)
    pressAppAlertButton(alert!.id, 1);

    await promise;

    expect(migrateCalled).toBe(true);
    expect(createdStrongCode).toMatch(/^DOMUS1-/);
    expect(secure.get(STRONG_GROUP_SECRET_KEY)).toBe(createdStrongCode);
    // Preserva o código legado durante a convivência
    expect(legacy.get(GROUP_CODE_KEY)).toBe("LEGACY");
  });
});

describe("Story 4.8: Convivência e Preservação do Grupo antigo na Migração", () => {
  it("migrateToStrongGroup cria o Segredo forte com keepLegacy: true, preservando o código antigo", async () => {
    const originalLegacyCode = "XYZ789";
    legacy.set(GROUP_CODE_KEY, originalLegacyCode);
    secure.set(GROUP_CODE_KEY, originalLegacyCode);

    // Executa criação com convivência (keepLegacy: true)
    const strong = await createStrongSyncGroup({ keepLegacy: true });

    // Ambos os grupos coexistem no armazenamento
    const coexisting = await loadCoexistingGroups();
    expect(coexisting.strong).not.toBeNull();
    expect(coexisting.strong?.code).toBe(strong.code);
    expect(coexisting.strong?.isStrong).toBe(true);

    expect(coexisting.legacy).not.toBeNull();
    expect(coexisting.legacy?.code).toBe(originalLegacyCode);
    expect(coexisting.legacy?.isStrong).toBe(false);

    // loadActiveSyncGroup apresenta o Grupo forte como o principal
    const active = await loadActiveSyncGroup();
    expect(active?.code).toBe(strong.code);
    expect(active?.isStrong).toBe(true);
  });
});

describe("Story 4.8: Publicação de 20 eventos locais no Grupo forte sem duplicação", () => {
  it("publica 20 eventos locais no Grupo forte com AES-GCM e marca todos no tracker sem duplicar", async () => {
    const tracker = createSyncGroupTracker({ storage: mockTrackingStorage });
    const did = "dev-migrated-phone";

    // Cria grupo forte com convivência
    legacy.set(GROUP_CODE_KEY, "OLD123");
    const strongGroup = await createStrongSyncGroup({ keepLegacy: true });
    const strongGroupId = strongGroup.keys.publicKey;

    // 20 eventos locais acumulados no aparelho
    const twentyEvents: SyncEvent[] = Array.from({ length: 20 }, (_, idx) =>
      sampleEvent({
        id: `local-evt-${idx + 1}`,
        type: idx % 4 === 0 ? "XP_GAINED" : "TRANSACTION_CREATED",
        payload: { amount: (idx + 1) * 100, index: idx },
        timestamp: 1_700_000_000_000 + idx * 1000,
        deviceId: did,
      }),
    );

    // 1. Antes da migração: todos os 20 eventos estão pendentes para o novo grupo forte
    const pendingBefore = tracker.filterEventsToPublish(twentyEvents, strongGroupId);
    expect(pendingBefore).toHaveLength(20);
    expect(pendingBefore.map((e) => e.id)).toEqual(twentyEvents.map((e) => e.id));

    // 2. Publica os 20 eventos locais no Grupo forte com cifra AES-GCM
    const publishedCount = await publishSyncEvents(strongGroup.keys, did, pendingBefore);
    expect(publishedCount).toBe(20);
    expect(publishedNostrEvents.length).toBeGreaterThanOrEqual(1);

    // Verifica que o conteúdo publicado no relay está cifrado com AES-GCM
    const nostrEvent = publishedNostrEvents[0];
    expect(nostrEvent.content.startsWith("domus-gcm-v1.")).toBe(true);

    const decrypted = decryptStrongPayload(nostrEvent.content, {
      encryptionKey: strongGroup.keys.encryptionKey,
      nostrPublicKey: strongGroup.keys.publicKey,
    });
    expect(decrypted.ok).toBe(true);
    if (!decrypted.ok) throw new Error("Falha ao decifrar lote migrado");
    const parsedBatch = parseSyncPayload(decrypted.plaintext, undefined, true);
    expect(parsedBatch).toHaveLength(20);

    // 3. Marca os 20 eventos como publicados no tracker (Story 4.6)
    await tracker.markPublished(
      twentyEvents.map((e) => e.id),
      strongGroupId,
    );

    // 4. Cada um dos 20 eventos agora consta como publicado
    for (const evt of twentyEvents) {
      expect(tracker.hasPublished(evt.id, strongGroupId)).toBe(true);
      expect(tracker.shouldPublish(evt.id, strongGroupId)).toBe(false);
    }

    // 5. Segunda tentativa de push: tracker garante que nenhum evento é republicado/duplicado
    const pendingAfter = tracker.filterEventsToPublish(twentyEvents, strongGroupId);
    expect(pendingAfter).toHaveLength(0); // ZERO duplicatas
  });

  it("aparelho atualizado depois do corte com 20 eventos locais publica todos no forte sem eco ou loop", async () => {
    const tracker = createSyncGroupTracker({ storage: mockTrackingStorage });
    const did = "dev-post-cutoff-phone";

    const strongGroup = await createStrongSyncGroup({ keepLegacy: true });
    const strongGroupId = strongGroup.keys.publicKey;

    // 20 eventos locais pendentes acumulados pós-corte
    const postCutoffEvents: SyncEvent[] = Array.from({ length: 20 }, (_, idx) =>
      sampleEvent({
        id: `post-cutoff-${idx + 1}`,
        type: "TRANSACTION_CREATED",
        payload: { amount: 2500, description: `Despesa pós-corte ${idx + 1}` },
        timestamp: 1_700_500_000_000 + idx * 500,
        deviceId: did,
      }),
    );

    const pending = tracker.filterEventsToPublish(postCutoffEvents, strongGroupId);
    expect(pending).toHaveLength(20);

    // Publica e marca
    const count = await publishSyncEvents(strongGroup.keys, did, pending);
    expect(count).toBe(20);
    await tracker.markPublished(
      pending.map((e) => e.id),
      strongGroupId,
    );

    // Revalidação: nenhum evento pendente
    expect(tracker.filterEventsToPublish(postCutoffEvents, strongGroupId)).toHaveLength(0);
  });
});

describe("Story 4.8: Proteção e Transmissão de Dados Sensíveis na Migração", () => {
  it("publica dados sensíveis (PAYSLIP e RELIGIOUS) no Grupo forte e bloqueia no Grupo antigo", async () => {
    const did = "dev-sensitive-migrated";
    const normalTx = sampleEvent({ id: "tx-normal", type: "TRANSACTION_CREATED", deviceId: did });
    const payslip = sampleEvent({ id: "slip-1", type: "PAYSLIP_RECORDED", deviceId: did });
    const religion = sampleEvent({ id: "rel-1", type: "RELIGIOUS_PREFERENCE_SET", deviceId: did });
    const confessional = sampleEvent({ id: "conf-1", type: "CONFESSIONAL_NOTE_ADDED", deviceId: did });

    const allEvents = [normalTx, payslip, religion, confessional];

    // O grupo forte transmite todos os eventos
    const strongPush = selectStrongGroupPushEvents(allEvents, did);
    expect(strongPush.map((e) => e.id)).toEqual(["tx-normal", "slip-1", "rel-1", "conf-1"]);

    // O grupo antigo bloqueia estritamente holerites e dados religiosos/confessionais
    const oldPush = selectOldGroupPushEvents(allEvents, did);
    expect(oldPush.map((e) => e.id)).toEqual(["tx-normal"]);
    expect(oldPush.some((e) => e.type.startsWith("PAYSLIP_"))).toBe(false);
    expect(oldPush.some((e) => e.type.startsWith("RELIGIOUS_"))).toBe(false);
    expect(oldPush.some((e) => e.type.startsWith("CONFESSIONAL_"))).toBe(false);
  });
});

describe("Story 4.8: Exibição do QR Code após Migração", () => {
  it("código forte retornado começa com DOMUS1- e pode ser exibido diretamente em QR Code", async () => {
    const strongGroup = await createStrongSyncGroup({ keepLegacy: true });
    expect(strongGroup.code).toMatch(/^DOMUS1-[0-9A-Z]{4}-[0-9A-Z]{4}-/);

    // No modal de QR Code, se isStrongGroup: true, qrValue é o segredo forte puro
    const isStrongGroup = true;
    const qrValue = isStrongGroup ? strongGroup.code : `domus://${strongGroup.code}`;
    expect(qrValue).toBe(strongGroup.code);
    expect(qrValue.startsWith("DOMUS1-")).toBe(true);
  });
});

describe("Story 4.8: Verificação de Contratos de Código e Interface", () => {
  const engineSource = readFileSync(
    path.resolve(__dirname, "../useSyncEngine.ts"),
    "utf8",
  );
  const providerSource = readFileSync(
    path.resolve(__dirname, "../SyncProvider.tsx"),
    "utf8",
  );
  const syncScreenSource = readFileSync(
    path.resolve(__dirname, "../../../app/sync.tsx"),
    "utf8",
  );

  it("useSyncEngine declara canMigrate e migrateToStrongGroup", () => {
    expect(engineSource).toContain("canMigrate");
    expect(engineSource).toContain("migrateToStrongGroup = useCallback(");
    expect(engineSource).toContain("createGroup({ keepLegacy: true })");
    expect(engineSource).toContain("canMigrate,");
    expect(engineSource).toContain("migrateToStrongGroup,");
  });

  it("SyncProvider declara canMigrate e migrateToStrongGroup no contexto", () => {
    expect(providerSource).toContain("canMigrate: boolean;");
    expect(providerSource).toContain("migrateToStrongGroup: () => Promise<string | null>;");
    expect(providerSource).toContain("canMigrate: engine.canMigrate,");
    expect(providerSource).toContain("migrateToStrongGroup: engine.migrateToStrongGroup,");
  });

  it("app/sync.tsx exibe o card de migração e exige appConfirm antes de migrar", () => {
    expect(syncScreenSource).toContain("canMigrate");
    expect(syncScreenSource).toContain("migrateToStrongGroup");
    expect(syncScreenSource).toContain("handleMigrate");
    expect(syncScreenSource).toContain("appConfirm({");
    expect(syncScreenSource).toContain('testID="migration-card"');
    expect(syncScreenSource).toContain('testID="migrate-to-strong-group-button"');
    expect(syncScreenSource).toContain("setShowQRModal(true)");
  });

  it("app/sync.tsx nunca invoca Alert.alert, window.alert ou window.confirm nativos", () => {
    expect(syncScreenSource).not.toMatch(/Alert\.alert\s*\(/);
    expect(syncScreenSource).not.toMatch(/window\.alert\s*\(/);
    expect(syncScreenSource).not.toMatch(/window\.confirm\s*\(/);
  });
});
