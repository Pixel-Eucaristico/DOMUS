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

// ── Story 5.8: Marcadores de Controle de Reset e Restauração ─────────────────

export const RESET_MARKER_EVENT_TYPE = "SYNC_RESET_RECORDED";

export interface ResetMarkerPayload {
  action: "reset" | "restore";
  deviceId: string;
  timestamp: number;
  clearedEventIds: string[];
  clearedBefore: number;
}

export interface CreateResetMarkerEventParams {
  action: "reset" | "restore";
  deviceId: string;
  clearedEventIds: readonly string[];
  clearedBefore?: number;
  timestamp?: number;
  id?: string;
  signature?: string;
}

/**
 * Story 5.8: Constrói o envelope de um evento marcador de controle (SYNC_RESET_RECORDED).
 */
export function createResetMarkerEvent(params: CreateResetMarkerEventParams): SyncEvent {
  const timestamp = params.timestamp ?? Date.now();
  const clearedBefore = params.clearedBefore ?? timestamp;
  const payload: ResetMarkerPayload = {
    action: params.action,
    deviceId: params.deviceId,
    timestamp,
    clearedEventIds: [...params.clearedEventIds],
    clearedBefore,
  };
  return {
    id: params.id ?? `marker-${params.action}-${params.deviceId}-${timestamp}`,
    type: RESET_MARKER_EVENT_TYPE,
    payload,
    timestamp,
    deviceId: params.deviceId,
    signature: params.signature ?? "",
  };
}

export interface FilterEventsAgainstMarkersParams {
  incomingEvents: readonly SyncEvent[];
  markers?: readonly (ResetMarkerPayload | SyncEvent)[];
  isStrong?: boolean;
}

/**
 * Story 5.8: Filtra eventos recebidos contra marcadores de reset/restauração ativos.
 * - Rejeita e ignora marcadores originários do Grupo antigo (!isStrong).
 * - Suprime eventos contidos em clearedEventIds de marcadores autenticados do Grupo forte.
 * - Preserva integralmente eventos concorrentes de outros aparelhos (deviceId !== marker.deviceId não listados em clearedEventIds).
 */
export function filterEventsAgainstMarkers(params: FilterEventsAgainstMarkersParams): SyncEvent[] {
  const { incomingEvents, markers = [], isStrong = true } = params;

  // Marcador do Grupo antigo é rejeitado de imediato
  if (!isStrong) {
    return [...incomingEvents];
  }

  if (!markers || markers.length === 0) {
    return [...incomingEvents];
  }

  const clearedSet = new Set<string>();
  for (const m of markers) {
    if (!m || typeof m !== "object") continue;
    if ("clearedEventIds" in m && Array.isArray(m.clearedEventIds)) {
      for (const id of m.clearedEventIds) {
        if (typeof id === "string") clearedSet.add(id);
      }
    } else if ("type" in m && m.type === RESET_MARKER_EVENT_TYPE && m.payload) {
      let payload: ResetMarkerPayload | undefined;
      try {
        payload = (typeof m.payload === "string" ? JSON.parse(m.payload) : m.payload) as ResetMarkerPayload;
      } catch {
        payload = undefined;
      }
      if (payload && typeof payload === "object" && Array.isArray(payload.clearedEventIds)) {
        for (const id of payload.clearedEventIds) {
          if (typeof id === "string") clearedSet.add(id);
        }
      }
    }
  }

  if (clearedSet.size === 0) {
    return incomingEvents.filter((evt) => evt && typeof evt.id === "string");
  }

  return incomingEvents.filter((evt) => evt && typeof evt.id === "string" && !clearedSet.has(evt.id));
}

// ── Story 5.9: Pedir Confirmação Antes de Apagar por Marcador Remoto ──────────

export const RESET_MARKER_PROMPT_TITLES = {
  reset: "Redefinição solicitada no grupo",
  restore: "Restauração solicitada no grupo",
} as const;

export const RESET_MARKER_PROMPT_MESSAGES = {
  reset: "Outro aparelho do grupo redefiniu os dados. Deseja apagar os dados locais deste aparelho?",
  restore: "Outro aparelho do grupo restaurou um backup. Deseja apagar os dados locais para sincronizar com a restauração?",
} as const;

export const RESET_MARKER_PROMPT_CONFIRM_LABEL = "Apagar dados";
export const RESET_MARKER_PROMPT_CANCEL_LABEL = "Manter dados";

export interface ResetMarkerPromptResult {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
}

/**
 * Story 5.9: Formata os parâmetros do diálogo appConfirm para confirmação de marcador de reset/restauração.
 */
export function formatResetMarkerPrompt(payload: ResetMarkerPayload): ResetMarkerPromptResult {
  const isRestore = payload.action === "restore";
  return {
    title: isRestore ? RESET_MARKER_PROMPT_TITLES.restore : RESET_MARKER_PROMPT_TITLES.reset,
    message: isRestore ? RESET_MARKER_PROMPT_MESSAGES.restore : RESET_MARKER_PROMPT_MESSAGES.reset,
    confirmLabel: RESET_MARKER_PROMPT_CONFIRM_LABEL,
    cancelLabel: RESET_MARKER_PROMPT_CANCEL_LABEL,
    destructive: true,
  };
}

/**
 * Story 5.9: Alias de compatibilidade para formatação de mensagem de prompt de marcador.
 */
export function formatResetMarkerPromptMessage(marker: ResetMarkerPayload): ResetMarkerPromptResult {
  return formatResetMarkerPrompt(marker);
}

/**
 * Story 5.9: Extrai o identificador canônico de um marcador de controle.
 * Retorna preferencialmente o ID canônico sintético baseado no payload
 * (`marker-${action}-${deviceId}-${timestamp}`) sempre que o payload estiver presente.
 */
export function getResetMarkerId(marker: ResetMarkerPayload | SyncEvent): string {
  if (!marker || typeof marker !== "object") return "";

  let payload: any = marker;
  if ("payload" in marker && marker.payload) {
    payload = typeof marker.payload === "string" ? (() => {
      try { return JSON.parse(marker.payload); } catch { return null; }
    })() : marker.payload;
  }

  if (payload && typeof payload === "object" && (payload.action === "reset" || payload.action === "restore" || payload.deviceId)) {
    const action = payload.action ?? "reset";
    const deviceId = payload.deviceId ?? "";
    const timestamp = payload.timestamp ?? ("timestamp" in marker ? (marker as SyncEvent).timestamp : 0);
    return `marker-${action}-${deviceId}-${timestamp}`;
  }

  if ("id" in marker && typeof (marker as any).id === "string" && (marker as any).id) {
    return (marker as any).id;
  }

  return "";
}

export interface ShouldPromptForRemoteResetMarkerParams {
  marker: ResetMarkerPayload | SyncEvent;
  currentDeviceId: string | null;
  isStrong?: boolean;
  handledMarkerIds: ReadonlySet<string>;
}

/**
 * Story 5.9: Avalia se um marcador de controle remoto exige apresentação de confirmação ao usuário.
 *
 * Regras:
 * 1. Canal legado (isStrong === false) jamais aciona diálogo e é rejeitado de imediato.
 * 2. Marcador do próprio aparelho (deviceId === currentDeviceId) é ignorado silenciosamente.
 * 3. Marcador já tratado anteriormente (presente em handledMarkerIds por id explícito ou canônico) não pergunta de novo.
 * 4. Marcadores inválidos, com clearedEventIds que não seja array ou com action diferente de "reset" | "restore" são rejeitados.
 * 5. Caso contrário, retorna true para solicitar confirmação explícita via appConfirm.
 */
export function shouldPromptForRemoteResetMarker(params: ShouldPromptForRemoteResetMarkerParams): boolean {
  const { marker, currentDeviceId, isStrong = true, handledMarkerIds } = params;

  if (isStrong === false) {
    return false;
  }

  if (!marker || typeof marker !== "object") {
    return false;
  }

  let action: string | undefined;
  let markerDeviceId: string | undefined;
  let timestamp: number | undefined;
  let explicitId: string | undefined;
  let clearedEventIds: unknown;

  if ("type" in marker) {
    if (marker.type !== RESET_MARKER_EVENT_TYPE) {
      return false;
    }
    explicitId = marker.id;
    let payload = marker.payload;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return false;
      }
    }
    if (!payload || typeof payload !== "object") {
      return false;
    }
    action = (payload as any).action;
    markerDeviceId = marker.deviceId || (payload as any).deviceId;
    timestamp = (payload as any).timestamp ?? marker.timestamp;
    clearedEventIds = (payload as any).clearedEventIds;
  } else {
    action = marker.action;
    markerDeviceId = marker.deviceId;
    timestamp = marker.timestamp;
    explicitId = (marker as any).id;
    clearedEventIds = marker.clearedEventIds;
  }

  if (!Array.isArray(clearedEventIds)) {
    return false;
  }

  if (action !== "reset" && action !== "restore") {
    return false;
  }

  if (markerDeviceId && currentDeviceId && markerDeviceId === currentDeviceId) {
    return false;
  }

  if (explicitId && handledMarkerIds.has(explicitId)) {
    return false;
  }

  const synthId = `marker-${action}-${markerDeviceId ?? ""}-${timestamp ?? 0}`;
  if (handledMarkerIds.has(synthId)) {
    return false;
  }

  return true;
}


