import { describe, it, expect, vi } from "vitest";
import {
  createSyncGroupTracker,
  SYNC_GROUP_TRACKING_KEY,
  type SyncGroupTrackingStorage,
  type SyncGroupTrackingRecord,
} from "../syncGroupTracking";

class MemoryStorage implements SyncGroupTrackingStorage {
  public data = new Map<string, string>();
  public getItemCalls: string[] = [];
  public setItemCalls: { key: string; value: string }[] = [];
  public removeItemCalls: string[] = [];

  async getItem(key: string): Promise<string | null> {
    this.getItemCalls.push(key);
    return this.data.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.setItemCalls.push({ key, value });
    this.data.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.removeItemCalls.push(key);
    this.data.delete(key);
  }
}

describe("syncGroupTracking (Story 4.6)", () => {
  describe("Operações puras em memória", () => {
    it("devolve shouldPublish=true para eventos e grupos ainda não registrados", () => {
      const tracker = createSyncGroupTracker();
      expect(tracker.shouldPublish("evt-1", "G1")).toBe(true);
      expect(tracker.hasPublished("evt-1", "G1")).toBe(false);
      expect(tracker.hasReceived("evt-1", "G1")).toBe(false);
      expect(tracker.getStatus("evt-1", "G1")).toBeNull();
    });

    it("devolve shouldPublish=false se eventId ou groupId forem vazios", () => {
      const tracker = createSyncGroupTracker();
      expect(tracker.shouldPublish("", "G1")).toBe(false);
      expect(tracker.shouldPublish("evt-1", "")).toBe(false);
    });

    it("marca eventos como publicados e atualiza estado e consultas", async () => {
      const tracker = createSyncGroupTracker();
      await tracker.markPublished(["evt-1", "evt-2"], "G1");

      expect(tracker.hasPublished("evt-1", "G1")).toBe(true);
      expect(tracker.hasPublished("evt-2", "G1")).toBe(true);
      expect(tracker.hasPublished("evt-3", "G1")).toBe(false);

      expect(tracker.shouldPublish("evt-1", "G1")).toBe(false);
      expect(tracker.shouldPublish("evt-2", "G1")).toBe(false);
      expect(tracker.shouldPublish("evt-3", "G1")).toBe(true);

      expect(tracker.getStatus("evt-1", "G1")).toBe("published");
      expect(tracker.getPublishedEvents("G1")).toEqual(["evt-1", "evt-2"]);
      expect(tracker.getReceivedEvents("G1")).toEqual([]);
    });

    it("marca eventos como recebidos e previne eco imediato no mesmo grupo", async () => {
      const tracker = createSyncGroupTracker();
      await tracker.markReceived("evt-rec-1", "G1");

      expect(tracker.hasReceived("evt-rec-1", "G1")).toBe(true);
      expect(tracker.hasPublished("evt-rec-1", "G1")).toBe(false);
      expect(tracker.shouldPublish("evt-rec-1", "G1")).toBe(false);
      expect(tracker.getStatus("evt-rec-1", "G1")).toBe("received");
      expect(tracker.getReceivedEvents("G1")).toEqual(["evt-rec-1"]);
    });

    it("filtra lista de eventos para publicação mantendo apenas os pendentes", async () => {
      const tracker = createSyncGroupTracker();
      await tracker.markPublished(["evt-1"], "G1");
      await tracker.markReceived(["evt-2"], "G1");

      const candidates = [
        { id: "evt-1", name: "Primeiro" },
        { id: "evt-2", name: "Segundo" },
        { id: "evt-3", name: "Terceiro" },
        { id: "evt-4", name: "Quarto" },
      ];

      const toPublish = tracker.filterEventsToPublish(candidates, "G1");
      expect(toPublish).toEqual([
        { id: "evt-3", name: "Terceiro" },
        { id: "evt-4", name: "Quarto" },
      ]);
    });

    it("aceita tanto string individual quanto array em markPublished e markReceived", async () => {
      const tracker = createSyncGroupTracker();
      await tracker.markPublished("evt-single-p", "G1");
      await tracker.markReceived("evt-single-r", "G1");

      expect(tracker.hasPublished("evt-single-p", "G1")).toBe(true);
      expect(tracker.hasReceived("evt-single-r", "G1")).toBe(true);
    });
  });

  describe("Isolamento entre grupos e ponte sem loop", () => {
    it("evento recebido de G1 não pode ser publicado em G1, mas pode em G2", async () => {
      const tracker = createSyncGroupTracker();
      await tracker.markReceived("evt-from-g1", "G1");

      // No grupo de origem (G1): eco estritamente proibido
      expect(tracker.shouldPublish("evt-from-g1", "G1")).toBe(false);

      // No segundo grupo (G2): apto para propagação
      expect(tracker.shouldPublish("evt-from-g1", "G2")).toBe(true);

      // Após envio com sucesso ao G2:
      await tracker.markPublished("evt-from-g1", "G2");
      expect(tracker.shouldPublish("evt-from-g1", "G2")).toBe(false);

      // Nenhum dos dois grupos aceita nova publicação
      expect(tracker.shouldPublish("evt-from-g1", "G1")).toBe(false);
      expect(tracker.shouldPublish("evt-from-g1", "G2")).toBe(false);
    });

    it("clearGroup limpa apenas o grupo indicado sem afetar os outros", async () => {
      const tracker = createSyncGroupTracker();
      await tracker.markPublished(["p1"], "G1");
      await tracker.markPublished(["p2"], "G2");

      await tracker.clearGroup("G1");

      expect(tracker.hasPublished("p1", "G1")).toBe(false);
      expect(tracker.shouldPublish("p1", "G1")).toBe(true);

      expect(tracker.hasPublished("p2", "G2")).toBe(true);
      expect(tracker.shouldPublish("p2", "G2")).toBe(false);
    });

    it("clearAll limpa todos os grupos", async () => {
      const storage = new MemoryStorage();
      const tracker = createSyncGroupTracker(storage);
      await tracker.markPublished(["p1"], "G1");
      await tracker.markPublished(["p2"], "G2");

      expect(tracker.getTrackedGroups().sort()).toEqual(["G1", "G2"]);

      await tracker.clearAll();

      expect(tracker.getTrackedGroups()).toEqual([]);
      expect(tracker.shouldPublish("p1", "G1")).toBe(true);
      expect(tracker.shouldPublish("p2", "G2")).toBe(true);
      expect(storage.data.has(SYNC_GROUP_TRACKING_KEY)).toBe(false);
    });
  });

  describe("Persistência em Storage e Sobrevivência a Reinício", () => {
    it("persiste estado com chave domus_sync_group_tracking_v1 e estrutura versionada", async () => {
      const storage = new MemoryStorage();
      const tracker = createSyncGroupTracker({ storage });

      await tracker.markPublished(["evt-p1", "evt-p2"], "G1");
      await tracker.markReceived(["evt-r1"], "G1");

      const savedRaw = storage.data.get(SYNC_GROUP_TRACKING_KEY);
      expect(savedRaw).toBeDefined();

      const savedJson = JSON.parse(savedRaw!) as SyncGroupTrackingRecord;
      expect(savedJson.version).toBe(1);
      expect(savedJson.groups.G1).toEqual({
        p: ["evt-p1", "evt-p2"],
        r: ["evt-r1"],
      });
    });

    it("sobrevive ao reinício carregando o estado idêntico de múltiplos grupos", async () => {
      const storage = new MemoryStorage();
      const tracker1 = createSyncGroupTracker(storage);

      await tracker1.markPublished(["p1", "p2"], "group-alpha");
      await tracker1.markReceived(["r1"], "group-alpha");
      await tracker1.markPublished(["p3"], "group-beta");
      await tracker1.markReceived(["r2", "r3"], "group-beta");

      // Simula reinício do aplicativo: nova instância com o mesmo storage
      const tracker2 = createSyncGroupTracker(storage);
      await tracker2.load();

      expect(tracker2.hasPublished("p1", "group-alpha")).toBe(true);
      expect(tracker2.hasPublished("p2", "group-alpha")).toBe(true);
      expect(tracker2.hasReceived("r1", "group-alpha")).toBe(true);
      expect(tracker2.shouldPublish("p1", "group-alpha")).toBe(false);
      expect(tracker2.shouldPublish("r1", "group-alpha")).toBe(false);

      expect(tracker2.hasPublished("p3", "group-beta")).toBe(true);
      expect(tracker2.hasReceived("r2", "group-beta")).toBe(true);
      expect(tracker2.hasReceived("r3", "group-beta")).toBe(true);
      expect(tracker2.shouldPublish("p3", "group-beta")).toBe(false);
      expect(tracker2.shouldPublish("r2", "group-beta")).toBe(false);

      // Evento desconhecido continua publicável
      expect(tracker2.shouldPublish("p-nova", "group-alpha")).toBe(true);
      expect(tracker2.shouldPublish("p-nova", "group-beta")).toBe(true);
    });

    it("inicializa vazio caso o storage esteja vazio", async () => {
      const storage = new MemoryStorage();
      const tracker = createSyncGroupTracker(storage);
      await tracker.load();

      expect(tracker.getTrackedGroups()).toEqual([]);
      expect(tracker.shouldPublish("evt-1", "any-group")).toBe(true);
    });

    it("reinicializa vazio sem falhar se o JSON do storage estiver corrompido", async () => {
      const storage = new MemoryStorage();
      storage.data.set(SYNC_GROUP_TRACKING_KEY, "{ json corrompido e quebrado");

      const warnSpy = vi.fn();
      const tracker = createSyncGroupTracker({ storage, warn: warnSpy });
      await tracker.load();

      expect(tracker.getTrackedGroups()).toEqual([]);
      expect(tracker.shouldPublish("evt-1", "G1")).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("JSON corrompido no storage"),
      );
    });

    it("reinicializa vazio se a versão ou estrutura do storage for inválida", async () => {
      const storage = new MemoryStorage();
      storage.data.set(SYNC_GROUP_TRACKING_KEY, JSON.stringify({ version: 2, invalid: true }));

      const warnSpy = vi.fn();
      const tracker = createSyncGroupTracker({ storage, warn: warnSpy });
      await tracker.load();

      expect(tracker.getTrackedGroups()).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Estrutura inválida no storage"),
      );
    });

    it("trata falha de leitura do storage sem estourar exceção", async () => {
      const faultyStorage: SyncGroupTrackingStorage = {
        async getItem() {
          throw new Error("Disk IO failure");
        },
        async setItem() {},
        async removeItem() {},
      };

      const warnSpy = vi.fn();
      const tracker = createSyncGroupTracker({ storage: faultyStorage, warn: warnSpy });
      await tracker.load();

      expect(tracker.getTrackedGroups()).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao carregar do storage"),
      );
    });

    it("trata falha de escrita no storage sem quebrar o fluxo", async () => {
      const faultyStorage: SyncGroupTrackingStorage = {
        async getItem() {
          return null;
        },
        async setItem() {
          throw new Error("Disk full");
        },
        async removeItem() {},
      };

      const warnSpy = vi.fn();
      const tracker = createSyncGroupTracker({ storage: faultyStorage, warn: warnSpy });

      // Não deve lançar erro
      await tracker.markPublished("evt-1", "G1");
      expect(tracker.hasPublished("evt-1", "G1")).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Falha ao persistir rastreamento"),
      );
    });
  });

  describe("Controle de concorrência", () => {
    it("gerencia múltiplas chamadas simultâneas de persistência sem perda de dados", async () => {
      const storage = new MemoryStorage();
      const tracker = createSyncGroupTracker(storage);

      // Dispara 20 marcações simultâneas em grupos mistos
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 20; i++) {
        const gid = i % 2 === 0 ? "G-even" : "G-odd";
        promises.push(tracker.markPublished(`evt-p-${i}`, gid));
        promises.push(tracker.markReceived(`evt-r-${i}`, gid));
      }

      await Promise.all(promises);

      // Todas as entradas devem estar presentes em memória
      for (let i = 0; i < 20; i++) {
        const gid = i % 2 === 0 ? "G-even" : "G-odd";
        expect(tracker.hasPublished(`evt-p-${i}`, gid)).toBe(true);
        expect(tracker.hasReceived(`evt-r-${i}`, gid)).toBe(true);
      }

      // E todas devem ter sido persistidas no storage
      const reloaded = createSyncGroupTracker(storage);
      await reloaded.load();

      for (let i = 0; i < 20; i++) {
        const gid = i % 2 === 0 ? "G-even" : "G-odd";
        expect(reloaded.hasPublished(`evt-p-${i}`, gid)).toBe(true);
        expect(reloaded.hasReceived(`evt-r-${i}`, gid)).toBe(true);
      }
    });
  });

  describe("Simulação com dois grupos: prova matemática de no máximo 1 publicação por evento por grupo", () => {
    it("comprova estritamente <= 1 publicação por evento e por grupo (0 para eventos recebidos do próprio grupo)", async () => {
      const storage = new MemoryStorage();
      const tracker = createSyncGroupTracker(storage);

      const G_OLD = "group-legacy-pubkey-001";
      const G_STRONG = "group-strong-pubkey-002";

      // Contador de publicações reais efetuadas nos relays para cada grupo
      const publicationsCount: Record<string, Record<string, number>> = {
        [G_OLD]: {},
        [G_STRONG]: {},
      };

      function recordRelayPublish(groupId: string, eventId: string) {
        if (!publicationsCount[groupId][eventId]) {
          publicationsCount[groupId][eventId] = 0;
        }
        publicationsCount[groupId][eventId]++;
      }

      // Eventos criados localmente no aparelho
      const localEvents = [
        { id: "local-evt-1", type: "TRANSACTION_CREATED", deviceId: "my-device" },
        { id: "local-evt-2", type: "CATEGORY_CREATED", deviceId: "my-device" },
        { id: "local-evt-3", type: "BUDGET_SET", deviceId: "my-device" },
      ];

      // Evento recebido de G_OLD (vindo de outro aparelho no canal legado)
      const remoteFromOld = {
        id: "remote-old-1",
        type: "TRANSACTION_CREATED",
        deviceId: "other-device-1",
      };
      await tracker.markReceived(remoteFromOld.id, G_OLD);

      // Evento recebido de G_STRONG (vindo de outro aparelho no canal forte)
      const remoteFromStrong = {
        id: "remote-strong-1",
        type: "PAYSLIP_RECORDED",
        deviceId: "other-device-2",
      };
      await tracker.markReceived(remoteFromStrong.id, G_STRONG);

      // O aparelho possui no seu banco local todos os eventos:
      const allAppEvents = [...localEvents, remoteFromOld, remoteFromStrong];

      // Simulação do pipeline de sincronização executando 5 ciclos repetidos
      // (ex.: disparados por periodic sync, reconexão de rede, auto-push após edição)
      const CYCLES = 5;
      for (let cycle = 1; cycle <= CYCLES; cycle++) {
        // --- Ciclo para G_OLD ---
        // Filtra o que pode ser publicado em G_OLD
        const toPublishOld = tracker.filterEventsToPublish(allAppEvents, G_OLD);
        for (const evt of toPublishOld) {
          // Publica no relay
          recordRelayPublish(G_OLD, evt.id);
          // Marca como publicado com sucesso
          await tracker.markPublished(evt.id, G_OLD);
        }

        // --- Ciclo para G_STRONG ---
        // Filtra o que pode ser publicado em G_STRONG
        const toPublishStrong = tracker.filterEventsToPublish(allAppEvents, G_STRONG);
        for (const evt of toPublishStrong) {
          // Publica no relay
          recordRelayPublish(G_STRONG, evt.id);
          // Marca como publicado com sucesso
          await tracker.markPublished(evt.id, G_STRONG);
        }
      }

      // --- Prova dos resultados ---

      // 1. Eventos locais: publicados exatamente 1 vez em G_OLD e 1 vez em G_STRONG
      for (const evt of localEvents) {
        expect(publicationsCount[G_OLD][evt.id]).toBe(1);
        expect(publicationsCount[G_STRONG][evt.id]).toBe(1);
      }

      // 2. Evento recebido de G_OLD:
      // NUNCA publicado em G_OLD (zero ecos no canal de origem!)
      expect(publicationsCount[G_OLD][remoteFromOld.id] || 0).toBe(0);
      // Publicado exatamente 1 vez em G_STRONG (ponte/propagação assistida!)
      expect(publicationsCount[G_STRONG][remoteFromOld.id]).toBe(1);

      // 3. Evento recebido de G_STRONG:
      // NUNCA publicado em G_STRONG (zero ecos no canal forte!)
      expect(publicationsCount[G_STRONG][remoteFromStrong.id] || 0).toBe(0);
      // Publicado exatamente 1 vez em G_OLD (ponte reversa controlada!)
      expect(publicationsCount[G_OLD][remoteFromStrong.id]).toBe(1);

      // 4. Verificação universal: em NENHUM grupo qualquer evento foi publicado mais de 1 vez
      for (const gid of [G_OLD, G_STRONG]) {
        for (const count of Object.values(publicationsCount[gid])) {
          expect(count).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("Revisão adversarial e resiliência (Story 4.6)", () => {
    it("filterEventsToPublish funciona desestruturado sem perda de contexto 'this'", () => {
      const tracker = createSyncGroupTracker();
      const { filterEventsToPublish } = tracker;
      const res = filterEventsToPublish([{ id: "evt-1" }, { id: "evt-2" }], "G1");
      expect(res.map((e) => e.id)).toEqual(["evt-1", "evt-2"]);
    });

    it("filterEventsToPublish ignora IDs vazios ou inválidos", () => {
      const tracker = createSyncGroupTracker();
      const res = tracker.filterEventsToPublish(
        [{ id: "" }, { id: "evt-valid" }, { id: "" }],
        "G1",
      );
      expect(res.map((e) => e.id)).toEqual(["evt-valid"]);
    });

    it("markReceived não adiciona evento já publicado (exclusão mútua contra eco de relays)", async () => {
      const tracker = createSyncGroupTracker();
      await tracker.markPublished("evt-local-1", "G1");
      expect(tracker.getPublishedEvents("G1")).toEqual(["evt-local-1"]);
      expect(tracker.getReceivedEvents("G1")).toEqual([]);

      // Relay ecoa de volta o evento publicado localmente
      await tracker.markReceived("evt-local-1", "G1");
      expect(tracker.getPublishedEvents("G1")).toEqual(["evt-local-1"]);
      expect(tracker.getReceivedEvents("G1")).toEqual([]);
      expect(tracker.getStatus("evt-local-1", "G1")).toBe("published");
    });

    it("clearAll aguarda salvamento em curso e não sofre sobrescrita por save concorrente", async () => {
      const storage = new MemoryStorage();
      const tracker = createSyncGroupTracker(storage);
      await tracker.markPublished("evt-1", "G1");
      await tracker.clearAll();
      expect(tracker.getTrackedGroups()).toEqual([]);
      const raw = await storage.getItem(SYNC_GROUP_TRACKING_KEY);
      expect(raw).toBeNull();
    });

    it("load preserva estado em memória se leitura do storage falhar com erro transiente", async () => {
      const storage = new MemoryStorage();
      const tracker = createSyncGroupTracker(storage);
      await tracker.markPublished("evt-keep", "G1");

      // Storage falha transitoriamente
      storage.getItem = vi.fn().mockRejectedValueOnce(new Error("Falha temporária de I/O"));
      await tracker.load();

      // Estado em memória não é apagado
      expect(tracker.hasPublished("evt-keep", "G1")).toBe(true);
    });
  });
});
