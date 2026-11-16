import { describe, it, expect } from "vitest";
import { computeDomainEventEffects } from "@/src/modules/domainEventEffects";
import { replayAllEvents, replayOptionsFor } from "@/src/context/replay";
import { appendDispatched } from "@/src/context/localEventLog";
import { createInitialState } from "@packages/domain/src/state";
import { createInitialGamificationState } from "@packages/gamification/src/reducer";
import { GAMIFICATION_EVENTS } from "@packages/gamification/src/types";
import { createAccountEvent } from "@packages/domain/src/accounts";
import { createCategoryByNameEvent } from "@packages/domain/src/categories";
import {
  createTransactionEvent,
  updateTransactionEvent,
} from "@packages/domain/src/transactions";
import type { DomainEvent } from "@packages/events/src/types";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const DEVICE_ID = "device-test-1";

function toSyncEvent(evt: {
  id: string;
  type: unknown;
  payload: unknown;
  timestamp: number;
  deviceId?: string;
  signature?: string;
}): SyncEvent {
  return {
    id: evt.id,
    type: evt.type as string,
    payload: evt.payload,
    timestamp: evt.timestamp,
    deviceId: evt.deviceId && evt.deviceId !== "local" ? evt.deviceId : DEVICE_ID,
    signature: evt.signature || "",
  };
}

function createBaseLog(now: Date): { log: SyncEvent[]; accountId: string; categoryId: string } {
  const accEvt = createAccountEvent(
    {
      name: "Conta Principal",
      type: "checking",
      balance: 5000,
    },
    DEVICE_ID,
  );
  const catEvt = createCategoryByNameEvent(
    {
      name: "Alimentação",
      group: "needs",
    },
    DEVICE_ID,
  );
  const accountId = accEvt.payload.id;
  const categoryId = catEvt.payload.id;

  let log: SyncEvent[] = [];
  log = appendDispatched(log, toSyncEvent({ ...accEvt, timestamp: now.getTime() - 2000 }), DEVICE_ID).events;
  log = appendDispatched(log, toSyncEvent({ ...catEvt, timestamp: now.getTime() - 1000 }), DEVICE_ID).events;
  return { log, accountId, categoryId };
}

/**
 * Simula o comportamento de `dispatchDomainEvent`:
 * 1) Captura `prevExistingTx` se `TRANSACTION_UPDATED`
 * 2) Despacha o evento no log (`appendDispatched`)
 * 3) Calcula efeitos via `computeDomainEventEffects`
 * 4) Despacha os eventos de gamificação gerados no log
 */
function simulateDispatchDomainEvent(
  log: SyncEvent[],
  event: DomainEvent,
  now: Date,
  options?: { useClosureSnapshot?: { domain: ReturnType<typeof createInitialState>; gamification: ReturnType<typeof createInitialGamificationState> } },
) {
  let prevExistingTx: { status?: string } | undefined;
  if (event.type === "TRANSACTION_UPDATED") {
    const prevDomain = replayAllEvents(log, replayOptionsFor(false, DEVICE_ID)).domain;
    prevExistingTx = prevDomain.transactions[event.payload.id] as { status?: string } | undefined;
  }

  let nextLog = appendDispatched(log, toSyncEvent(event), DEVICE_ID).events;

  const fallback = options?.useClosureSnapshot ?? {
    domain: createInitialState(),
    gamification: createInitialGamificationState(),
  };

  const effects = computeDomainEventEffects({
    event,
    deviceId: DEVICE_ID,
    useLogEvents: true,
    logEvents: nextLog,
    fallbackDomain: fallback.domain,
    fallbackGamification: fallback.gamification,
    prevExistingTx,
    now,
  });

  for (const gamEvt of effects.gamificationEvents) {
    nextLog = appendDispatched(nextLog, toSyncEvent(gamEvt), DEVICE_ID).events;
  }

  return { log: nextLog, effects };
}

describe("Story 7.7: computeDomainEventEffects", () => {
  it("parcelamento 12x no mesmo ciclo emite cada conquista e troféu mensal uma única vez e totalXp coincide com despachos separados", () => {
    const now = new Date(2026, 10, 15, 12, 0, 0);
    const todayStr = "2026-11-15";

    // Cenário A: laço síncrono com snapshot inicial congelado na closure (como useTransactionForm faz)
    const { log: initialLogA, accountId: accA, categoryId: catA } = createBaseLog(now);
    const initialClosureA = replayAllEvents(initialLogA, replayOptionsFor(false, DEVICE_ID));

    const installments = createTransactionEvent(
      {
        accountId: accA,
        type: "expense",
        amount: 1200,
        categoryId: catA,
        date: todayStr,
        description: "Notebook",
        installments: 12,
        status: "confirmed",
      },
      DEVICE_ID,
    );
    expect(installments).toHaveLength(12);

    let logSync = initialLogA;
    const allAchievementToasts: string[] = [];
    const allMonthlyToasts: string[] = [];

    for (const evt of installments) {
      const res = simulateDispatchDomainEvent(logSync, evt, now, {
        useClosureSnapshot: {
          domain: initialClosureA.domain,
          gamification: initialClosureA.gamification,
        },
      });
      logSync = res.log;
      allAchievementToasts.push(...res.effects.achievementToasts.map((t) => t.achievementId));
      allMonthlyToasts.push(...res.effects.monthlyToasts.map((t) => t.achievementId));
    }

    // Nenhuma conquista ou troféu mensal deve ser emitido mais de uma vez
    expect(allAchievementToasts.length).toBe(new Set(allAchievementToasts).size);
    expect(allAchievementToasts).toContain("first_transaction");
    expect(allAchievementToasts).toContain("ten_transactions");
    expect(allMonthlyToasts.length).toBe(new Set(allMonthlyToasts).size);

    const unlockedEventsInLog = logSync.filter(
      (e) => e.type === GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED,
    );
    const unlockedIdsInLog = unlockedEventsInLog.map(
      (e) => (e.payload as { achievementId: string }).achievementId,
    );
    expect(unlockedIdsInLog.length).toBe(new Set(unlockedIdsInLog).size);

    const monthlyEventsInLog = logSync.filter(
      (e) => e.type === GAMIFICATION_EVENTS.MONTHLY_TROPHY_COMPLETED,
    );
    const monthlyIdsInLog = monthlyEventsInLog.map(
      (e) => (e.payload as { trophyId: string }).trophyId,
    );
    expect(monthlyIdsInLog.length).toBe(new Set(monthlyIdsInLog).size);

    // Respeita a cota diária de 5 transaction_logged
    const xpTransactionEvents = logSync.filter(
      (e) =>
        e.type === GAMIFICATION_EVENTS.XP_GAINED &&
        (e.payload as { source: string }).source === "transaction_logged",
    );
    expect(xpTransactionEvents).toHaveLength(5);

    // Cenário B: 12 despachos separados em ciclos distintos (sem closure congelada)
    const { log: initialLogB, accountId: accB, categoryId: catB } = createBaseLog(now);
    const separateEvents = createTransactionEvent(
      {
        accountId: accB,
        type: "expense",
        amount: 1200,
        categoryId: catB,
        date: todayStr,
        description: "Notebook",
        installments: 12,
        status: "confirmed",
      },
      DEVICE_ID,
    );

    let logSeparate = initialLogB;
    for (const evt of separateEvents) {
      const freshState = replayAllEvents(logSeparate, replayOptionsFor(false, DEVICE_ID));
      const res = simulateDispatchDomainEvent(logSeparate, evt, now, {
        useClosureSnapshot: {
          domain: freshState.domain,
          gamification: freshState.gamification,
        },
      });
      logSeparate = res.log;
    }

    const finalSync = replayAllEvents(logSync, replayOptionsFor(false, DEVICE_ID));
    const finalSeparate = replayAllEvents(logSeparate, replayOptionsFor(false, DEVICE_ID));

    expect(finalSync.gamification.totalXp).toBe(finalSeparate.gamification.totalXp);
    expect(finalSync.gamification.unlockedAchievements.map((a) => a.id)).toEqual(
      finalSeparate.gamification.unlockedAchievements.map((a) => a.id),
    );
  });

  it("sequência de transações recorrentes no mesmo ciclo não duplica conquistas e mantém totalXp idêntico", () => {
    const now = new Date(2026, 10, 15, 14, 0, 0);
    const { log: initialLogA, accountId: accA, categoryId: catA } = createBaseLog(now);
    const initialClosureA = replayAllEvents(initialLogA, replayOptionsFor(false, DEVICE_ID));

    const recurringBatchA = Array.from({ length: 7 }, (_, i) =>
      createTransactionEvent(
        {
          accountId: accA,
          type: "expense",
          amount: 50 + i * 10,
          categoryId: catA,
          date: `2026-11-${String(10 + i).padStart(2, "0")}`,
          description: `Assinatura ${i + 1}`,
          recurrence: "monthly",
          status: "confirmed",
        },
        DEVICE_ID,
      )[0]!,
    );

    let logSync = initialLogA;
    const toastsSync: string[] = [];
    for (const evt of recurringBatchA) {
      const res = simulateDispatchDomainEvent(logSync, evt, now, {
        useClosureSnapshot: {
          domain: initialClosureA.domain,
          gamification: initialClosureA.gamification,
        },
      });
      logSync = res.log;
      toastsSync.push(...res.effects.achievementToasts.map((t) => t.achievementId));
    }

    expect(toastsSync.length).toBe(new Set(toastsSync).size);

    const { log: initialLogB, accountId: accB, categoryId: catB } = createBaseLog(now);
    const recurringBatchB = Array.from({ length: 7 }, (_, i) =>
      createTransactionEvent(
        {
          accountId: accB,
          type: "expense",
          amount: 50 + i * 10,
          categoryId: catB,
          date: `2026-11-${String(10 + i).padStart(2, "0")}`,
          description: `Assinatura ${i + 1}`,
          recurrence: "monthly",
          status: "confirmed",
        },
        DEVICE_ID,
      )[0]!,
    );

    let logSeparate = initialLogB;
    for (const evt of recurringBatchB) {
      const freshState = replayAllEvents(logSeparate, replayOptionsFor(false, DEVICE_ID));
      const res = simulateDispatchDomainEvent(logSeparate, evt, now, {
        useClosureSnapshot: {
          domain: freshState.domain,
          gamification: freshState.gamification,
        },
      });
      logSeparate = res.log;
    }

    const finalSync = replayAllEvents(logSync, replayOptionsFor(false, DEVICE_ID));
    const finalSeparate = replayAllEvents(logSeparate, replayOptionsFor(false, DEVICE_ID));

    expect(finalSync.gamification.totalXp).toBe(finalSeparate.gamification.totalXp);
  });

  it("transição pending -> confirmed via TRANSACTION_UPDATED concede XP e streak usando estado anterior", () => {
    const now = new Date(2026, 10, 15, 15, 0, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);

    const pendingEvt = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 80,
        categoryId,
        date: "2026-11-15",
        description: "Boleto pendente",
        status: "pending",
      },
      DEVICE_ID,
    )[0]!;

    // Criar transação pendente não concede XP nem streak
    const afterCreate = simulateDispatchDomainEvent(baseLog, pendingEvt, now);
    expect(afterCreate.effects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.XP_GAINED)).toBe(false);
    expect(afterCreate.effects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.STREAK_UPDATED)).toBe(false);

    // Confirmar a transação via TRANSACTION_UPDATED deve conceder XP e streak
    const confirmEvt = updateTransactionEvent(
      pendingEvt.payload.id,
      { status: "confirmed" },
      DEVICE_ID,
    );
    const afterConfirm = simulateDispatchDomainEvent(afterCreate.log, confirmEvt, now);

    expect(afterConfirm.effects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.XP_GAINED)).toBe(true);
    expect(afterConfirm.effects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.STREAK_UPDATED)).toBe(false);

    const finalState = replayAllEvents(afterConfirm.log, replayOptionsFor(false, DEVICE_ID));
    expect(finalState.gamification.totalXp).toBeGreaterThan(0);
    expect(finalState.gamification.currentStreak).toBe(1);
  });

  it("modo demo (useLogEvents: false) calcula efeitos sobre fallbackDomain + evento sem depender do log", () => {
    const now = new Date(2026, 10, 15, 16, 0, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);
    const demoState = replayAllEvents(baseLog, replayOptionsFor(false, DEVICE_ID));

    const demoTxEvt = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 100,
        categoryId,
        date: "2026-11-15",
        description: "Despesa demo",
        status: "confirmed",
      },
      "local",
    )[0]!;

    const effects = computeDomainEventEffects({
      event: demoTxEvt,
      deviceId: DEVICE_ID,
      useLogEvents: false,
      logEvents: [], // log vazio não deve impedir cálculo no modo demo
      fallbackDomain: demoState.domain,
      fallbackGamification: demoState.gamification,
      now,
    });

    expect(effects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.XP_GAINED)).toBe(true);
    expect(effects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.STREAK_UPDATED)).toBe(false);
    expect(effects.achievementToasts.map((t) => t.achievementId)).toContain("first_transaction");
  });

  it("modo demo (useLogEvents: false) deriva streak de nextDomain.transactions e desbloqueia streak_3", () => {
    const now = new Date(2026, 10, 15, 16, 30, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);
    const demoState = replayAllEvents(baseLog, replayOptionsFor(false, DEVICE_ID));

    const txDay1 = createTransactionEvent(
      { accountId, type: "expense", amount: 20, categoryId, date: "2026-11-13", status: "confirmed" },
      "local",
    )[0]!;
    const txDay2 = createTransactionEvent(
      { accountId, type: "expense", amount: 25, categoryId, date: "2026-11-14", status: "confirmed" },
      "local",
    )[0]!;
    const txDay3 = createTransactionEvent(
      { accountId, type: "expense", amount: 30, categoryId, date: "2026-11-15", status: "confirmed" },
      "local",
    )[0]!;

    const fallbackDomain = {
      ...demoState.domain,
      transactions: {
        [txDay1.payload.id]: txDay1.payload,
        [txDay2.payload.id]: txDay2.payload,
      },
    };
    const fallbackGamification = {
      ...demoState.gamification,
      currentStreak: 2,
      longestStreak: 2,
      lastActiveDate: "2026-11-14",
    };

    const effects = computeDomainEventEffects({
      event: txDay3,
      deviceId: DEVICE_ID,
      useLogEvents: false,
      logEvents: [],
      fallbackDomain,
      fallbackGamification,
      now,
    });

    expect(effects.achievementToasts.map((t) => t.achievementId)).toContain("streak_3");
  });

  it("evento não-local (deviceId de outro aparelho) não emite efeitos de gamificação", () => {
    const now = new Date(2026, 10, 15, 17, 0, 0);
    const { log, accountId, categoryId } = createBaseLog(now);

    const remoteEvt = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 100,
        categoryId,
        date: "2026-11-15",
        description: "Despesa de outro aparelho",
        status: "confirmed",
      },
      "other-device-999",
    )[0]!;

    const nextLog = appendDispatched(log, toSyncEvent(remoteEvt), DEVICE_ID).events;
    const effects = computeDomainEventEffects({
      event: remoteEvt,
      deviceId: DEVICE_ID,
      useLogEvents: true,
      logEvents: nextLog,
      fallbackDomain: createInitialState(),
      fallbackGamification: createInitialGamificationState(),
      now,
    });

    expect(effects).toEqual({
      gamificationEvents: [],
      leveledUp: false,
      achievementToasts: [],
      monthlyToasts: [],
    });
  });

  it("useLogEvents: true não recorre a fallbackDomain quando prevExistingTx está ausente e trata deviceId vazio como local", () => {
    const now = new Date(2026, 10, 15, 18, 0, 0);
    const { log, accountId, categoryId } = createBaseLog(now);

    const pendingTx = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 50,
        categoryId,
        date: "2026-11-15",
        description: "Antiga pendente na closure",
        status: "pending",
      },
      "",
    )[0]!;

    const staleFallbackDomain = {
      ...createInitialState(),
      transactions: { [pendingTx.payload.id]: pendingTx.payload },
    };

    const confirmMissing = updateTransactionEvent(pendingTx.payload.id, { status: "confirmed" }, "");
    const effects = computeDomainEventEffects({
      event: confirmMissing,
      deviceId: DEVICE_ID,
      useLogEvents: true,
      logEvents: log, // transação não existe no log
      fallbackDomain: staleFallbackDomain,
      fallbackGamification: createInitialGamificationState(),
      prevExistingTx: undefined,
      now,
    });

    expect(effects.gamificationEvents).toEqual([]);

    // deviceId vazio em TRANSACTION_CREATED deve ser tratado como local
    const nextLog = appendDispatched(log, toSyncEvent(pendingTx), DEVICE_ID).events;
    const localConfirmed = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 50,
        categoryId,
        date: "2026-11-15",
        description: "Local com deviceId vazio",
        status: "confirmed",
      },
      "",
    )[0]!;
    const nextLog2 = appendDispatched(nextLog, toSyncEvent(localConfirmed), DEVICE_ID).events;
    const localEffects = computeDomainEventEffects({
      event: localConfirmed,
      deviceId: DEVICE_ID,
      useLogEvents: true,
      logEvents: nextLog2,
      fallbackDomain: createInitialState(),
      fallbackGamification: createInitialGamificationState(),
      now,
    });
    expect(localEffects.gamificationEvents.some((e) => e.type === GAMIFICATION_EVENTS.XP_GAINED)).toBe(true);
  });
});
