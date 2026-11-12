import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import {
  createWebSecretStore,
  type KeyVault,
  type SecretStorage,
} from "@/src/modules/security/infrastructure/webSecretStore";
import {
  EVENTS_BACKUP_KEY,
  WEB_STORAGE_UNAVAILABLE_TITLE,
  WEB_STORAGE_UNAVAILABLE_MESSAGE,
  createWebEventLogStorage,
  loadWebEventLog,
  scheduleWebEventLogSave,
  saveWebEventLogImmediate,
  flushWebEventLogSave,
  _resetWebEventLogState,
} from "../webEventLogStorage";
import { appAlert } from "@/src/services/appAlert";

vi.mock("@/src/services/appAlert", () => ({
  appAlert: vi.fn(),
}));

const defaultStorageData = vi.hoisted(() => new Map<string, string>());
const defaultVaultState = vi.hoisted(() => ({
  key: null as CryptoKey | null,
  fails: false,
  noCrypto: false,
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => defaultStorageData.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      defaultStorageData.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      defaultStorageData.delete(k);
    }),
  },
}));

vi.mock("@/src/modules/security/infrastructure/webSecrets", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/modules/security/infrastructure/webSecretStore")
  >("@/src/modules/security/infrastructure/webSecretStore");

  // Delegamos para uma instância real de createWebSecretStore apoiada em defaultStorageData
  let storeInstance = actual.createWebSecretStore({
    vault: {
      load: async () => {
        if (defaultVaultState.fails) throw new Error("IndexedDB indisponível");
        return defaultVaultState.key;
      },
      save: async (k: CryptoKey) => {
        if (defaultVaultState.fails) throw new Error("IndexedDB indisponível");
        defaultVaultState.key = k;
      },
    },
    storage: {
      getItem: async (k) => defaultStorageData.get(k) ?? null,
      setItem: async (k, v) => {
        defaultStorageData.set(k, v);
      },
      removeItem: async (k) => {
        defaultStorageData.delete(k);
      },
    },
    getCrypto: () => (defaultVaultState.noCrypto ? undefined : globalThis.crypto),
  });

  return {
    webSecrets: {
      get: (k: string) => storeInstance.get(k),
      set: (k: string, v: string) => storeInstance.set(k, v),
      remove: (k: string) => storeInstance.remove(k),
      _recreate: () => {
        storeInstance = actual.createWebSecretStore({
          vault: {
            load: async () => {
              if (defaultVaultState.fails) throw new Error("IndexedDB indisponível");
              return defaultVaultState.key;
            },
            save: async (k: CryptoKey) => {
              if (defaultVaultState.fails) throw new Error("IndexedDB indisponível");
              defaultVaultState.key = k;
            },
          },
          storage: {
            getItem: async (k) => defaultStorageData.get(k) ?? null,
            setItem: async (k, v) => {
              defaultStorageData.set(k, v);
            },
            removeItem: async (k) => {
              defaultStorageData.delete(k);
            },
          },
          getCrypto: () => (defaultVaultState.noCrypto ? undefined : globalThis.crypto),
        });
      },
    },
  };
});

function makeEvent(index: number, description = `Compra item ${index}`): SyncEvent {
  return {
    id: `evt-${index}`,
    type: "TRANSACTION_CREATED",
    timestamp: 1_700_000_000_000 + index * 1000,
    deviceId: "dev-web-1",
    signature: `sig-${index}`,
    payload: {
      id: `tx-${index}`,
      amount: 42.5 + index,
      description,
      category: "Alimentação",
      type: "expense",
    },
  };
}

function createMemoryEnv(options?: {
  noCrypto?: boolean;
  vaultFails?: boolean;
  debounceMs?: number;
}) {
  const data = new Map<string, string>();
  const storage: SecretStorage & { data: Map<string, string> } = {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };

  let savedKey: CryptoKey | null = null;
  const vault: KeyVault = {
    load: async () => {
      if (options?.vaultFails) throw new Error("IndexedDB indisponível");
      return savedKey;
    },
    save: async (k) => {
      if (options?.vaultFails) throw new Error("IndexedDB indisponível");
      savedKey = k;
    },
  };

  const secrets = createWebSecretStore({
    vault,
    storage,
    getCrypto: () => (options?.noCrypto ? undefined : globalThis.crypto),
  });

  const alertSpy = vi.fn();
  const setSpy = vi.spyOn(secrets, "set");

  const logStorage = createWebEventLogStorage({
    secrets,
    storage,
    showAppAlert: alertSpy,
    debounceMs: options?.debounceMs ?? 15,
  });

  // Permite simular reabertura da aba (nova instância com mesmo storage e vault)
  const reopen = () => {
    const newSecrets = createWebSecretStore({
      vault,
      storage,
      getCrypto: () => (options?.noCrypto ? undefined : globalThis.crypto),
    });
    return createWebEventLogStorage({
      secrets: newSecrets,
      storage,
      showAppAlert: alertSpy,
      debounceMs: options?.debounceMs ?? 15,
    });
  };

  return { storage, vault, secrets, setSpy, alertSpy, logStorage, reopen };
}

beforeEach(async () => {
  defaultStorageData.clear();
  defaultVaultState.key = null;
  defaultVaultState.fails = false;
  defaultVaultState.noCrypto = false;
  _resetWebEventLogState();
  const { webSecrets } = await import("@/src/modules/security/infrastructure/webSecrets");
  (webSecrets as unknown as { _recreate: () => void })._recreate();
  vi.clearAllMocks();
});

describe("Story 6.4: Cifrar o log de eventos da web", () => {
  describe("Cifragem AES-GCM via webSecrets", () => {
    it("grava o log cifrado em AsyncStorage (v1:...) sem deixar nenhum dado financeiro em texto puro", async () => {
      const { storage, logStorage } = createMemoryEnv();
      const events = [
        makeEvent(1, "Supermercado Secreto"),
        makeEvent(2, "Salário Confidencial"),
      ];

      const ok = await logStorage.saveImmediate(events);
      expect(ok).toBe(true);

      const raw = storage.data.get(EVENTS_BACKUP_KEY);
      expect(raw).toBeDefined();
      expect(raw!.startsWith("v1:")).toBe(true);
      expect(raw).not.toContain("Supermercado Secreto");
      expect(raw).not.toContain("Salário Confidencial");
      expect(raw).not.toContain("TRANSACTION_CREATED");
      expect(raw).not.toContain("evt-1");
    });

    it("decifra e devolve todos os eventos ao reabrir o navegador (nova sessão com mesma chave no IndexedDB)", async () => {
      const { logStorage, reopen } = createMemoryEnv();
      const events = [makeEvent(1, "Padaria"), makeEvent(2, "Farmácia")];

      await logStorage.saveImmediate(events);

      const nextSession = reopen();
      const loaded = await nextSession.load();
      expect(loaded).toEqual(events);
    });
  });

  describe("Migração automática de log legado em texto puro", () => {
    it("migra log legado em texto puro na primeira abertura para a forma cifrada sem perder eventos", async () => {
      const { storage, logStorage, reopen, alertSpy } = createMemoryEnv();
      const legacyEvents = [
        makeEvent(1, "Gasto Antigo 1"),
        makeEvent(2, "Gasto Antigo 2"),
        makeEvent(3, "Gasto Antigo 3"),
      ];

      // Simula log pré-existente em texto puro no AsyncStorage antes da atualização
      storage.data.set(EVENTS_BACKUP_KEY, JSON.stringify(legacyEvents));
      expect(storage.data.get(EVENTS_BACKUP_KEY)!.startsWith("v1:")).toBe(false);

      // Primeira abertura lê e migra
      const loaded = await logStorage.load();
      expect(loaded).toEqual(legacyEvents);
      expect(alertSpy).not.toHaveBeenCalled();

      // O armazenamento local agora contém apenas o texto cifrado (v1:...)
      const migratedRaw = storage.data.get(EVENTS_BACKUP_KEY);
      expect(migratedRaw).toBeDefined();
      expect(migratedRaw!.startsWith("v1:")).toBe(true);
      expect(migratedRaw).not.toContain("Gasto Antigo 1");

      // Próxima abertura decifra normalmente o valor migrado
      const nextSession = reopen();
      expect(await nextSession.load()).toEqual(legacyEvents);
    });

    it("remove resíduo corrompido (JSON inválido ou não-array não cifrado) de AsyncStorage e devolve lista vazia", async () => {
      const { storage, logStorage } = createMemoryEnv();
      storage.data.set(EVENTS_BACKUP_KEY, "{json-corrompido-sem-fechar");

      expect(await logStorage.load()).toEqual([]);
      expect(storage.data.has(EVENTS_BACKUP_KEY)).toBe(false);

      // JSON válido mas não-array (objeto/número)
      storage.data.set(EVENTS_BACKUP_KEY, JSON.stringify({ naoEhArray: true }));
      expect(await logStorage.load()).toEqual([]);
      expect(storage.data.has(EVENTS_BACKUP_KEY)).toBe(false);
    });
  });

  describe("Gravação agrupada (debounce e coalescência)", () => {
    it("agrupa rajada de eventos em uma única chamada de cifragem com o estado mais recente", async () => {
      const { storage, setSpy, logStorage } = createMemoryEnv({ debounceMs: 25 });

      const acumulado: SyncEvent[] = [];
      const promises: Promise<boolean>[] = [];
      for (let i = 1; i <= 20; i++) {
        acumulado.push(makeEvent(i));
        promises.push(logStorage.scheduleSave([...acumulado]));
      }

      const results = await Promise.all(promises);
      expect(results.every((r) => r === true)).toBe(true);

      // Apenas 1 cifragem realizada para os 20 eventos em rajada
      expect(setSpy).toHaveBeenCalledTimes(1);

      const loaded = await logStorage.load();
      expect(loaded).toHaveLength(20);
      expect(loaded).toEqual(acumulado);
      expect(storage.data.get(EVENTS_BACKUP_KEY)!.startsWith("v1:")).toBe(true);
    });

    it("load() faz auto-flush de gravação agendada pendente antes de ler", async () => {
      const { logStorage } = createMemoryEnv({ debounceMs: 200 });
      const e1 = makeEvent(1, "Auto-flush");

      // Agenda mas chama load() imediatamente sem esperar 200ms nem chamar flush()
      void logStorage.scheduleSave([e1]);
      const loaded = await logStorage.load();
      expect(loaded).toEqual([e1]);
    });

    it("coalesce chamadas que chegam enquanto uma cifra já está em voo (inFlightPromise)", async () => {
      const { storage, setSpy, logStorage, reopen } = createMemoryEnv({ debounceMs: 10 });

      let releaseFirstSet: (() => void) | null = null;
      let setCallCount = 0;
      setSpy.mockImplementation(async (k, v) => {
        setCallCount += 1;
        if (setCallCount === 1) {
          await new Promise<void>((r) => {
            releaseFirstSet = r;
          });
        }
        await storage.setItem(k, `v1:mock-cipher:${v}`);
        return true;
      });

      const e1 = makeEvent(1, "Em voo 1");
      const e2 = makeEvent(2, "Em voo 2");
      const e3 = makeEvent(3, "Em voo 3");

      // Inicia primeira gravação imediata (fica retida em secrets.set)
      const p1 = logStorage.saveImmediate([e1]);
      await new Promise((r) => setTimeout(r, 5));
      expect(setCallCount).toBe(1);

      // Enquanto a primeira cifra está em voo, chegam duas atualizações seguidas
      const p2 = logStorage.saveImmediate([e1, e2]);
      const p3 = logStorage.saveImmediate([e1, e2, e3]);

      // Libera a primeira cifra
      releaseFirstSet!();
      const results = await Promise.all([p1, p2, p3]);
      expect(results).toEqual([true, true, true]);

      // p2 e p3 foram coalescidos em uma única segunda chamada a secrets.set com os 3 eventos
      expect(setCallCount).toBe(2);
      expect(setSpy).toHaveBeenLastCalledWith(
        EVENTS_BACKUP_KEY,
        JSON.stringify([e1, e2, e3])
      );
      expect(reopen).toBeDefined();
    });

    it("saveImmediate (restoreFromBackup / resetApp) cancela gravação agrupada pendente anterior", async () => {
      const { logStorage, reopen } = createMemoryEnv({ debounceMs: 50 });

      // Agenda gravação de 3 eventos com debounce de 50ms
      const pScheduled = logStorage.scheduleSave([
        makeEvent(1),
        makeEvent(2),
        makeEvent(3),
      ]);

      // Antes do timer disparar, resetApp / restoreFromBackup grava [] imediatamente
      const pImmediate = logStorage.saveImmediate([]);

      await Promise.all([pScheduled, pImmediate]);

      // Aguarda além da janela original de 50ms para garantir que o timer antigo não dispare depois
      await new Promise((r) => setTimeout(r, 70));

      const loaded = await reopen().load();
      expect(loaded).toEqual([]);
    });

    it("reset() aborta gravação em voo e resolve promises pendentes com false", async () => {
      const { logStorage } = createMemoryEnv({ debounceMs: 100 });
      const p = logStorage.scheduleSave([makeEvent(1)]);
      logStorage.reset();
      expect(await p).toBe(false);
    });
  });

  describe("Comportamento sem WebCrypto ou sem IndexedDB", () => {
    it("sem WebCrypto: não grava texto puro no AsyncStorage, mantém na memória da sessão e avisa uma única vez em pt-BR", async () => {
      const { storage, alertSpy, logStorage } = createMemoryEnv({ noCrypto: true });
      const events = [makeEvent(1, "Gasto em HTTP inseguro")];

      const ok1 = await logStorage.saveImmediate(events);
      expect(ok1).toBe(false);

      // Nenhum dado em texto puro no armazenamento do navegador
      expect(storage.data.has(EVENTS_BACKUP_KEY)).toBe(false);

      // Alerta exibido em pt-BR explicando que os dados não serão guardados neste navegador
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        WEB_STORAGE_UNAVAILABLE_TITLE,
        WEB_STORAGE_UNAVAILABLE_MESSAGE
      );
      expect(WEB_STORAGE_UNAVAILABLE_MESSAGE).toContain("não serão guardados neste navegador");

      // Segunda gravação na mesma sessão não repete o alerta
      const events2 = [...events, makeEvent(2, "Outro gasto")];
      const ok2 = await logStorage.saveImmediate(events2);
      expect(ok2).toBe(false);
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(storage.data.has(EVENTS_BACKUP_KEY)).toBe(false);

      // Eventos continuam disponíveis em memória na sessão atual
      expect(await logStorage.load()).toEqual(events2);
    });

    it("sem IndexedDB: não grava texto puro e avisa o usuário em pt-BR", async () => {
      const { storage, alertSpy, logStorage } = createMemoryEnv({ vaultFails: true });
      const events = [makeEvent(1, "Gasto em navegador sem IndexedDB")];

      const ok = await logStorage.saveImmediate(events);
      expect(ok).toBe(false);
      expect(storage.data.has(EVENTS_BACKUP_KEY)).toBe(false);
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        WEB_STORAGE_UNAVAILABLE_TITLE,
        WEB_STORAGE_UNAVAILABLE_MESSAGE
      );
    });

    it("sem WebCrypto na migração de log legado: apaga o texto puro do AsyncStorage, mantém eventos na memória e avisa o usuário", async () => {
      const { storage, alertSpy, logStorage } = createMemoryEnv({ noCrypto: true });
      const legacyEvents = [makeEvent(1, "Gasto legado exposto")];
      storage.data.set(EVENTS_BACKUP_KEY, JSON.stringify(legacyEvents));

      const loaded = await logStorage.load();
      expect(loaded).toEqual(legacyEvents);

      // Texto puro legado foi removido do armazenamento
      expect(storage.data.has(EVENTS_BACKUP_KEY)).toBe(false);

      // Usuário foi avisado
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        WEB_STORAGE_UNAVAILABLE_TITLE,
        WEB_STORAGE_UNAVAILABLE_MESSAGE
      );
    });

    it("quando secrets.set lança exceção após já existir v1:... antigo, prioriza inMemoryFallback da sessão e avisa o usuário", async () => {
      const { secrets, alertSpy, logStorage } = createMemoryEnv();
      const e1 = makeEvent(1, "Antigo persistido");
      const e2 = makeEvent(2, "Novo em memória após falha");

      await logStorage.saveImmediate([e1]);

      // Simula falha de escrita (ex.: QuotaExceededError) na segunda gravação
      vi.spyOn(secrets, "set").mockRejectedValueOnce(new Error("QuotaExceededError"));

      const ok = await logStorage.saveImmediate([e1, e2]);
      expect(ok).toBe(false);
      expect(alertSpy).toHaveBeenCalledTimes(1);

      // Leitura na mesma sessão devolve o estado mais recente retido em memória
      expect(await logStorage.load()).toEqual([e1, e2]);
    });
  });

  describe("Volume e fluidez com 5.000 eventos", () => {
    it("cifra e decifra um log com 5.000 eventos cedendo o event loop sem bloquear a thread e sem perder eventos", async () => {
      const { storage, setSpy, logStorage, reopen } = createMemoryEnv({ debounceMs: 5 });
      const fiveThousandEvents: SyncEvent[] = Array.from({ length: 5_000 }, (_, i) =>
        makeEvent(i + 1, `Transação detalhada número ${i + 1} no cartão`)
      );

      // Verifica que saveImmediate cede o turno (síncrono e microtask) antes de serializar/cifrar
      let microtaskRanBeforeEncrypt = false;
      const savePromise = logStorage.saveImmediate(fiveThousandEvents);
      expect(setSpy.mock.calls.length).toBe(0);
      await Promise.resolve().then(() => {
        if (setSpy.mock.calls.length === 0) {
          microtaskRanBeforeEncrypt = true;
        }
      });

      // Aguarda conclusão da cifra e mede tempo total
      const totalStart = performance.now();
      const ok = await savePromise;
      const totalEncryptMs = performance.now() - totalStart;

      expect(microtaskRanBeforeEncrypt).toBe(true);
      expect(ok).toBe(true);
      // Cifra de 5.000 eventos deve concluir rapidamente (< 1.500ms mesmo em CI)
      expect(totalEncryptMs).toBeLessThan(1_500);

      const raw = storage.data.get(EVENTS_BACKUP_KEY);
      expect(raw).toBeDefined();
      expect(raw!.startsWith("v1:")).toBe(true);
      expect(raw).not.toContain("Transação detalhada número 1");

      // Decifra na reabertura e verifica integridade dos 5.000 eventos
      const decryptStart = performance.now();
      const loaded = await reopen().load();
      const totalDecryptMs = performance.now() - decryptStart;

      expect(totalDecryptMs).toBeLessThan(1_500);
      expect(loaded).toHaveLength(5_000);
      expect((loaded[0] as SyncEvent).id).toBe("evt-1");
      expect((loaded[4_999] as SyncEvent).id).toBe("evt-5000");
    });
  });

  describe("Funções padrão exportadas (integração com useEventStore)", () => {
    it("scheduleWebEventLogSave, flushWebEventLogSave, saveWebEventLogImmediate e loadWebEventLog operam sobre webSecrets", async () => {
      const e1 = makeEvent(1, "Café");
      const e2 = makeEvent(2, "Almoço");

      void scheduleWebEventLogSave([e1]);
      void scheduleWebEventLogSave([e1, e2]);
      await flushWebEventLogSave();

      expect(defaultStorageData.get(EVENTS_BACKUP_KEY)?.startsWith("v1:")).toBe(true);
      expect(await loadWebEventLog()).toEqual([e1, e2]);

      await saveWebEventLogImmediate([e1]);
      expect(await loadWebEventLog()).toEqual([e1]);
    });

    it("notifica via appAlert quando a instância padrão não consegue cifrar por falta de WebCrypto", async () => {
      defaultVaultState.noCrypto = true;
      const { webSecrets } = await import("@/src/modules/security/infrastructure/webSecrets");
      (webSecrets as unknown as { _recreate: () => void })._recreate();

      const ok = await saveWebEventLogImmediate([makeEvent(1)]);
      expect(ok).toBe(false);
      expect(defaultStorageData.has(EVENTS_BACKUP_KEY)).toBe(false);
      expect(appAlert).toHaveBeenCalledTimes(1);
      expect(appAlert).toHaveBeenCalledWith(
        WEB_STORAGE_UNAVAILABLE_TITLE,
        WEB_STORAGE_UNAVAILABLE_MESSAGE
      );
    });
  });
});
