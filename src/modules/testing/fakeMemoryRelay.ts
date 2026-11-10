/**
 * Story 5.1: Relay Nostr simulado em memória (FakeMemoryRelay).
 *
 * Fornece armazenamento de eventos Nostr com suporte a NIP-33 (eventos substituíveis
 * parametrizados kind: 30000..39999 com tag "d"), subscrições ao vivo, filtros de consulta
 * e telemetria de publicações por evento (Nostr e domínio) e por aparelho (deviceId).
 *
 * Módulo puramente em memória, rápido e determinístico (< 2s no Vitest), sem React ou React Native.
 */

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  "#d"?: string[];
  "#t"?: string[];
  "#device"?: string[];
  [key: string]: unknown;
}

export interface RelaySubscription {
  id: string;
  filter: NostrFilter;
  onEvent: (event: NostrEvent) => void;
  close: () => void;
}

export interface PublicationLogEntry {
  nostrEvent: NostrEvent;
  deviceId?: string;
  innerEventIds: string[];
  timestamp: number;
}

export function matchesFilter(event: NostrEvent, filter: NostrFilter): boolean {
  if (filter.ids && filter.ids.length > 0 && !filter.ids.includes(event.id)) {
    return false;
  }
  if (filter.authors && filter.authors.length > 0 && !filter.authors.includes(event.pubkey)) {
    return false;
  }
  if (filter.kinds && filter.kinds.length > 0 && !filter.kinds.includes(event.kind)) {
    return false;
  }
  if (filter.since !== undefined && event.created_at < filter.since) {
    return false;
  }
  if (filter.until !== undefined && event.created_at > filter.until) {
    return false;
  }

  if (filter["#d"] && filter["#d"].length > 0) {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1];
    if (!dTag || !filter["#d"].includes(dTag)) return false;
  }

  if (filter["#t"] && filter["#t"].length > 0) {
    const tTags = event.tags.filter((t) => t[0] === "t").map((t) => t[1]);
    const hasAny = filter["#t"].some((val) => tTags.includes(val));
    if (!hasAny) return false;
  }

  if (filter["#device"] && filter["#device"].length > 0) {
    const devTag = event.tags.find((t) => t[0] === "device")?.[1];
    if (!devTag || !filter["#device"].includes(devTag)) return false;
  }

  return true;
}

export class FakeMemoryRelay {
  /** Indica se o relay está temporariamente derrubado/indisponível */
  private isDown = false;

  /** IDs de lotes (tag "d") configurados para serem rejeitados para simular falhas parciais */
  private rejectedBatchIds = new Set<string>();

  /** Interceptador customizado opcional para controle fino em testes */
  private publishInterceptor?: (event: NostrEvent) => { ok: boolean; reason?: string } | undefined;

  /** Armazenamento de eventos ativos indexados por chave única */
  private eventsByKey = new Map<string, NostrEvent>();

  /** Contagem de publicações por ID de evento do Nostr */
  private pubCountByNostrId = new Map<string, number>();

  /** Contagem de publicações por ID de evento de domínio (inner SyncEvent.id) */
  private pubCountByInnerEventId = new Map<string, number>();

  /** Contagem de publicações por identificador de aparelho (deviceId) */
  private pubCountByDeviceId = new Map<string, number>();

  /** Histórico completo de publicações */
  private publicationLog: PublicationLogEntry[] = [];

  /** Histórico completo de consultas realizadas via query() */
  private queryLog: NostrFilter[] = [];

  /** Subscrições ativas */
  private subscriptions = new Map<string, RelaySubscription>();
  private subSeq = 0;

  /**
   * Extrai o identificador do aparelho a partir dos metadados do evento Nostr.
   */
  private extractDeviceId(event: NostrEvent): string | undefined {
    const devTag = event.tags.find((t) => t[0] === "device")?.[1];
    if (devTag) return devTag;

    const dTag = event.tags.find((t) => t[0] === "d")?.[1];
    if (dTag) {
      const match = /^sync-(.+)-[^-]+$/.exec(dTag);
      if (match && match[1]) return match[1];
    }
    return undefined;
  }

  /**
   * Determina a chave de armazenamento de acordo com NIP-33 / NIP-01:
   * - kind 30000..39999: `${pubkey}:${kind}:${dTag}`
   * - kind 10000..19999: `${pubkey}:${kind}`
   * - demais kinds: `${id}`
   */
  private getStorageKey(event: NostrEvent): string {
    if (event.kind >= 30000 && event.kind < 40000) {
      const dTag = event.tags.find((t) => t[0] === "d")?.[1] ?? "";
      return `${event.pubkey}:${event.kind}:${dTag}`;
    }
    if (event.kind >= 10000 && event.kind < 20000) {
      return `${event.pubkey}:${event.kind}`;
    }
    return event.id;
  }

  /**
   * Controla o status de disponibilidade do relay (simula quedas/indisponibilidade).
   */
  setDown(down: boolean = true): void {
    this.isDown = down;
  }

  /**
   * Retorna se o relay está atualmente derrubado.
   */
  isDownRelay(): boolean {
    return this.isDown;
  }

  /**
   * Configura rejeição de um lote específico pela tag "d".
   */
  rejectBatch(batchId: string): void {
    this.rejectedBatchIds.add(batchId);
  }

  /**
   * Restaura a aceitação de um lote específico.
   */
  allowBatch(batchId: string): void {
    this.rejectedBatchIds.delete(batchId);
  }

  /**
   * Define um interceptador customizado de publicação para testes avançados.
   */
  setPublishInterceptor(fn?: (event: NostrEvent) => { ok: boolean; reason?: string } | undefined): void {
    this.publishInterceptor = fn;
  }

  /**
   * Publica um evento Nostr no relay em memória.
   *
   * Aplica NIP-33 para eventos kind: 30333 (substitui caso `created_at` seja mais recente).
   * Incrementa contadores de telemetria por aparelho e por evento.
   * Dispara subscrições correspondentes de forma síncrona.
   */
  publish(event: NostrEvent, innerEventIds: string[] = []): { ok: boolean; reason?: string } {
    if (this.isDown) {
      return { ok: false, reason: "relay is down" };
    }

    const dTag = event.tags.find((t) => t[0] === "d")?.[1];
    if (dTag && this.rejectedBatchIds.has(dTag)) {
      return { ok: false, reason: `batch ${dTag} rejected` };
    }

    if (this.publishInterceptor) {
      const intercepted = this.publishInterceptor(event);
      if (intercepted && !intercepted.ok) {
        return intercepted;
      }
    }

    const deviceId = this.extractDeviceId(event);

    // Telemetria por Nostr ID
    const curNostrCount = this.pubCountByNostrId.get(event.id) ?? 0;
    this.pubCountByNostrId.set(event.id, curNostrCount + 1);

    // Telemetria por Device ID
    if (deviceId) {
      const curDevCount = this.pubCountByDeviceId.get(deviceId) ?? 0;
      this.pubCountByDeviceId.set(deviceId, curDevCount + 1);
    }

    // Telemetria por ID de domínio
    for (const innerId of innerEventIds) {
      const curInnerCount = this.pubCountByInnerEventId.get(innerId) ?? 0;
      this.pubCountByInnerEventId.set(innerId, curInnerCount + 1);
    }

    this.publicationLog.push({
      nostrEvent: event,
      deviceId,
      innerEventIds: [...innerEventIds],
      timestamp: Date.now(),
    });

    // Armazenamento com NIP-33 e NIP-01 (desempate por event.id)
    const isReplaceable =
      (event.kind >= 10000 && event.kind < 20000) ||
      (event.kind >= 30000 && event.kind < 40000);

    let accepted = true;

    if (isReplaceable) {
      const key = this.getStorageKey(event);
      const existing = this.eventsByKey.get(key);

      if (existing) {
        // Substituição NIP-33: mais novo por created_at; em caso de empate, menor id lexicográfico (ou idêntico)
        const isNewer =
          event.created_at > existing.created_at ||
          (event.created_at === existing.created_at && event.id <= existing.id);

        if (isNewer) {
          this.eventsByKey.set(key, event);
        } else {
          accepted = false;
        }
      } else {
        this.eventsByKey.set(key, event);
      }
    } else {
      this.eventsByKey.set(event.id, event);
    }

    // Se foi descartado como evento substituível antigo, não propaga para inscritos
    if (!accepted) {
      return { ok: false, reason: "replaced" };
    }

    // Notificação imediata para subscrições ativas apenas se o evento foi aceito
    for (const sub of Array.from(this.subscriptions.values())) {
      if (matchesFilter(event, sub.filter)) {
        try {
          sub.onEvent(event);
        } catch (err) {
          console.warn("[FakeMemoryRelay] Erro na notificação da subscrição:", err);
        }
      }
    }

    return { ok: true };
  }

  /**
   * Consulta eventos no relay em memória filtrados pelas regras especificadas.
   */
  query(filter: NostrFilter): NostrEvent[] {
    this.queryLog.push({ ...filter });

    if (this.isDown) {
      return [];
    }

    if (filter.limit !== undefined && filter.limit <= 0) {
      return [];
    }

    const all = Array.from(this.eventsByKey.values());
    const matched = all.filter((ev) => matchesFilter(ev, filter));

    // Ordem padrão Nostr: decrescente por created_at
    matched.sort((a, b) => b.created_at - a.created_at);

    if (filter.limit !== undefined && filter.limit > 0) {
      return matched.slice(0, filter.limit);
    }

    return matched;
  }

  /**
   * Cria uma subscrição com filtro. Retorna handle de encerramento (`close`).
   */
  subscribe(filter: NostrFilter, onEvent: (event: NostrEvent) => void): RelaySubscription {
    const subId = `sub-${++this.subSeq}`;
    const sub: RelaySubscription = {
      id: subId,
      filter,
      onEvent,
      close: () => {
        this.subscriptions.delete(subId);
      },
    };
    this.subscriptions.set(subId, sub);
    return sub;
  }

  // ── Telemetria ──────────────────────────────────────────────────────────────

  /**
   * Retorna a quantidade de publicações recebidas para um evento de domínio (SyncEvent.id).
   */
  getPublicationCountByEventId(eventId: string): number {
    return this.pubCountByInnerEventId.get(eventId) ?? 0;
  }

  /**
   * Retorna a quantidade de publicações recebidas para um ID de evento Nostr.
   */
  getPublicationCountByNostrId(nostrId: string): number {
    return this.pubCountByNostrId.get(nostrId) ?? 0;
  }

  /**
   * Retorna a quantidade de publicações recebidas para um aparelho (deviceId).
   */
  getPublicationCountByDeviceId(deviceId: string): number {
    return this.pubCountByDeviceId.get(deviceId) ?? 0;
  }

  /**
   * Total absoluto de requisições de publicação efetuadas no relay.
   */
  getTotalPublications(): number {
    return this.publicationLog.length;
  }

  /**
   * Mapa de contagem de publicações por ID de domínio.
   */
  getPublicationsByEventId(): Map<string, number> {
    return new Map(this.pubCountByInnerEventId);
  }

  /**
   * Mapa de contagem de publicações por aparelho.
   */
  getPublicationsByDeviceId(): Map<string, number> {
    return new Map(this.pubCountByDeviceId);
  }

  /**
   * Retorna o log completo das publicações realizadas.
   */
  getPublicationLog(): readonly PublicationLogEntry[] {
    return this.publicationLog;
  }

  /**
   * Retorna todos os eventos ativos armazenados.
   */
  getAllEvents(): NostrEvent[] {
    return Array.from(this.eventsByKey.values());
  }

  /**
   * Retorna o histórico de todas as consultas executadas via query().
   */
  getQueryLog(): readonly NostrFilter[] {
    return [...this.queryLog];
  }

  /**
   * Limpa o estado interno do relay.
   */
  clear(): void {
    this.isDown = false;
    this.rejectedBatchIds.clear();
    this.publishInterceptor = undefined;
    this.eventsByKey.clear();
    this.pubCountByNostrId.clear();
    this.pubCountByInnerEventId.clear();
    this.pubCountByDeviceId.clear();
    this.publicationLog = [];
    this.queryLog = [];
    this.subscriptions.clear();
  }

  /**
   * Adaptador compatível com SimplePool para injeção direta em testes onde o pool é mockado.
   */
  asPool() {
    const relay = this;
    return {
      publish(_relays: string[], ev: NostrEvent) {
        if (relay.isDownRelay()) {
          const list = _relays.length > 0 ? _relays : ["wss://relay.fake"];
          return list.map(() => Promise.reject(new Error("Relay is down")));
        }
        const res = relay.publish(ev);
        if (!res.ok) {
          const list = _relays.length > 0 ? _relays : ["wss://relay.fake"];
          return list.map(() => Promise.reject(new Error(res.reason || "publish failed")));
        }
        const list = _relays.length > 0 ? _relays : ["wss://relay.fake"];
        return list.map(() => Promise.resolve("ok"));
      },
      querySync(_relays: string[], filter: NostrFilter) {
        if (relay.isDownRelay()) {
          return Promise.resolve([]);
        }
        return Promise.resolve(relay.query(filter));
      },
      subscribeMany(_relays: string[], filter: NostrFilter, handler: { onevent?: (ev: NostrEvent) => void }) {
        const sub = relay.subscribe(filter, (ev) => {
          handler.onevent?.(ev);
        });
        return { close: sub.close };
      },
      close() {
        // Encerra a conexão da pool sem limpar os eventos do relay
      },
    };
  }
}
