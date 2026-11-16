import { describe, it, expect } from "vitest";
import { calculateLevel, getLevelInfo } from "../src/levelEngine";
import { createInitialGamificationState } from "../src/reducer";
import { checkNewAchievements } from "../src/achievements";
import { GAMIFICATION_EVENTS } from "../src/types";
import { createInitialState } from "../../domain/src/state";
import { calculate503020 } from "../../domain/src/transactions";
import { createAccountEvent } from "../../domain/src/accounts";
import { createCategoryByNameEvent } from "../../domain/src/categories";
import { createTransactionEvent } from "../../domain/src/transactions";
import { createInitialWishlistState } from "../../wishlist/src/types";
import type { SyncEvent } from "../../storage/src/eventStore";
import { replayAllEvents, replayOptionsFor } from "../../../src/context/replay";
import { appendDispatched } from "../../../src/context/localEventLog";
import { computeDomainEventEffects } from "../../../src/modules/domainEventEffects";
import { buildFinancialContext } from "../../../src/modules/ai/application/AIContextBuilder";
import {
  buildStaticWelcomeMessage,
  buildWelcomeMessage,
} from "../../../src/modules/ai/application/WelcomeMessageBuilder";
import {
  DEFAULT_AI_DATA_PERMISSIONS,
  DEFAULT_AI_SETTINGS,
} from "../../../src/modules/ai/domain/AISettings";

const DEVICE_A = "device-a";
const DEVICE_B = "device-b";

function toSyncEvent(
  evt: {
    id: string;
    type: unknown;
    payload: unknown;
    timestamp: number;
    deviceId?: string;
    signature?: string;
  },
  fallbackDevice = DEVICE_A,
): SyncEvent {
  return {
    id: evt.id,
    type: evt.type as string,
    payload: evt.payload,
    timestamp: evt.timestamp,
    deviceId: evt.deviceId && evt.deviceId !== "local" ? evt.deviceId : fallbackDevice,
    signature: evt.signature || "",
  };
}

describe("Story 7.8: Derivar o nível do log (totalXp como única fonte da verdade)", () => {
  it("ignora evento LEVEL_UP legado no replayAllEvents sem enviar à Quarentena", () => {
    const baseTime = 1763251200000;
    const events: SyncEvent[] = [
      {
        id: "xp-1",
        type: GAMIFICATION_EVENTS.XP_GAINED,
        payload: { amount: 100, source: "mission_completed" },
        timestamp: baseTime,
        deviceId: DEVICE_A,
        signature: "",
      },
      {
        id: "lvl-legacy-1",
        type: GAMIFICATION_EVENTS.LEVEL_UP,
        payload: { previousLevel: 1, newLevel: 10, totalXp: 100 },
        timestamp: baseTime + 1000,
        deviceId: DEVICE_A,
        signature: "",
      },
    ];

    const replayed = replayAllEvents(events, replayOptionsFor(false, DEVICE_A));
    expect(replayed.quarantine).toHaveLength(0);
    expect(replayed.gamification.totalXp).toBe(100);
    expect(replayed.gamification.level).toBe(calculateLevel(100));
    expect(replayed.gamification.level).toBe(2);
    expect(getLevelInfo(replayed.gamification.totalXp).level).toBe(2);
  });

  it("converge para o mesmo level e levelInfo.level entre dois aparelhos com ordens de chegada diferentes", () => {
    const baseTime = 1763251200000;
    const xpA: SyncEvent = {
      id: "xp-a",
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: { amount: 150, source: "transaction_logged", transactionId: "tx-1" },
      timestamp: baseTime,
      deviceId: DEVICE_A,
      signature: "",
    };
    const xpB: SyncEvent = {
      id: "xp-b",
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: { amount: 250, source: "mission_completed" },
      timestamp: baseTime + 500,
      deviceId: DEVICE_B,
      signature: "",
    };
    const legacyLvl: SyncEvent = {
      id: "lvl-legacy",
      type: GAMIFICATION_EVENTS.LEVEL_UP,
      payload: { previousLevel: 2, newLevel: 99, totalXp: 400 },
      timestamp: baseTime + 1000,
      deviceId: DEVICE_A,
      signature: "",
    };

    const replayA = replayAllEvents(
      [xpA, legacyLvl, xpB],
      replayOptionsFor(false, DEVICE_A),
    );
    const replayB = replayAllEvents(
      [xpB, xpA],
      replayOptionsFor(false, DEVICE_B),
    );

    const expectedLevel = calculateLevel(400);
    expect(expectedLevel).toBe(5);
    expect(replayA.quarantine).toHaveLength(0);
    expect(replayB.quarantine).toHaveLength(0);
    expect(replayA.gamification.level).toBe(expectedLevel);
    expect(replayB.gamification.level).toBe(expectedLevel);
    expect(getLevelInfo(replayA.gamification.totalXp).level).toBe(expectedLevel);
    expect(getLevelInfo(replayB.gamification.totalXp).level).toBe(expectedLevel);
  });

  it("leitores de nível (AIContextBuilder, ConsultantChatUseCase, WelcomeMessageBuilder, achievementChecker) usam calculateLevel(totalXp)", async () => {
    // 400 XP -> nível 5, mas campo `level` propositalmente desatualizado como 1
    const staleGamification = {
      ...createInitialGamificationState(),
      totalXp: 400,
      seasonXp: 400,
      level: 1,
    };

    const permissions = { ...DEFAULT_AI_DATA_PERMISSIONS, gamification: true };
    const contextData = {
      transactions: [],
      accounts: [],
      categories: {},
      invoices: {},
      wishlist: createInitialWishlistState(),
      gamification: staleGamification,
      sync: {
        inGroup: false,
        eventCount: 0,
        relayCount: 0,
        isAutoSyncEnabled: false,
        lastSyncTime: null,
      },
    };

    const financialContext = buildFinancialContext(permissions, contextData);
    expect(financialContext).toContain("Nivel: 5");

    const welcomeStatic = buildStaticWelcomeMessage(contextData, {
      ...DEFAULT_AI_SETTINGS,
      isEnabled: false,
      dataPermissions: permissions,
    });
    expect(welcomeStatic).toContain("Nível **5**");

    const welcomeMsg = buildWelcomeMessage(
      permissions,
      [],
      [],
      staleGamification,
      createInitialWishlistState(),
    );
    expect(welcomeMsg).toContain("Nível **5**");

    const domain = createInitialState();
    const budget = calculate503020([], {}, 11, 2026);
    const unlocked = checkNewAchievements(
      domain,
      staleGamification,
      budget,
      new Set(),
    );
    expect(unlocked.some((a) => a.id === "level_5")).toBe(true);
  });

  it("computeDomainEventEffects retorna leveledUp: true ao cruzar limiar de nível sem emitir evento LEVEL_UP", () => {
    const now = new Date(2026, 10, 15, 12, 0, 0);
    const accEvt = createAccountEvent(
      { name: "Conta Principal", type: "checking", balance: 1000 },
      DEVICE_A,
    );
    const catEvt = createCategoryByNameEvent(
      { name: "Alimentação", group: "needs" },
      DEVICE_A,
    );

    let log: SyncEvent[] = [];
    log = appendDispatched(log, toSyncEvent({ ...accEvt, timestamp: now.getTime() - 3000 }), DEVICE_A).events;
    log = appendDispatched(log, toSyncEvent({ ...catEvt, timestamp: now.getTime() - 2000 }), DEVICE_A).events;
    // Começa com 95 XP (nível 1). Uma transação confirmada dá >= 5 XP (total >= 100 XP -> nível 2).
    log = appendDispatched(
      log,
      {
        id: "seed-xp-95",
        type: GAMIFICATION_EVENTS.XP_GAINED,
        payload: { amount: 95, source: "mission_completed" },
        timestamp: now.getTime() - 1000,
        deviceId: DEVICE_A,
        signature: "",
      },
      DEVICE_A,
    ).events;

    const [txEvt] = createTransactionEvent(
      {
        accountId: accEvt.payload.id,
        type: "expense",
        amount: 50,
        categoryId: catEvt.payload.id,
        description: "Mercado",
        date: "2026-11-15",
        status: "confirmed",
      },
      DEVICE_A,
    );
    log = appendDispatched(log, toSyncEvent(txEvt), DEVICE_A).events;

    const effects = computeDomainEventEffects({
      event: txEvt,
      deviceId: DEVICE_A,
      useLogEvents: true,
      logEvents: log,
      fallbackDomain: createInitialState(),
      fallbackGamification: createInitialGamificationState(),
      now,
    });

    expect(effects.leveledUp).toBe(true);
    expect(effects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.LEVEL_UP)).toBe(false);
    expect(effects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.XP_GAINED)).toBe(true);
  });
});
