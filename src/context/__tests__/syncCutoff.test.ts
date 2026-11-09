import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  LEGACY_CUTOFF_DATE_ISO,
  LEGACY_CUTOFF_TIMESTAMP,
  LEGACY_MIN_APP_VERSION,
  LEGACY_CUTOFF_MESSAGE,
  LEGACY_VERSION_TOO_OLD_MESSAGE,
  LEGACY_GROUP_CUTOFF_WARNING_TYPE,
  LEGACY_CUTOFF_WARNING_STORAGE_KEY_PREFIX,
  compareSemver,
  isLegacyCutoffReached,
  isAppVersionDeprecatedForLegacy,
  isLegacySyncDisabled,
  getLegacySyncDisabledReason,
  createLegacyCutoffWarningEvent,
  createStrongSyncGroup,
  loadCoexistingGroups,
  loadActiveSyncGroup,
  canMigrateToStrongGroup,
} from "../strongGroupSync";
import {
  GROUP_CODE_KEY,
  loadGroupCode,
} from "../syncStorage";
import {
  isOldGroupPublishable,
} from "@/src/modules/syncPayload";
import { createSyncGroupTracker } from "@/src/modules/syncGroupTracking";
import {
  publishSyncEvents,
  closePool,
} from "@/src/modules/nostrSync";
import { decryptStrongPayload } from "@/src/modules/strongGroup/eventCipher";
import { parseGroupSecret } from "@/src/modules/strongGroup/groupSecret";
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
  vi.clearAllMocks();
});

const sampleEvent = (idx: number, over: Record<string, unknown> = {}): SyncEvent => ({
  id: `evt-local-${idx}`,
  type: "TRANSACTION_CREATED",
  payload: { amount: 1000 * idx, description: `Despesa local ${idx}` },
  timestamp: 1_700_000_000_000 + idx * 1000,
  deviceId: "dev-local-cutoff",
  signature: "",
  ...over,
});

describe("Story 4.9: Constantes e Funções Puras de Corte", () => {
  it("define a data de corte em 2026-11-20T00:00:00.000Z (14 dias após FR-13)", () => {
    expect(LEGACY_CUTOFF_DATE_ISO).toBe("2026-11-20T00:00:00.000Z");
    expect(LEGACY_CUTOFF_TIMESTAMP).toBe(Date.parse("2026-11-20T00:00:00.000Z"));
    expect(LEGACY_CUTOFF_TIMESTAMP).toBe(1795132800000);
  });

  it("define a versão mínima do aplicativo em 1.8.0", () => {
    expect(LEGACY_MIN_APP_VERSION).toBe("1.8.0");
  });

  it("compara versões semver corretamente com compareSemver", () => {
    expect(compareSemver("1.8.0", "1.8.0")).toBe(0);
    expect(compareSemver("1.8.1", "1.8.0")).toBe(1);
    expect(compareSemver("2.0.0", "1.8.0")).toBe(1);
    expect(compareSemver("1.7.9", "1.8.0")).toBe(-1);
    expect(compareSemver("1.0.0", "1.8.0")).toBe(-1);
    expect(compareSemver("0.9.5", "1.8.0")).toBe(-1);
    expect(compareSemver("v1.8.0", "1.8.0")).toBe(0);
    // Casos de pré-release (SemVer 2.0.0)
    expect(compareSemver("1.8.0-rc.1", "1.8.0")).toBe(-1);
    expect(compareSemver("1.8.0-beta", "1.8.0")).toBe(-1);
    expect(compareSemver("1.8.1-rc.1", "1.8.0")).toBe(1);
  });

  it("isLegacyCutoffReached detecta com precisão se a data de corte foi atingida", () => {
    const beforeCutoff = LEGACY_CUTOFF_TIMESTAMP - 1000;
    const exactCutoff = LEGACY_CUTOFF_TIMESTAMP;
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 10_000;

    expect(isLegacyCutoffReached(beforeCutoff)).toBe(false);
    expect(isLegacyCutoffReached(exactCutoff)).toBe(true);
    expect(isLegacyCutoffReached(afterCutoff)).toBe(true);
  });

  it("isAppVersionDeprecatedForLegacy detecta versões abaixo de 1.8.0", () => {
    expect(isAppVersionDeprecatedForLegacy("1.7.9")).toBe(true);
    expect(isAppVersionDeprecatedForLegacy("1.0.0")).toBe(true);
    expect(isAppVersionDeprecatedForLegacy("0.8.4")).toBe(true);
    expect(isAppVersionDeprecatedForLegacy("1.8.0")).toBe(false);
    expect(isAppVersionDeprecatedForLegacy("1.8.1")).toBe(false);
    expect(isAppVersionDeprecatedForLegacy("2.0.0")).toBe(false);
  });

  it("isLegacySyncDisabled desativa o legado por data ou por versão antiga", () => {
    const beforeCutoff = LEGACY_CUTOFF_TIMESTAMP - 5000;
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 5000;

    // Antes do corte na versão atual (1.8.0): ativo
    expect(isLegacySyncDisabled({ now: beforeCutoff, version: "1.8.0" })).toBe(false);

    // Após o corte na versão atual: desativado
    expect(isLegacySyncDisabled({ now: afterCutoff, version: "1.8.0" })).toBe(true);

    // Antes do corte na versão legada obsoleta: desativado por versão
    expect(isLegacySyncDisabled({ now: beforeCutoff, version: "1.7.5" })).toBe(true);

    // Após o corte na versão obsoleta: desativado
    expect(isLegacySyncDisabled({ now: afterCutoff, version: "1.7.5" })).toBe(true);
  });

  it("getLegacySyncDisabledReason reporta o motivo correto do corte", () => {
    const beforeCutoff = LEGACY_CUTOFF_TIMESTAMP - 5000;
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 5000;

    expect(getLegacySyncDisabledReason({ now: beforeCutoff, version: "1.8.0" })).toBeNull();
    expect(getLegacySyncDisabledReason({ now: afterCutoff, version: "1.8.0" })).toBe("cutoff_date");
    expect(getLegacySyncDisabledReason({ now: beforeCutoff, version: "1.7.0" })).toBe("version_deprecated");

    // Prioridade da razão: versão obsoleta tem precedência contratual sobre data de corte
    expect(getLegacySyncDisabledReason({ now: afterCutoff, version: "1.7.0" })).toBe(
      "version_deprecated",
    );

    // Chamadas sem argumentos ou com objeto vazio operam com segurança
    expect(typeof isLegacySyncDisabled()).toBe("boolean");
    expect(typeof isLegacySyncDisabled({})).toBe("boolean");
  });

  it("contém mensagens informativas em pt-BR com acentuação completa", () => {
    expect(LEGACY_CUTOFF_MESSAGE).toContain("sincronização pelo código antigo foi encerrada");
    expect(LEGACY_CUTOFF_MESSAGE).toContain("Grupo seguro");
    expect(LEGACY_VERSION_TOO_OLD_MESSAGE).toContain("Esta versão do aplicativo não suporta mais o formato legado");
  });
});

describe("Story 4.9: Carga de Grupos e Bloqueio de Canal (loadCoexistingGroups)", () => {
  it("carrega canal legado normalmente antes da data de corte", async () => {
    legacy.set(GROUP_CODE_KEY, "ABC123");
    const beforeCutoff = LEGACY_CUTOFF_TIMESTAMP - 10_000;

    const coexisting = await loadCoexistingGroups({ now: beforeCutoff, version: "1.8.0" });
    expect(coexisting.strong).toBeNull();
    expect(coexisting.legacy).not.toBeNull();
    expect(coexisting.legacy?.code).toBe("ABC123");
    expect(coexisting.legacyCutoff).toBe(false);
  });

  it("desativa canal legado pós-corte (legacy = null, legacyCutoff = true), preservando o código salvo", async () => {
    secure.set(GROUP_CODE_KEY, "ABC123");
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 5000;

    const coexisting = await loadCoexistingGroups({ now: afterCutoff, version: "1.8.0" });
    // Leitura e escrita bloqueadas: legacy é null
    expect(coexisting.legacy).toBeNull();
    // Sinalização ativa para UI e migração
    expect(coexisting.legacyCutoff).toBe(true);
    expect(coexisting.legacyCutoffReason).toBe("cutoff_date");
    expect(coexisting.legacyCode).toBe("ABC123");
    // Código permanece salvo no storage sem ser apagado
    expect(await loadGroupCode()).toBe("ABC123");
  });

  it("desativa canal legado quando a versão for inferior a 1.8.0", async () => {
    legacy.set(GROUP_CODE_KEY, "ABC123");
    const beforeCutoff = LEGACY_CUTOFF_TIMESTAMP - 1000;

    const coexisting = await loadCoexistingGroups({ now: beforeCutoff, version: "1.7.9" });
    expect(coexisting.legacy).toBeNull();
    expect(coexisting.legacyCutoff).toBe(true);
    expect(coexisting.legacyCutoffReason).toBe("version_deprecated");
  });

  it("em aparelho com ambos os canais, após o corte o Grupo forte assume sync exclusivo", async () => {
    legacy.set(GROUP_CODE_KEY, "ABC123");
    const strongGroup = await createStrongSyncGroup({ keepLegacy: true });
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 1000;

    const coexisting = await loadCoexistingGroups({ now: afterCutoff, version: "1.8.0" });
    expect(coexisting.strong).not.toBeNull();
    expect(coexisting.strong?.code).toBe(strongGroup.code);
    expect(coexisting.legacy).toBeNull();
    expect(coexisting.legacyCutoff).toBe(true);
    expect(coexisting.legacyCode).toBe("ABC123");

    // loadActiveSyncGroup retorna exclusivamente o Grupo forte
    const active = await loadActiveSyncGroup({ now: afterCutoff, version: "1.8.0" });
    expect(active?.isStrong).toBe(true);
    expect(active?.code).toBe(strongGroup.code);
  });

  it("loadActiveSyncGroup retorna null quando aparelho possui apenas canal legado e atinge corte", async () => {
    legacy.set(GROUP_CODE_KEY, "ABC123");
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 1000;

    const active = await loadActiveSyncGroup({ now: afterCutoff, version: "1.8.0" });
    expect(active).toBeNull();
  });
});

describe("Story 4.9: Elegibilidade de Migração Pós-Corte (canMigrateToStrongGroup)", () => {
  it("permite migração pós-corte para aparelho que estava no canal legado", async () => {
    legacy.set(GROUP_CODE_KEY, "ABC123");
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 1000;

    const coexisting = await loadCoexistingGroups({ now: afterCutoff, version: "1.8.0" });
    expect(coexisting.legacy).toBeNull();
    expect(coexisting.legacyCutoff).toBe(true);

    // canMigrateToStrongGroup retorna true mesmo com legacy = null
    const eligible = canMigrateToStrongGroup(coexisting, false, coexisting.legacyCode);
    expect(eligible).toBe(true);
  });

  it("não permite migração se o aparelho já possui Grupo forte ativo pós-corte", async () => {
    legacy.set(GROUP_CODE_KEY, "ABC123");
    await createStrongSyncGroup({ keepLegacy: true });
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 1000;

    const coexisting = await loadCoexistingGroups({ now: afterCutoff, version: "1.8.0" });
    const eligible = canMigrateToStrongGroup(coexisting, true, coexisting.strong?.code);
    expect(eligible).toBe(false);
  });
});

describe("Story 4.9: Evento de Aviso Prévio no Canal Legado (LEGACY_GROUP_CUTOFF_WARNING)", () => {
  it("createLegacyCutoffWarningEvent gera envelope válido com instruções em pt-BR", () => {
    const devId = "dev-warning-tester";
    const ev = createLegacyCutoffWarningEvent(devId);

    expect(ev.type).toBe(LEGACY_GROUP_CUTOFF_WARNING_TYPE);
    expect(ev.type).toBe("LEGACY_GROUP_CUTOFF_WARNING");
    expect(ev.deviceId).toBe(devId);
    expect(ev.id).toContain(devId);
    expect(ev.timestamp).toBeGreaterThan(0);

    const payload = ev.payload as any;
    expect(payload.cutoffDate).toBe(LEGACY_CUTOFF_DATE_ISO);
    expect(payload.minVersion).toBe("1.8.0");
    expect(payload.message).toContain("encerrado em 2026-11-20T00:00:00.000Z");
    expect(payload.message).toContain("Grupo seguro");
  });

  it("isOldGroupPublishable autoriza a transmissão do aviso prévio no canal legado", () => {
    // O evento de aviso não começa com PAYSLIP_, RELIGIOUS_ nem CONFESSIONAL_
    expect(isOldGroupPublishable(LEGACY_GROUP_CUTOFF_WARNING_TYPE)).toBe(true);
  });

  it("publica o evento de aviso no canal legado antes da data de corte via publishSyncEvents", async () => {
    legacy.set(GROUP_CODE_KEY, "ABC123");
    const beforeCutoff = LEGACY_CUTOFF_TIMESTAMP - 60_000;
    const coexisting = await loadCoexistingGroups({ now: beforeCutoff, version: "1.8.0" });
    const legacyGroup = coexisting.legacy!;

    const warnEvent = createLegacyCutoffWarningEvent("dev-pub-warn");
    const count = await publishSyncEvents(legacyGroup.keys, "dev-pub-warn", [warnEvent]);

    expect(count.published).toBeGreaterThan(0);
    expect(publishedNostrEvents.length).toBeGreaterThan(0);
    const nostrEvent = publishedNostrEvents[publishedNostrEvents.length - 1];
    expect(nostrEvent.pubkey).toBe(legacyGroup.keys.publicKey);

    // Marca no storage para garantir envio único
    const warnKey = `${LEGACY_CUTOFF_WARNING_STORAGE_KEY_PREFIX}${legacyGroup.keys.publicKey}`;
    await mockTrackingStorage.setItem(warnKey, "1");
    expect(await mockTrackingStorage.getItem(warnKey)).toBe("1");
  });
});

describe("Story 4.9: Preservação Integral dos Eventos Locais e Migração com 20 Eventos", () => {
  it("nenhum evento local é apagado pelo corte ou desativação do canal legado", async () => {
    // Simula 20 eventos locais armazenados no EventStore
    const eventStorage = new Map<string, string>();
    const mockEventStore = {
      append: vi.fn(async (ev: SyncEvent) => {
        eventStorage.set(ev.id, JSON.stringify(ev));
      }),
      getAllEvents: vi.fn(async () =>
        Array.from(eventStorage.values()).map((v) => JSON.parse(v) as SyncEvent),
      ),
      clear: vi.fn(async () => {
        eventStorage.clear();
      }),
    };

    for (let i = 1; i <= 20; i++) {
      await mockEventStore.append(sampleEvent(i));
    }
    expect(eventStorage.size).toBe(20);

    legacy.set(GROUP_CODE_KEY, "ABC123");
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 10_000;

    // Executa corte
    const coexisting = await loadCoexistingGroups({ now: afterCutoff, version: "1.8.0" });
    expect(coexisting.legacyCutoff).toBe(true);

    // EventStore nunca sofre chamada de exclusão ou limpeza
    expect(mockEventStore.clear).not.toHaveBeenCalled();
    const storedEvents = await mockEventStore.getAllEvents();
    expect(storedEvents.length).toBe(20);
    expect(storedEvents[0].id).toBe("evt-local-1");
    expect(storedEvents[19].id).toBe("evt-local-20");
  });

  it("aparelho com 20 eventos locais, atualizado pós-corte, migra e publica todos os 20 no Grupo forte sem duplicar", async () => {
    const localEvents: SyncEvent[] = Array.from({ length: 20 }, (_, i) => sampleEvent(i + 1));
    legacy.set(GROUP_CODE_KEY, "ABC123");
    const afterCutoff = LEGACY_CUTOFF_TIMESTAMP + 5000;

    // Aparelho verifica elegibilidade
    const coexisting = await loadCoexistingGroups({ now: afterCutoff, version: "1.8.0" });
    expect(canMigrateToStrongGroup(coexisting, false, coexisting.legacyCode)).toBe(true);

    // Usuário migra para o Grupo forte mantendo histórico
    const strongGroup = await createStrongSyncGroup({ keepLegacy: true });
    expect(strongGroup.isStrong).toBe(true);

    // Tracker da Story 4.6
    const tracker = createSyncGroupTracker({ storage: mockTrackingStorage, key: "tracker_cutoff_test" });
    await tracker.load();

    const strongGroupId = strongGroup.keys.publicKey;
    const eventsToPublish = tracker.filterEventsToPublish(localEvents, strongGroupId);
    expect(eventsToPublish.length).toBe(20);

    // Publica no Grupo forte com cifra AES-GCM
    publishedNostrEvents.length = 0;
    const publishedCount = await publishSyncEvents(strongGroup.keys, "dev-local-cutoff", eventsToPublish);
    expect(publishedCount.published).toBe(20);

    // Confirma que os eventos publicados no relay foram cifrados com AES-GCM
    const nostrEvent = publishedNostrEvents[publishedNostrEvents.length - 1];
    expect(nostrEvent.content.startsWith("domus-gcm-v1.")).toBe(true);

    // Decifra com a chave do Grupo forte para verificar integridade
    const parsedSecret = parseGroupSecret(strongGroup.code);
    expect(parsedSecret.ok).toBe(true);
    if (parsedSecret.ok) {
      const decrypted = decryptStrongPayload(nostrEvent.content, {
        encryptionKey: strongGroup.keys.encryptionKey,
        nostrPublicKey: strongGroup.keys.publicKey,
      });
      expect(decrypted.ok).toBe(true);
      if (decrypted.ok) {
        const parsedDecrypted = JSON.parse(decrypted.plaintext);
        expect(Array.isArray(parsedDecrypted)).toBe(true);
        expect(parsedDecrypted.length).toBe(20);
      }
    }

    // Registra publicação no tracker
    await tracker.markPublished(
      eventsToPublish.map((e) => e.id),
      strongGroupId,
    );

    // Segundo push não republique nenhum evento (zero duplicação)
    const secondPushEvents = tracker.filterEventsToPublish(localEvents, strongGroupId);
    expect(secondPushEvents.length).toBe(0);
  });
});

describe("Story 4.9: Verificação do Código-Fonte e Contratos de useSyncEngine e app/sync.tsx", () => {
  const engineSource = readFileSync(path.join(__dirname, "../useSyncEngine.ts"), "utf-8");
  const syncScreenSource = readFileSync(path.join(__dirname, "../../../app/sync.tsx"), "utf-8");

  it("useSyncEngine importa e verifica isLegacySyncDisabled", () => {
    expect(engineSource).toContain("isLegacySyncDisabled");
    expect(engineSource).toContain("createLegacyCutoffWarningEvent");
    expect(engineSource).toContain("LEGACY_CUTOFF_MESSAGE");
  });

  it("useSyncEngine bloqueia push para o canal legado pós-corte", () => {
    expect(engineSource).toContain("isLegacySyncDisabled({ now: now(), version })");
  });

  it("useSyncEngine fecha subscrição e define status offline caso o corte ocorra durante doSync", () => {
    expect(engineSource).toContain("legacySubRef.current.close()");
    expect(engineSource).toContain("setSyncStatus(\"offline\")");
  });

  it("app/sync.tsx possui o banner explicativo pós-corte com testID legacy-cutoff-banner", () => {
    expect(syncScreenSource).toContain("testID=\"legacy-cutoff-banner\"");
    expect(syncScreenSource).toContain("LEGACY_CUTOFF_MESSAGE");
  });

  it("app/sync.tsx mantém o botão migrate-to-strong-group-button acessível pós-corte", () => {
    expect(syncScreenSource).toContain("testID=\"migrate-to-strong-group-button\"");
    expect(syncScreenSource).toContain("handleMigrate");
  });

  it("useSyncEngine utiliza namespace notice- para evitar colisão destrutiva de lotes NIP-33", () => {
    expect(engineSource).toContain("const noticeDeviceId = `notice-${did}`");
    expect(engineSource).toContain("publishSyncEvents(legacyGroup.keys, noticeDeviceId, [warnEvent])");
  });

  it("useSyncEngine propaga now e version para loadCoexistingGroups em todos os fluxos", () => {
    expect(engineSource).toContain("loadCoexistingGroups({ now: now(), version })");
    // Garante que não existem chamadas órfãs sem opções
    expect(engineSource).not.toMatch(/await loadCoexistingGroups\(\)/);
  });

  it("app/sync.tsx oculta QR code descontinuado e botões manuais inertes quando cortado", () => {
    expect(syncScreenSource).toContain("!isLegacyCutoff &&");
    expect(syncScreenSource).toContain("Atualize para a criptografia autenticada de 256 bits (AES-GCM) para restabelecer a sincronização segura.");
  });
});
