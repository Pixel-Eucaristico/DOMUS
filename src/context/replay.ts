import { EVENT_TYPES, type DomainEvent } from "@packages/events/src/types";
import { diagnosticString, MAX_FUTURE_SKEW_MS } from "@packages/events/src/validateEnvelope";
import { validateLocalEvent, validatePayload, type LocalEnvelopeProblem } from "./replayValidation";
import { domainReducer } from "@packages/domain/src/reducer";
import { createInitialState, type AppState } from "@packages/domain/src/state";
import { GAMIFICATION_EVENTS, type GamificationEvent, type GamificationState } from "@packages/gamification/src/types";
import { gamificationReducer, createInitialGamificationState } from "@packages/gamification/src/reducer";
import { ONBOARDING_EVENTS, type OnboardingEvent, type OnboardingState } from "@packages/onboarding/src/types";
import { onboardingReducer, createInitialOnboardingState } from "@packages/onboarding/src/reducer";
import { SEASON_EVENTS, type SeasonEvent, type SeasonState } from "@packages/season/src/types";
import { seasonReducer, createInitialSeasonState } from "@packages/season/src/reducer";
import { WISHLIST_EVENTS, type WishlistEvent, type WishlistState } from "@packages/wishlist/src/types";
import { wishlistReducer, createInitialWishlistState } from "@packages/wishlist/src/reducer";
import { PERSONALITY_EVENTS } from "@packages/personality/src/types";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { eventTimestampKey, sortEvents } from "@packages/storage/src/eventOrder";
import { isBlankDeviceId } from "./localEventLog";

/**
 * Replay puro do log de eventos (Story 3.2) — sem `react-native`, testável no vitest.
 *
 * Cada evento é aplicado isoladamente: envelope sem a forma mínima, tipo
 * desconhecido, payload sem um campo que o reducer lê ou reducer que lança erro
 * mandam o evento para a Quarentena, sem efeito parcial no estado. A Quarentena
 * é derivada (nunca persistida) e o log não é alterado.
 *
 * A conferência do envelope aqui é a local e tolerante (`validateLocalEvent`),
 * não o `validateEnvelope` estrito do sync: relógio errado não descarta evento.
 */

export type QuarantineKind =
  | "invalid_envelope"
  | "future_timestamp"
  | "unknown_type"
  | "invalid_payload"
  | "reducer_error";

export interface QuarantineEntry {
  /** `id` do evento (cortado para diagnóstico), ou "?" quando ausente. */
  id: string;
  /** `type` do evento (cortado para diagnóstico), ou "?" quando ausente. */
  type: string;
  kind: QuarantineKind;
  /** Motivo legível — nunca contém o conteúdo do payload. */
  reason: string;
}

export interface ReplayResult {
  domain: AppState;
  gamification: GamificationState;
  onboarding: OnboardingState;
  season: SeasonState;
  wishlist: WishlistState;
  quarantine: QuarantineEntry[];
}

export const UNKNOWN_TYPE_REASON = "tipo desconhecido";
export const FUTURE_TIMESTAMP_REASON = "horário no futuro";

const ENVELOPE_REASONS: Record<LocalEnvelopeProblem, string> = {
  not_object: "envelope inválido: não é um objeto",
  invalid_id: "envelope inválido: id ausente ou inválido",
  invalid_type: "envelope inválido: tipo ausente ou inválido",
  invalid_payload: "envelope inválido: payload ausente ou não é objeto",
};

const DOMAIN_TYPES = new Set<string>(Object.values(EVENT_TYPES));
const GAMIFICATION_TYPES = new Set<string>(Object.values(GAMIFICATION_EVENTS));
const ONBOARDING_TYPES = new Set<string>(Object.values(ONBOARDING_EVENTS));
const SEASON_TYPES = new Set<string>(Object.values(SEASON_EVENTS));
const WISHLIST_TYPES = new Set<string>(Object.values(WISHLIST_EVENTS));
const PERSONALITY_TYPES = new Set<string>(Object.values(PERSONALITY_EVENTS));

/** União de todos os mapas de tipos dos pacotes; fora dela = tipo desconhecido. */
export const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set<string>([
  ...DOMAIN_TYPES,
  ...GAMIFICATION_TYPES,
  ...ONBOARDING_TYPES,
  ...SEASON_TYPES,
  ...WISHLIST_TYPES,
  ...PERSONALITY_TYPES,
]);

export const MAX_REASON_LENGTH = 160;

/** Mesmo corte (code points, "…") e escape do diagnóstico da Story 3.1. */
function safeText(value: unknown, max?: number): string {
  return diagnosticString(value, max) ?? "?";
}

function errorReason(err: unknown): string {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : "erro desconhecido no reducer";
  return safeText(`erro no reducer: ${message}`, MAX_REASON_LENGTH);
}

/** Reducers do replay; cada um pode ser trocado só em teste. */
export interface ReplayReducers {
  domain: (state: AppState, event: DomainEvent) => AppState;
  gamification: (state: GamificationState, event: GamificationEvent) => GamificationState;
  onboarding: (state: OnboardingState, event: OnboardingEvent) => OnboardingState;
  season: (state: SeasonState, event: SeasonEvent) => SeasonState;
  wishlist: (state: WishlistState, event: WishlistEvent) => WishlistState;
}

/**
 * Injeção só para teste (Story 3.3): simula uma versão do app que conhece
 * outro conjunto de tipos ou outros reducers. Omitido = o que o app usa.
 */
export interface ReplayOptions {
  /** Tipos conhecidos; fora dele = "tipo desconhecido". Padrão: `KNOWN_EVENT_TYPES`. */
  knownTypes?: ReadonlySet<string>;
  /** Reducers a trocar; os ausentes são os do app. */
  reducers?: Partial<ReplayReducers>;
  /**
   * Story 3.5: "agora" em ms para a regra do horário no futuro. Padrão:
   * `Date.now()` (o teste passa um valor fixo para não depender do relógio).
   */
  now?: number;
  /**
   * Story 3.5: id deste aparelho. Eventos de outro aparelho com horário acima de
   * `referência + MAX_FUTURE_SKEW_MS` vão para a Quarentena, sendo a referência o
   * maior entre `now` e o horário mais recente dos eventos dos outros aparelhos
   * (`futureReferenceResolver`). Ausente/`null` (aparelho
   * ainda não conhecido, modo demo) = a regra não se aplica a nenhum evento, para
   * não esconder os dados do próprio usuário durante a inicialização.
   */
  currentDeviceId?: string | null;
}

/**
 * Story 3.5: evento de outro aparelho com horário acima de `reference + MAX_FUTURE_SKEW_MS`.
 * `reference` é o "agora" de referência para o aparelho do evento (ver
 * `futureReferenceResolver`; num caso isolado, só o `now`). O horário é lido como na
 * ordem do replay (`eventTimestampKey`: texto numérico vira número, não finito vale 0),
 * então só conta como "no futuro" o que de fato passaria na frente na ordenação.
 * `deviceId` vazio/"local" é deste aparelho (como na normalização local). Sem
 * `currentDeviceId`, nunca. Só lê; nunca altera o evento.
 */
export function isFutureForeignEvent(
  event: { timestamp?: unknown; deviceId?: unknown },
  reference: number,
  currentDeviceId: string | null | undefined,
): boolean {
  if (!hasCurrentDevice(currentDeviceId)) return false;
  if (isBlankDeviceId(event.deviceId) || event.deviceId === currentDeviceId) return false;
  return eventTimestampKey(event) > reference + MAX_FUTURE_SKEW_MS;
}

function hasCurrentDevice(currentDeviceId: string | null | undefined): currentDeviceId is string {
  return typeof currentDeviceId === "string" && !isBlankDeviceId(currentDeviceId);
}

/**
 * Aparelho dono do evento: `deviceId` vazio/"local" é o aparelho atual (como na
 * normalização local); o resto é o próprio texto, sem mudar a caixa.
 */
function deviceKeyOf(deviceId: unknown, currentDeviceId: string): string {
  return isBlankDeviceId(deviceId) ? currentDeviceId : (deviceId as string);
}

/**
 * Story 3.5 (decisão do dono, 23/10/2026): referência do "agora" para um evento do
 * aparelho X = `max(now, maior horário entre os eventos do log de qualquer aparelho
 * diferente de X)`. O aparelho atual conta como "outro" para os eventos de fora;
 * `deviceId` vazio/"local" é o aparelho atual. Um aparelho não serve de prova para
 * si mesmo. Entram todos os eventos com envelope válido (inclusive os que acabam em
 * Quarentena), lidos com `eventTimestampKey`.
 *
 * O(n): uma passada guarda o maior horário de cada aparelho e, deles, os dois
 * maiores de aparelhos distintos; o "maior dos outros" de X é o primeiro, ou o
 * segundo quando o primeiro é o próprio X. Pura; não altera a entrada.
 */
export function futureReferenceResolver(
  events: readonly unknown[],
  now: number,
  currentDeviceId: string,
): (deviceId: unknown) => number {
  const maxByDevice = new Map<string, number>();
  for (const raw of events) {
    const checked = validateLocalEvent(raw);
    if (!checked.ok) continue;
    const device = deviceKeyOf(checked.event.deviceId, currentDeviceId);
    const ts = eventTimestampKey(checked.event);
    const prev = maxByDevice.get(device);
    if (prev === undefined || ts > prev) maxByDevice.set(device, ts);
  }

  let firstDevice: string | null = null;
  let first = -Infinity;
  let second = -Infinity;
  for (const [device, ts] of maxByDevice) {
    if (ts > first) {
      second = first;
      first = ts;
      firstDevice = device;
    } else if (ts > second) {
      second = ts;
    }
  }

  return (deviceId: unknown) => {
    const device = deviceKeyOf(deviceId, currentDeviceId);
    const othersMax = device === firstDevice ? second : first;
    return Math.max(now, othersMax);
  };
}

/**
 * Story 3.5: o primeiro instante (ms, relógio deste aparelho) em que um evento hoje em
 * Quarentena por "horário no futuro" passa a valer, com o log como está: o evento de
 * horário `t` vale quando `now ≥ t − MAX_FUTURE_SKEW_MS` (a parte "outros aparelhos"
 * da referência só muda quando o log muda, e então o replay já é refeito). `null`
 * quando nenhum evento está em Quarentena por horário. Mesmas opções do replay.
 */
export function nextFutureReleaseAt(
  events: readonly SyncEvent[],
  options: Pick<ReplayOptions, "now" | "currentDeviceId"> = {},
): number | null {
  const currentDeviceId = options.currentDeviceId ?? null;
  if (!hasCurrentDevice(currentDeviceId)) return null;
  const now = options.now ?? Date.now();
  const referenceFor = futureReferenceResolver(events, now, currentDeviceId);
  let earliest: number | null = null;
  for (const raw of events) {
    const checked = validateLocalEvent(raw);
    if (!checked.ok) continue;
    const evt = checked.event;
    if (!isFutureForeignEvent(evt, referenceFor(evt.deviceId), currentDeviceId)) continue;
    const releaseAt = eventTimestampKey(evt) - MAX_FUTURE_SKEW_MS;
    if (earliest === null || releaseAt < earliest) earliest = releaseAt;
  }
  return earliest;
}

/** Maior atraso aceito por `setTimeout` (2^31 − 1 ms, ~24,8 dias); acima disso ele dispara na hora. */
export const MAX_TIMER_DELAY_MS = 2_147_483_647;

/**
 * Story 3.5: atraso do timer que refaz o replay quando o próximo evento em Quarentena
 * por horário passa a valer. `null` (sem evento) = sem timer. +1 ms para o timer não
 * disparar um instante antes do limite; nunca negativo; no máximo `MAX_TIMER_DELAY_MS`
 * (ao disparar antes do instante, o replay é refeito e um novo timer é marcado).
 */
export function futureReleaseDelayMs(releaseAt: number | null, now: number): number | null {
  if (releaseAt === null || !Number.isFinite(releaseAt)) return null;
  return Math.min(MAX_TIMER_DELAY_MS, Math.max(0, releaseAt - now + 1));
}

/**
 * Story 3.5: opções do replay no `AppStateProvider`. Fora do modo demo, o id deste
 * aparelho (a regra do horário no futuro vale para os eventos de outro aparelho); no
 * modo demo (sandbox), sem id: a regra não se aplica. `now` fica no padrão (`Date.now()`).
 */
export function replayOptionsFor(isDemoActive: boolean, deviceId: string | null): ReplayOptions {
  return isDemoActive ? {} : { currentDeviceId: deviceId };
}

const DEFAULT_REDUCERS: ReplayReducers = {
  domain: domainReducer,
  gamification: gamificationReducer,
  onboarding: onboardingReducer,
  season: seasonReducer,
  wishlist: wishlistReducer,
};

export function replayAllEvents(events: readonly SyncEvent[], options: ReplayOptions = {}): ReplayResult {
  const knownTypes = options.knownTypes ?? KNOWN_EVENT_TYPES;
  const reducers: ReplayReducers = { ...DEFAULT_REDUCERS, ...options.reducers };
  const now = options.now ?? Date.now();
  const currentDeviceId = options.currentDeviceId ?? null;
  // Story 3.5: referência do "agora" por aparelho (decisão do dono); só calculada
  // quando a regra se aplica.
  const referenceFor = hasCurrentDevice(currentDeviceId)
    ? futureReferenceResolver(events, now, currentDeviceId)
    : () => now;
  let domain = createInitialState();
  let gamification = createInitialGamificationState();
  let onboarding = createInitialOnboardingState();
  let season = createInitialSeasonState();
  let wishlist = createInitialWishlistState();
  const quarantine: QuarantineEntry[] = [];

  // Story 3.4: ordem total (timestamp, deviceId, id) numa cópia — o estado não
  // depende da ordem de chegada e o array recebido nunca é alterado.
  for (const raw of sortEvents(events)) {
    const checked = validateLocalEvent(raw);
    if (!checked.ok) {
      const item = raw as unknown as Record<string, unknown> | null;
      const isObj = typeof item === "object" && item !== null;
      quarantine.push({
        id: isObj ? safeText(item.id) : "?",
        type: isObj ? safeText(item.type) : "?",
        kind: "invalid_envelope",
        reason: ENVELOPE_REASONS[checked.problem],
      });
      continue;
    }

    const evt = checked.event;
    const t = evt.type;
    const id = safeText(evt.id);
    const type = safeText(t);

    // Story 3.5: horário de outro aparelho além do limite (contado da referência: o maior
    // entre `now` e o horário mais recente dos outros aparelhos) — fica no log sem mudança
    // e passa a valer sozinho quando a referência alcançar `timestamp − MAX_FUTURE_SKEW_MS`.
    if (isFutureForeignEvent(evt, referenceFor(evt.deviceId), currentDeviceId)) {
      quarantine.push({ id, type, kind: "future_timestamp", reason: FUTURE_TIMESTAMP_REASON });
      continue;
    }

    if (!knownTypes.has(t)) {
      quarantine.push({ id, type, kind: "unknown_type", reason: UNKNOWN_TYPE_REASON });
      continue;
    }

    const badField = validatePayload(t, evt.payload as Record<string, unknown>);
    if (badField !== null) {
      quarantine.push({
        id,
        type,
        kind: "invalid_payload",
        reason: safeText(`payload inválido: campo "${badField}" ausente ou com tipo errado`, MAX_REASON_LENGTH),
      });
      continue;
    }

    // Calcula os próximos estados e só os confirma se nenhum reducer lançar erro.
    try {
      const nextDomain = DOMAIN_TYPES.has(t) ? reducers.domain(domain, evt as unknown as DomainEvent) : domain;
      const nextGamification = GAMIFICATION_TYPES.has(t)
        ? reducers.gamification(gamification, evt as unknown as GamificationEvent)
        : gamification;
      const nextOnboarding = ONBOARDING_TYPES.has(t)
        ? reducers.onboarding(onboarding, evt as unknown as OnboardingEvent)
        : onboarding;
      const nextSeason = SEASON_TYPES.has(t) ? reducers.season(season, evt as unknown as SeasonEvent) : season;
      const nextWishlist = WISHLIST_TYPES.has(t)
        ? reducers.wishlist(wishlist, evt as unknown as WishlistEvent)
        : wishlist;

      domain = nextDomain;
      gamification = nextGamification;
      onboarding = nextOnboarding;
      season = nextSeason;
      wishlist = nextWishlist;
    } catch (err) {
      quarantine.push({ id, type, kind: "reducer_error", reason: errorReason(err) });
    }
  }

  return { domain, gamification, onboarding, season, wishlist, quarantine };
}
