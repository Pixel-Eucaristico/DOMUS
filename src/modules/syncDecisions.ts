/**
 * Story 5.1: Decisões puras de sincronização (push e pull).
 * Extraídas de useSyncEngine.ts para permitir testes determinísticos no Vitest
 * sem dependência de React ou APIs nativas do React Native/Expo.
 */

import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { SyncGroupTracker } from "./syncGroupTracking";
import {
  partitionOldGroupEvents,
  RELAY_CURSOR_OVERLAP_SEC,
} from "./syncPayload";
import type { PublishSyncResult } from "./nostrSync";

export type PublishDecisionReason = "no-events" | "up-to-date" | "pending-events" | "forced" | "hash-changed";

export interface PublishDecision {
  shouldPublish: boolean;
  reason: PublishDecisionReason;
  myEvents: SyncEvent[];
  pendingEvents: SyncEvent[];
  hash: string;
}

export interface ShouldPublishGroupEventsParams {
  events: readonly SyncEvent[];
  groupId: string;
  isStrong: boolean;
  tracker: Pick<SyncGroupTracker, "filterEventsToPublish" | "hasReceived">;
  lastHash?: string | null;
  force?: boolean;
  deviceId?: string;
}

/**
 * Computa o hash canônico dos eventos locais deste aparelho para detecção de alteração.
 * Função pura e determinística.
 */
export function computeEventHash(events: readonly { id: string }[]): string {
  if (events.length === 0) return "empty";
  const ids = events.map((e) => e.id).sort().join(",");
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    const c = ids.charCodeAt(i);
    hash = ((hash << 5) - hash + c) | 0;
  }
  return `${events.length}-${hash.toString(36)}`;
}

/**
 * Story 5.6: Avalia se há eventos elegíveis para envio ao grupo Nostr (forte ou legado).
 *
 * 1. Seleciona os eventos candidatos com base no canal (exclui PAYSLIP_* / dados confessionais no grupo legado).
 * 2. Exclui eventos recebidos deste grupo através de tracker.hasReceived (prevenção estrita de loop e eco).
 *    Eventos locais (inclusive de backups restaurados com deviceId antigo) são mantidos como elegíveis.
 * 3. Se não houver eventos locais/elegíveis: shouldPublish: false, reason: "no-events".
 * 4. Consulta o tracker de grupo (filterEventsToPublish) para identificar pendências de publicação.
 * 5. Calcula o hash canônico atual dos eventos elegíveis (computeEventHash(myEvents)).
 * 6. Se force for verdadeiro: shouldPublish: true, reason: "forced".
 * 7. Se não houver pendências e o hash coincidir com lastHash: shouldPublish: false, reason: "up-to-date".
 * 8. Caso contrário: shouldPublish: true, reason: "pending-events" (ou "hash-changed" se pendências vazias mas hash alterado).
 */
export function shouldPublishGroupEvents(params: ShouldPublishGroupEventsParams): PublishDecision {
  const { events, groupId, isStrong, tracker, lastHash, force = false } = params;

  const candidateEvents = isStrong
    ? [...events]
    : partitionOldGroupEvents(events).allowed;

  // Story 5.6: Exclui eventos recebidos deste grupo (hasReceived)
  const myEvents = candidateEvents.filter((e) => !tracker.hasReceived(e.id, groupId));

  if (myEvents.length === 0) {
    return {
      shouldPublish: false,
      reason: "no-events",
      myEvents: [],
      pendingEvents: [],
      hash: "empty",
    };
  }

  const pendingEvents = tracker.filterEventsToPublish(myEvents, groupId);
  const hash = computeEventHash(myEvents);

  if (force) {
    return {
      shouldPublish: true,
      reason: "forced",
      myEvents,
      pendingEvents,
      hash,
    };
  }

  if (pendingEvents.length === 0) {
    if (hash === lastHash) {
      return {
        shouldPublish: false,
        reason: "up-to-date",
        myEvents,
        pendingEvents,
        hash,
      };
    }
    return {
      shouldPublish: true,
      reason: "hash-changed",
      myEvents,
      pendingEvents,
      hash,
    };
  }

  return {
    shouldPublish: true,
    reason: "pending-events",
    myEvents,
    pendingEvents,
    hash,
  };
}

export interface ProcessIncomingEventsParams {
  incomingEvents: readonly SyncEvent[];
  currentDeviceId: string;
  existingIds: ReadonlySet<string>;
  ignoreOwnEvents?: boolean;
}

export interface ProcessIncomingEventsResult {
  /** Eventos inéditos que devem ser inseridos no banco local */
  eventsToImport: SyncEvent[];
  /** IDs de eventos vindos de outros aparelhos (foreign) para registrar em markReceived */
  foreignEventIds: string[];
  /** IDs de eventos originados no próprio aparelho recebidos de volta (eco) */
  echoEventIds: string[];
  /** IDs de eventos descartados por duplicidade (já existentes localmente ou repetidos no lote) */
  duplicateEventIds: string[];
}

/**
 * Processa um lote de eventos recebidos dos relays Nostr:
 * - Descarta eventos já presentes no banco local ou repetidos no próprio lote.
 * - Suprime eventos gerados por este mesmo aparelho (prevenção de loop de eco).
 * - Identifica IDs de eventos estrangeiros para confirmação de recebimento no tracker (`markReceived`).
 */
export function processIncomingEvents(params: ProcessIncomingEventsParams): ProcessIncomingEventsResult {
  const { incomingEvents, currentDeviceId, existingIds, ignoreOwnEvents = true } = params;

  const eventsToImport: SyncEvent[] = [];
  const foreignEventIds: string[] = [];
  const foreignSet = new Set<string>();
  const echoEventIds: string[] = [];
  const duplicateEventIds: string[] = [];
  const duplicateSet = new Set<string>();
  const seenIds = new Set<string>(existingIds);

  for (const evt of incomingEvents) {
    if (evt.deviceId === currentDeviceId) {
      echoEventIds.push(evt.id);
      if (seenIds.has(evt.id)) {
        if (!duplicateSet.has(evt.id)) {
          duplicateSet.add(evt.id);
          duplicateEventIds.push(evt.id);
        }
      }
      if (ignoreOwnEvents) {
        continue;
      }
    } else {
      if (!foreignSet.has(evt.id)) {
        foreignSet.add(evt.id);
        foreignEventIds.push(evt.id);
      }
    }

    if (seenIds.has(evt.id)) {
      if (!duplicateSet.has(evt.id)) {
        duplicateSet.add(evt.id);
        duplicateEventIds.push(evt.id);
      }
      continue;
    }

    seenIds.add(evt.id);
    eventsToImport.push(evt);
  }

  return {
    eventsToImport,
    foreignEventIds,
    echoEventIds,
    duplicateEventIds,
  };
}

export interface ProcessPushResultParams {
  result: Pick<PublishSyncResult, "published" | "confirmedEventIds" | "failedEventIds"> & {
    rejectedEventIds?: readonly string[];
    batches?: readonly unknown[];
  };
  myEvents: readonly { id: string }[];
  currentHash: string;
}

export interface ProcessPushOutcome {
  eventsToMark: string[];
  shouldAdvanceHash: boolean;
  nextHash?: string;
  shouldThrow: boolean;
  errorMessage?: string;
}

/**
 * Story 5.2: Processa o resultado do push de eventos e determina os efeitos:
 * - `eventsToMark`: eventos confirmados pelos relays + eventos rejeitados por validação
 *   (para que envelopes inválidos não fiquem em loop infinito de retentativa).
 * - `shouldAdvanceHash`: verdadeiro apenas quando não houve nenhuma falha de lote (failedEventIds vazia)
 *   e pelo menos um evento foi confirmado ou a lista local estava vazia.
 * - `shouldThrow` / `errorMessage`: verdadeiro caso haja lotes com falha (failedEventIds.length > 0).
 */
export function processPushResult(params: ProcessPushResultParams): ProcessPushOutcome {
  const { result, myEvents, currentHash } = params;
  const rejected = result.rejectedEventIds ?? [];
  const eventsToMark = [...result.confirmedEventIds, ...rejected];

  const hasFailures = result.failedEventIds.length > 0;
  const anyConfirmed = result.confirmedEventIds.length > 0;
  const shouldAdvanceHash = !hasFailures && (anyConfirmed || myEvents.length === 0);

  const shouldThrow = hasFailures;
  const errorMessage = hasFailures
    ? `Falha ao publicar eventos: ${result.failedEventIds.length} eventos em lotes não foram aceitos por nenhum relay.`
    : undefined;

  return {
    eventsToMark,
    shouldAdvanceHash,
    nextHash: shouldAdvanceHash ? currentHash : undefined,
    shouldThrow,
    errorMessage,
  };
}

export interface ResolvePullSyncOptionsParams {
  isRecovery?: boolean;
  isStrong?: boolean;
  cursor?: number | null;
  nowSec?: number;
}

export interface ResolvedPullSyncOptions {
  cursor: number | null;
  since?: number;
}

/**
 * Story 5.4: Resolve opções de pull incremental evitando contaminação de cursor
 * entre grupos forte e legado (o grupo legado nunca usa cursor) e aplicando a janela
 * de sobreposição de 60 segundos contra clock skew entre dispositivos, validando
 * se o cursor é finito e limitando against relógios adiantados de peers.
 */
export function resolvePullSyncOptions(params: ResolvePullSyncOptionsParams): ResolvedPullSyncOptions {
  const effectiveCursor = params.isRecovery || !params.isStrong ? null : (params.cursor ?? null);
  if (effectiveCursor != null && Number.isFinite(effectiveCursor) && effectiveCursor > 0) {
    const nowSec = typeof params.nowSec === "number" && Number.isFinite(params.nowSec)
      ? params.nowSec
      : Math.floor(Date.now() / 1000);
    const maxSince = Math.max(0, Math.floor(nowSec) - RELAY_CURSOR_OVERLAP_SEC);
    const rawSince = Math.max(0, Math.floor(effectiveCursor) - RELAY_CURSOR_OVERLAP_SEC);
    const since = Math.min(rawSince, maxSince);
    return { cursor: effectiveCursor, since };
  }
  return { cursor: null };
}
