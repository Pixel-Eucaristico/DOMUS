/**
 * Story 5.1: Decisões puras de sincronização (push e pull).
 * Extraídas de useSyncEngine.ts para permitir testes determinísticos no Vitest
 * sem dependência de React ou APIs nativas do React Native/Expo.
 */

import type { SyncEvent } from "@packages/storage/src/eventStore";
import type { SyncGroupTracker } from "./syncGroupTracking";
import { selectOldGroupPushEvents, selectStrongGroupPushEvents } from "./syncPayload";

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
  tracker: Pick<SyncGroupTracker, "filterEventsToPublish">;
  lastHash?: string | null;
  force?: boolean;
  deviceId: string;
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
 * Avalia se há eventos elegíveis para envio ao grupo Nostr (forte ou legado).
 *
 * 1. Seleciona os eventos gerados por este `deviceId` com base no canal (`isStrong`).
 * 2. Se não houver eventos locais: `shouldPublish: false`, reason: "no-events".
 * 3. Consulta o tracker de grupo (`filterEventsToPublish`) para identificar pendências.
 * 4. Calcula o hash atual dos eventos selecionados.
 * 5. Se `force` for verdadeiro: `shouldPublish: true`, reason: "forced".
 * 6. Se não houver pendências e o hash coincidir com `lastHash`: `shouldPublish: false`, reason: "up-to-date".
 * 7. Caso contrário: `shouldPublish: true`, reason: "pending-events".
 */
export function shouldPublishGroupEvents(params: ShouldPublishGroupEventsParams): PublishDecision {
  const { events, groupId, isStrong, tracker, lastHash, force = false, deviceId } = params;

  const myEvents = isStrong
    ? selectStrongGroupPushEvents(events, deviceId)
    : selectOldGroupPushEvents(events, deviceId);

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
