import { EVENT_TYPES, type DomainEvent } from "@packages/events/src/types";
import { diagnosticString } from "@packages/events/src/validateEnvelope";
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
import { sortEvents } from "@packages/storage/src/eventOrder";

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

export type QuarantineKind = "invalid_envelope" | "unknown_type" | "invalid_payload" | "reducer_error";

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
