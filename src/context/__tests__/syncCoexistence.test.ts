import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createStrongSyncGroup,
  loadCoexistingGroups,
  loadActiveSyncGroup,
  resolveJoinSyncGroup,
  clearAllSyncGroupSecrets,
} from "../strongGroupSync";
import {
  GROUP_CODE_KEY,
  STRONG_GROUP_SECRET_KEY,
  generateGroupCode,
} from "../syncStorage";
import {
  OLD_GROUP_EXCLUDED_PREFIXES,
  isOldGroupPublishable,
  selectOldGroupPushEvents,
  selectStrongGroupPushEvents,
  selectEventsToImport,
} from "@/src/modules/syncPayload";
import { createSyncGroupTracker } from "@/src/modules/syncGroupTracking";
import type { SyncEvent } from "@packages/storage/src/eventStore";

// ─── Mocks de persistência em memória ─────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  secure: new Map<string, string>(),
  legacy: new Map<string, string>(),
  web: new Map<string, string>(),
  tracking: new Map<string, string>(),
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

const { secure, legacy, web } = mocks;

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
  web.clear();
  mocks.tracking.clear();
  process.env.EXPO_OS = "android";
  vi.clearAllMocks();
});

const sampleEvent = (over: Record<string, unknown> = {}): SyncEvent => ({
  id: "evt-sample-1",
  type: "TRANSACTION_CREATED",
  payload: { amount: 5000, description: "Almoço" },
  timestamp: 1_700_000_000_000,
  deviceId: "dev-phone",
  signature: "",
  ...over,
});

describe("Story 4.7: Carga e Convivência de Grupos (loadCoexistingGroups)", () => {
  it("carrega ambos os canais quando o Grupo forte e o Grupo antigo estão configurados", async () => {
    const strongGroup = await createStrongSyncGroup({ keepLegacy: true });
    secure.set(GROUP_CODE_KEY, "OLD789");
    legacy.set(GROUP_CODE_KEY, "OLD789");

    const coexisting = await loadCoexistingGroups();
    expect(coexisting.strong).not.toBeNull();
    expect(coexisting.strong?.isStrong).toBe(true);
    expect(coexisting.strong?.code).toBe(strongGroup.code);
    expect(coexisting.legacy).not.toBeNull();
    expect(coexisting.legacy?.isStrong).toBe(false);
    expect(coexisting.legacy?.code).toBe("OLD789");

    // loadActiveSyncGroup continua priorizando o Grupo forte para apresentação na UI
    const active = await loadActiveSyncGroup();
    expect(active?.code).toBe(strongGroup.code);
    expect(active?.isStrong).toBe(true);
  });

  it("carrega apenas o Grupo forte quando não há código legado", async () => {
    const strongGroup = await createStrongSyncGroup();

    const coexisting = await loadCoexistingGroups();
    expect(coexisting.strong).not.toBeNull();
    expect(coexisting.strong?.code).toBe(strongGroup.code);
    expect(coexisting.legacy).toBeNull();

    const active = await loadActiveSyncGroup();
    expect(active?.code).toBe(strongGroup.code);
  });

  it("carrega apenas o Grupo antigo quando não há segredo forte", async () => {
    const legacyCode = generateGroupCode();
    secure.set(GROUP_CODE_KEY, legacyCode);

    const coexisting = await loadCoexistingGroups();
    expect(coexisting.strong).toBeNull();
    expect(coexisting.legacy).not.toBeNull();
    expect(coexisting.legacy?.code).toBe(legacyCode);

    const active = await loadActiveSyncGroup();
    expect(active?.code).toBe(legacyCode);
    expect(active?.isStrong).toBe(false);
  });

  it("retorna { strong: null, legacy: null } quando nenhum grupo está configurado", async () => {
    const coexisting = await loadCoexistingGroups();
    expect(coexisting.strong).toBeNull();
    expect(coexisting.legacy).toBeNull();

    const active = await loadActiveSyncGroup();
    expect(active).toBeNull();
  });
});

describe("Story 4.7: Preservação do Grupo antigo (keepLegacy)", () => {
  it("createStrongSyncGroup com keepLegacy: true preserva o código legado existente", async () => {
    secure.set(GROUP_CODE_KEY, "OLD123");
    legacy.set(GROUP_CODE_KEY, "OLD123");

    const strong = await createStrongSyncGroup({ keepLegacy: true });
    expect(strong.isStrong).toBe(true);
    expect(secure.get(GROUP_CODE_KEY)).toBe("OLD123");
    expect(legacy.get(GROUP_CODE_KEY)).toBe("OLD123");
    expect(secure.get(STRONG_GROUP_SECRET_KEY)).toBe(strong.code);
  });

  it("createStrongSyncGroup sem keepLegacy remove o código legado anterior", async () => {
    secure.set(GROUP_CODE_KEY, "OLD123");
    legacy.set(GROUP_CODE_KEY, "OLD123");

    const strong = await createStrongSyncGroup();
    expect(strong.isStrong).toBe(true);
    expect(secure.has(GROUP_CODE_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });

  it("resolveJoinSyncGroup com keepLegacy: true preserva o código legado existente", async () => {
    const tempGroup = await createStrongSyncGroup();
    secure.clear();
    legacy.clear();
    secure.set(GROUP_CODE_KEY, "OLD456");
    legacy.set(GROUP_CODE_KEY, "OLD456");

    const joined = await resolveJoinSyncGroup(tempGroup.code, { keepLegacy: true });
    expect(joined.isStrong).toBe(true);
    expect(secure.get(GROUP_CODE_KEY)).toBe("OLD456");
    expect(legacy.get(GROUP_CODE_KEY)).toBe("OLD456");
    expect(secure.get(STRONG_GROUP_SECRET_KEY)).toBe(joined.code);
  });

  it("resolveJoinSyncGroup sem keepLegacy remove o código legado anterior", async () => {
    const tempGroup = await createStrongSyncGroup();
    secure.clear();
    legacy.clear();
    secure.set(GROUP_CODE_KEY, "OLD456");
    legacy.set(GROUP_CODE_KEY, "OLD456");

    const joined = await resolveJoinSyncGroup(tempGroup.code);
    expect(joined.isStrong).toBe(true);
    expect(secure.has(GROUP_CODE_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);
  });
});

describe("Story 4.7: Isolamento estrito de dados sensíveis", () => {
  it("OLD_GROUP_EXCLUDED_PREFIXES inclui PAYSLIP_, RELIGIOUS_ e CONFESSIONAL_", () => {
    expect(OLD_GROUP_EXCLUDED_PREFIXES).toContain("PAYSLIP_");
    expect(OLD_GROUP_EXCLUDED_PREFIXES).toContain("RELIGIOUS_");
    expect(OLD_GROUP_EXCLUDED_PREFIXES).toContain("CONFESSIONAL_");
  });

  it("isOldGroupPublishable bloqueia estritamente tipos sensíveis no Grupo antigo", () => {
    expect(isOldGroupPublishable("PAYSLIP_RECORDED")).toBe(false);
    expect(isOldGroupPublishable("PAYSLIP_UPDATED")).toBe(false);
    expect(isOldGroupPublishable("RELIGIOUS_PREFERENCE_SET")).toBe(false);
    expect(isOldGroupPublishable("RELIGIOUS_AFFILIATION_UPDATED")).toBe(false);
    expect(isOldGroupPublishable("CONFESSIONAL_NOTE_ADDED")).toBe(false);
    expect(isOldGroupPublishable("CONFESSIONAL_ENTRY_DELETED")).toBe(false);

    // Tipos comuns continuam permitidos
    expect(isOldGroupPublishable("TRANSACTION_CREATED")).toBe(true);
    expect(isOldGroupPublishable("ACCOUNT_CREATED")).toBe(true);
    expect(isOldGroupPublishable("XP_GAINED")).toBe(true);
    expect(isOldGroupPublishable("CATEGORY_CUSTOMIZED")).toBe(true);
  });

  it("selectOldGroupPushEvents exclui eventos sensíveis ao preparar push para o Grupo antigo", () => {
    const events: SyncEvent[] = [
      sampleEvent({ id: "e1", type: "TRANSACTION_CREATED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e2", type: "PAYSLIP_RECORDED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e3", type: "RELIGIOUS_AFFILIATION_UPDATED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e4", type: "CONFESSIONAL_NOTE_ADDED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e5", type: "XP_GAINED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e6", type: "TRANSACTION_CREATED", deviceId: "dev-other" }),
    ];

    const oldGroupEvents = selectOldGroupPushEvents(events, "dev-phone");
    expect(oldGroupEvents.map((e) => e.id)).toEqual(["e1", "e5"]);
    expect(oldGroupEvents.some((e) => e.type.startsWith("PAYSLIP_"))).toBe(false);
    expect(oldGroupEvents.some((e) => e.type.startsWith("RELIGIOUS_"))).toBe(false);
    expect(oldGroupEvents.some((e) => e.type.startsWith("CONFESSIONAL_"))).toBe(false);
  });

  it("selectStrongGroupPushEvents transmite todos os eventos do dispositivo no Grupo forte", () => {
    const events: SyncEvent[] = [
      sampleEvent({ id: "e1", type: "TRANSACTION_CREATED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e2", type: "PAYSLIP_RECORDED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e3", type: "RELIGIOUS_AFFILIATION_UPDATED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e4", type: "CONFESSIONAL_NOTE_ADDED", deviceId: "dev-phone" }),
      sampleEvent({ id: "e5", type: "XP_GAINED", deviceId: "dev-phone" }),
    ];

    const strongGroupEvents = selectStrongGroupPushEvents(events, "dev-phone");
    expect(strongGroupEvents.map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4", "e5"]);
  });

  it("selectEventsToImport descarta dados sensíveis recebidos no Grupo antigo sem expor payload", () => {
    const warn = vi.fn();
    const sensitiveEvents: SyncEvent[] = [
      sampleEvent({ id: "e1", type: "TRANSACTION_CREATED" }),
      sampleEvent({
        id: "e2",
        type: "RELIGIOUS_AFFILIATION_UPDATED",
        payload: { faith: "SecretFaith", denomination: "Confidential" },
      }),
      sampleEvent({
        id: "e3",
        type: "CONFESSIONAL_NOTE_ADDED",
        payload: { confidentialNote: "MyPrivateNote" },
      }),
      sampleEvent({
        id: "e4",
        type: "PAYSLIP_RECORDED",
        payload: { grossSalary: 15000, company: "ConfidentialCorp" },
      }),
    ];

    const r = selectEventsToImport(sensitiveEvents, new Set(), warn, { isStrongGroup: false });
    expect(r.toAppend.map((e) => e.id)).toEqual(["e1"]);
    expect(r.excluded).toBe(3);

    const logged = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("id=e2 type=RELIGIOUS_AFFILIATION_UPDATED");
    expect(logged).toContain("id=e3 type=CONFESSIONAL_NOTE_ADDED");
    expect(logged).toContain("id=e4 type=PAYSLIP_RECORDED");
    expect(logged).not.toMatch(/SecretFaith|Confidential|MyPrivateNote|15000|ConfidentialCorp/);
  });

  it("selectEventsToImport aceita dados sensíveis recebidos do Grupo forte", () => {
    const warn = vi.fn();
    const sensitiveEvents: SyncEvent[] = [
      sampleEvent({ id: "e1", type: "TRANSACTION_CREATED" }),
      sampleEvent({ id: "e2", type: "RELIGIOUS_AFFILIATION_UPDATED", payload: { faith: "Faith" } }),
      sampleEvent({ id: "e3", type: "PAYSLIP_RECORDED", payload: { salary: 10000 } }),
    ];

    const r = selectEventsToImport(sensitiveEvents, new Set(), warn, { isStrongGroup: true });
    expect(r.toAppend.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
    expect(r.excluded).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Story 4.7: Prevenção de eco e fluxo de convivência entre Celular e Tablet", () => {
  it("cenário aceitação: celular publica gasto local para Grupo forte e Grupo antigo sem loops", async () => {
    const tracker = createSyncGroupTracker({ storage: mockTrackingStorage });
    const G_STRONG = "pubkey-strong-group-256";
    const G_OLD = "pubkey-legacy-group-xor";
    const didPhone = "dev-phone";

    const localExpense = sampleEvent({
      id: "evt-lunch",
      type: "TRANSACTION_CREATED",
      deviceId: didPhone,
    });

    // 1. Celular verifica envio para G_STRONG
    expect(tracker.shouldPublish(localExpense.id, G_STRONG)).toBe(true);
    const toPublishStrong = tracker.filterEventsToPublish([localExpense], G_STRONG);
    expect(toPublishStrong).toHaveLength(1);

    // Celular envia com sucesso para G_STRONG e marca
    await tracker.markPublished([localExpense.id], G_STRONG);
    expect(tracker.hasPublished(localExpense.id, G_STRONG)).toBe(true);
    expect(tracker.shouldPublish(localExpense.id, G_STRONG)).toBe(false);

    // 2. Celular verifica envio concomitante para G_OLD
    expect(tracker.shouldPublish(localExpense.id, G_OLD)).toBe(true);
    const toPublishOld = tracker.filterEventsToPublish([localExpense], G_OLD);
    expect(toPublishOld).toHaveLength(1);

    // Celular envia com sucesso para G_OLD e marca
    await tracker.markPublished([localExpense.id], G_OLD);
    expect(tracker.hasPublished(localExpense.id, G_OLD)).toBe(true);
    expect(tracker.shouldPublish(localExpense.id, G_OLD)).toBe(false);

    // Próximo ciclo: ambos os grupos estão zerados de pendências
    expect(tracker.filterEventsToPublish([localExpense], G_STRONG)).toHaveLength(0);
    expect(tracker.filterEventsToPublish([localExpense], G_OLD)).toHaveLength(0);
  });

  it("cenário aceitação: celular recebe gasto do tablet via Grupo antigo e NUNCA ecoa de volta", async () => {
    const tracker = createSyncGroupTracker({ storage: mockTrackingStorage });
    const G_OLD = "pubkey-legacy-group-xor";
    const didTablet = "dev-tablet-old";

    const tabletExpense = sampleEvent({
      id: "evt-tablet-coffee",
      type: "TRANSACTION_CREATED",
      deviceId: didTablet,
    });

    // Celular recebe evento do relay do Grupo antigo
    await tracker.markReceived([tabletExpense.id], G_OLD);

    // O rastreador deve registrar como recebido e proibir estritamente republicação
    expect(tracker.hasReceived(tabletExpense.id, G_OLD)).toBe(true);
    expect(tracker.shouldPublish(tabletExpense.id, G_OLD)).toBe(false);

    // filterEventsToPublish deve descartar imediatamente o evento recebido
    const pending = tracker.filterEventsToPublish([tabletExpense], G_OLD);
    expect(pending).toHaveLength(0);
  });

  it("cenário aceitação: celular recebe gasto do Grupo forte e NUNCA ecoa de volta no Grupo forte", async () => {
    const tracker = createSyncGroupTracker({ storage: mockTrackingStorage });
    const G_STRONG = "pubkey-strong-group-256";
    const remotePeer = "dev-laptop-strong";

    const remoteExpense = sampleEvent({
      id: "evt-strong-laptop",
      type: "TRANSACTION_CREATED",
      deviceId: remotePeer,
    });

    // Celular recebe evento do relay do Grupo forte
    await tracker.markReceived([remoteExpense.id], G_STRONG);

    expect(tracker.hasReceived(remoteExpense.id, G_STRONG)).toBe(true);
    expect(tracker.shouldPublish(remoteExpense.id, G_STRONG)).toBe(false);
    expect(tracker.filterEventsToPublish([remoteExpense], G_STRONG)).toHaveLength(0);
  });

  it("cenário aceitação: dado sensível criado no celular nunca é publicado no Grupo antigo", async () => {
    const didPhone = "dev-phone";
    const religiousEvent = sampleEvent({
      id: "evt-religious-1",
      type: "RELIGIOUS_AFFILIATION_UPDATED",
      deviceId: didPhone,
    });
    const payslipEvent = sampleEvent({
      id: "evt-payslip-1",
      type: "PAYSLIP_RECORDED",
      deviceId: didPhone,
    });

    const allLocalEvents = [religiousEvent, payslipEvent];

    // Para o Grupo forte: eventos sensíveis são selecionados
    const strongPush = selectStrongGroupPushEvents(allLocalEvents, didPhone);
    expect(strongPush.map((e) => e.id)).toEqual(["evt-religious-1", "evt-payslip-1"]);

    // Para o Grupo antigo: eventos sensíveis são estritamente excluídos
    const oldPush = selectOldGroupPushEvents(allLocalEvents, didPhone);
    expect(oldPush).toHaveLength(0);
  });
});

describe("Story 4.7: Desconexão e Limpeza Total (leaveGroup / clearAllSyncGroupSecrets)", () => {
  it("clearAllSyncGroupSecrets limpa tanto o segredo forte quanto o código legado", async () => {
    secure.set(STRONG_GROUP_SECRET_KEY, "DOMUS1-...");
    secure.set(GROUP_CODE_KEY, "OLD123");
    legacy.set(GROUP_CODE_KEY, "OLD123");

    await clearAllSyncGroupSecrets();

    expect(secure.has(STRONG_GROUP_SECRET_KEY)).toBe(false);
    expect(secure.has(GROUP_CODE_KEY)).toBe(false);
    expect(legacy.has(GROUP_CODE_KEY)).toBe(false);

    const coexisting = await loadCoexistingGroups();
    expect(coexisting.strong).toBeNull();
    expect(coexisting.legacy).toBeNull();
  });
});

describe("Story 4.7: Verificação do contrato de useSyncEngine", () => {
  const engineSource = readFileSync(
    path.resolve(__dirname, "../useSyncEngine.ts"),
    "utf8",
  );

  it("carrega grupos no boot usando loadCoexistingGroups", () => {
    expect(engineSource).toContain("loadCoexistingGroups(");
  });

  it("mantém subscrições e fechamentos para ambos os canais", () => {
    expect(engineSource).toContain("legacySubRef");
    expect(engineSource).toContain("legacySubRef.current.close()");
    expect(engineSource).toContain("subRef.current.close()");
  });

  it("seleciona eventos com selectStrongGroupPushEvents e selectOldGroupPushEvents", () => {
    expect(engineSource).toContain("selectStrongGroupPushEvents(allEventsRef.current, did)");
    expect(engineSource).toContain("selectOldGroupPushEvents(allEventsRef.current, did)");
  });

  it("limpa tracker de ambos os canais em leaveGroup", () => {
    expect(engineSource).toContain("previousStrongGroupId");
    expect(engineSource).toContain("previousLegacyGroupId");
    expect(engineSource).toContain("clearAllSyncGroupSecrets()");
  });

  it("suporta opções keepLegacy em createGroup e joinGroup", () => {
    expect(engineSource).toContain("createGroup = useCallback(async (options?: { keepLegacy?: boolean })");
    expect(engineSource).toContain("joinGroup = useCallback(");
    expect(engineSource).toContain("keepLegacy?: boolean");
  });

  it("pushToGroup e pushMyEvents utilizam processPushResult para tratar o desfecho do push", () => {
    expect(engineSource).toContain("processPushResult({ result, myEvents: eventsToPublish, currentHash: hash })");
    expect(engineSource).toContain("const eventsToPublish = group.isStrong ? pendingEvents : myEvents;");
    expect(engineSource).toContain("publishSyncEvents(group.keys, did, eventsToPublish)");
  });

  it("discrimina eventos do canal legado com isStrongGroup: false na importação", () => {
    expect(engineSource).toContain("legacyEventIdsRef");
    expect(engineSource).toContain("isStrongGroup: false");
  });

  it("leaveGroup limpa pullTimerRef e pushDebounceRef", () => {
    expect(engineSource).toContain("clearInterval(pullTimerRef.current)");
    expect(engineSource).toContain("clearTimeout(pushDebounceRef.current)");
  });

  it("createGroup e joinGroup preservam coordenador e subscrição quando keepLegacy é true", () => {
    expect(engineSource).toContain("if (!options?.keepLegacy)");
  });

  it("persiste hashes de envio por grupo no storage para evitar colisões", () => {
    expect(engineSource).toContain("GROUP_PUSH_HASHES_KEY");
  });
});
