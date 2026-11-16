import { describe, it, expect } from "vitest";
import {
  gamificationReducer,
  createInitialGamificationState,
} from "../src/reducer";
import { GAMIFICATION_EVENTS, type GamificationEvent } from "../src/types";
import { computeDomainEventEffects } from "@/src/modules/domainEventEffects";
import { replayAllEvents, replayOptionsFor } from "@/src/context/replay";
import { appendDispatched } from "@/src/context/localEventLog";
import { createInitialState } from "@packages/domain/src/state";
import { createAccountEvent } from "@packages/domain/src/accounts";
import { createCategoryByNameEvent } from "@packages/domain/src/categories";
import {
  createTransactionEvent,
  updateTransactionEvent,
  deleteTransactionEvent,
} from "@packages/domain/src/transactions";
import type { DomainEvent } from "@packages/events/src/types";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const DEVICE_ID = "device-xp-reversal";

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
    { name: "Conta Principal", type: "checking", balance: 5000 },
    DEVICE_ID,
  );
  const catEvt = createCategoryByNameEvent(
    { name: "Alimentação", group: "needs" },
    DEVICE_ID,
  );

  let log: SyncEvent[] = [];
  log = appendDispatched(log, toSyncEvent({ ...accEvt, timestamp: now.getTime() - 2000 }), DEVICE_ID).events;
  log = appendDispatched(log, toSyncEvent({ ...catEvt, timestamp: now.getTime() - 1000 }), DEVICE_ID).events;
  return { log, accountId: accEvt.payload.id, categoryId: catEvt.payload.id };
}

function dispatchWithEffects(log: SyncEvent[], event: DomainEvent, now: Date) {
  let prevExistingTx: { status?: string } | undefined;
  if (event.type === "TRANSACTION_UPDATED") {
    const prevDomain = replayAllEvents(log, replayOptionsFor(false, DEVICE_ID)).domain;
    prevExistingTx = prevDomain.transactions[event.payload.id] as { status?: string } | undefined;
  }

  let nextLog = appendDispatched(log, toSyncEvent(event), DEVICE_ID).events;
  const effects = computeDomainEventEffects({
    event,
    deviceId: DEVICE_ID,
    useLogEvents: true,
    logEvents: nextLog,
    fallbackDomain: createInitialState(),
    fallbackGamification: createInitialGamificationState(),
    prevExistingTx,
    now,
  });

  for (const gamEvt of effects.gamificationEvents) {
    nextLog = appendDispatched(nextLog, toSyncEvent(gamEvt), DEVICE_ID).events;
  }

  return {
    log: nextLog,
    effects,
    replayed: replayAllEvents(nextLog, replayOptionsFor(false, DEVICE_ID)),
  };
}

function getTxXpEvents(effects: ReturnType<typeof computeDomainEventEffects>) {
  return effects.gamificationEvents.filter(
    (e): e is Extract<GamificationEvent, { type: typeof GAMIFICATION_EVENTS.XP_GAINED }> =>
      e.type === GAMIFICATION_EVENTS.XP_GAINED,
  );
}

describe("Story 7.10: gamificationReducer XP reversal & idempotency", () => {
  it("registra transactionId no xpHistory e permite estorno único por transactionId sem bloquear por processedTransactionIds", () => {
    let state = createInitialGamificationState();

    const grantEvt: GamificationEvent = {
      id: "gam-grant-1",
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: {
        amount: 10,
        source: "transaction_logged",
        transactionId: "tx-1",
      },
      timestamp: 1_000,
      deviceId: DEVICE_ID,
      signature: "",
    };

    state = gamificationReducer(state, grantEvt);
    expect(state.totalXp).toBe(10);
    expect(state.seasonXp).toBe(10);
    expect(state.processedTransactionIds).toContain("tx-1");
    expect(state.xpHistory).toEqual([
      {
        amount: 10,
        source: "transaction_logged",
        timestamp: 1_000,
        transactionId: "tx-1",
      },
    ]);

    // Estorno negativo com o mesmo transactionId deve ser aplicado exatamente uma vez
    const reversalEvt1: GamificationEvent = {
      id: "gam-rev-1",
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: {
        amount: -10,
        source: "transaction_logged",
        transactionId: "tx-1",
      },
      timestamp: 2_000,
      deviceId: DEVICE_ID,
      signature: "",
    };

    state = gamificationReducer(state, reversalEvt1);
    expect(state.totalXp).toBe(0);
    expect(state.seasonXp).toBe(0);
    expect(state.reversedTransactionIds).toContain("tx-1");

    // Segundo estorno com event.id diferente mas mesmo transactionId deve ser ignorado
    const reversalEvt2: GamificationEvent = {
      id: "gam-rev-2",
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: {
        amount: -10,
        source: "transaction_logged",
        transactionId: "tx-1",
      },
      timestamp: 3_000,
      deviceId: DEVICE_ID,
      signature: "",
    };

    const stateAfterDup = gamificationReducer(state, reversalEvt2);
    expect(stateAfterDup).toBe(state);
    expect(stateAfterDup.totalXp).toBe(0);
  });

  it("nunca permite totalXp ou seasonXp negativos mesmo com estorno maior que o saldo atual", () => {
    let state = createInitialGamificationState();
    state = gamificationReducer(state, {
      id: "gam-grant-small",
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: { amount: 5, source: "transaction_logged", transactionId: "tx-small" },
      timestamp: 1_000,
      deviceId: DEVICE_ID,
      signature: "",
    });
    state = gamificationReducer(state, {
      id: "gam-rev-big",
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: { amount: -20, source: "transaction_logged", transactionId: "tx-small" },
      timestamp: 2_000,
      deviceId: DEVICE_ID,
      signature: "",
    });

    expect(state.totalXp).toBe(0);
    expect(state.seasonXp).toBe(0);
    expect(state.level).toBe(1);
  });
});

describe("Story 7.10: Criar e excluir uma transação deixa o XP igual", () => {
  it("criar e excluir receita de R$ 3.000 num mês vazio (+10 XP) e repetir o ciclo não aumenta o XP", () => {
    const now = new Date(2026, 10, 16, 12, 0, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);
    let log = baseLog;

    // Ciclo 1: cria receita R$ 3.000 (+10 XP de transação) e exclui (-10 XP)
    const [tx1Create] = createTransactionEvent(
      {
        accountId,
        type: "income",
        amount: 3000,
        categoryId,
        date: "2026-11-16",
        description: "Salário",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const res1Create = dispatchWithEffects(log, tx1Create, now);
    log = res1Create.log;
    expect(getTxXpEvents(res1Create.effects)).toHaveLength(1);
    expect(getTxXpEvents(res1Create.effects)[0].payload.amount).toBe(10);

    const tx1Delete = deleteTransactionEvent(tx1Create.payload.id, DEVICE_ID);
    const res1Delete = dispatchWithEffects(log, tx1Delete, now);
    log = res1Delete.log;
    expect(getTxXpEvents(res1Delete.effects)).toHaveLength(1);
    expect(getTxXpEvents(res1Delete.effects)[0].payload.amount).toBe(-10);

    const xpBaseline = res1Delete.replayed.gamification.totalXp;

    // Ciclo 2: cria outra receita R$ 3.000 (+10 XP) e exclui (-10 XP) -> volta exatamente ao xpBaseline
    const [tx2Create] = createTransactionEvent(
      {
        accountId,
        type: "income",
        amount: 3000,
        categoryId,
        date: "2026-11-16",
        description: "Salário 2",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const res2Create = dispatchWithEffects(log, tx2Create, now);
    log = res2Create.log;
    expect(res2Create.replayed.gamification.totalXp).toBe(xpBaseline + 10);

    const tx2Delete = deleteTransactionEvent(tx2Create.payload.id, DEVICE_ID);
    const res2Delete = dispatchWithEffects(log, tx2Delete, now);
    log = res2Delete.log;
    expect(res2Delete.replayed.gamification.totalXp).toBe(xpBaseline);

    // Ciclo 3: repetir novamente não gera ganho líquido de XP
    const [tx3Create] = createTransactionEvent(
      {
        accountId,
        type: "income",
        amount: 3000,
        categoryId,
        date: "2026-11-16",
        description: "Salário 3",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const res3Create = dispatchWithEffects(log, tx3Create, now);
    log = res3Create.log;
    expect(res3Create.replayed.gamification.totalXp).toBe(xpBaseline + 10);

    const tx3Delete = deleteTransactionEvent(tx3Create.payload.id, DEVICE_ID);
    const res3Delete = dispatchWithEffects(log, tx3Delete, now);
    expect(res3Delete.replayed.gamification.totalXp).toBe(xpBaseline);
  });

  it("criar, editar e excluir a mesma transação desfaz exatamente o XP pago na criação", () => {
    const now = new Date(2026, 10, 16, 12, 0, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);

    // Garante conquista first_transaction já desbloqueada antes da transação sob teste
    const [seedTx] = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 50,
        categoryId,
        date: "2026-09-01",
        description: "Seed anterior",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const seedRes = dispatchWithEffects(baseLog, seedTx, new Date(2026, 8, 1, 12, 0, 0));
    const initialXp = seedRes.replayed.gamification.totalXp;

    const [txCreate] = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 120,
        categoryId,
        date: "2026-11-16",
        description: "Mercado",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const resCreate = dispatchWithEffects(seedRes.log, txCreate, now);
    const xpAfterCreate = resCreate.replayed.gamification.totalXp;
    expect(xpAfterCreate).toBe(initialXp + 5);

    const txUpdate = updateTransactionEvent(
      txCreate.payload.id,
      { amount: 250, description: "Mercado atualizado" },
      DEVICE_ID,
    );
    const resUpdate = dispatchWithEffects(resCreate.log, txUpdate, now);
    expect(resUpdate.effects.gamificationEvents).toHaveLength(0);
    expect(resUpdate.replayed.gamification.totalXp).toBe(xpAfterCreate);

    const txDelete = deleteTransactionEvent(txCreate.payload.id, DEVICE_ID);
    const resDelete = dispatchWithEffects(resUpdate.log, txDelete, now);
    expect(resDelete.replayed.gamification.totalXp).toBe(initialXp);
  });

  it("lançamento retroativo de mês anterior criado e excluído devolve o XP ao valor anterior", () => {
    const now = new Date(2026, 10, 16, 12, 0, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);

    const [seedTx] = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 50,
        categoryId,
        date: "2026-09-01",
        description: "Seed anterior",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const seedRes = dispatchWithEffects(baseLog, seedTx, new Date(2026, 8, 1, 12, 0, 0));
    const initialXp = seedRes.replayed.gamification.totalXp;

    const [retroCreate] = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 80,
        categoryId,
        date: "2026-10-05",
        description: "Compra retroativa",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const resCreate = dispatchWithEffects(seedRes.log, retroCreate, now);
    expect(resCreate.replayed.gamification.totalXp).toBe(initialXp + 5);

    const retroDelete = deleteTransactionEvent(retroCreate.payload.id, DEVICE_ID);
    const resDelete = dispatchWithEffects(resCreate.log, retroDelete, now);
    expect(resDelete.replayed.gamification.totalXp).toBe(initialXp);
  });

  it("transação legada sem transactionId no xpHistory não emite estorno ao ser excluída", () => {
    const now = new Date(2026, 10, 16, 12, 0, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);

    const [legacyTx] = createTransactionEvent(
      {
        accountId,
        type: "income",
        amount: 3000,
        categoryId,
        date: "2026-11-16",
        description: "Legado",
        status: "confirmed",
      },
      DEVICE_ID,
    );

    // Simula evento histórico gravado antes desta mudança (sem transactionId)
    const legacyXpEvent = {
      id: "gam-legacy-1",
      type: GAMIFICATION_EVENTS.XP_GAINED,
      payload: {
        amount: 10,
        source: "transaction_logged",
      },
      timestamp: now.getTime(),
      deviceId: DEVICE_ID,
      signature: "",
    };

    let log = appendDispatched(baseLog, toSyncEvent(legacyTx), DEVICE_ID).events;
    log = appendDispatched(log, toSyncEvent(legacyXpEvent), DEVICE_ID).events;

    const xpBeforeDelete = replayAllEvents(log, replayOptionsFor(false, DEVICE_ID)).gamification.totalXp;
    expect(xpBeforeDelete).toBe(10);

    const delEvt = deleteTransactionEvent(legacyTx.payload.id, DEVICE_ID);
    const resDelete = dispatchWithEffects(log, delEvt, now);
    expect(resDelete.effects.gamificationEvents).toHaveLength(0);
    expect(resDelete.replayed.gamification.totalXp).toBe(10);
  });

  it("exclusão duplicada para o mesmo transactionId não estorna duas vezes", () => {
    const now = new Date(2026, 10, 16, 12, 0, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);

    const [txCreate] = createTransactionEvent(
      {
        accountId,
        type: "income",
        amount: 3000,
        categoryId,
        date: "2026-11-16",
        description: "Receita",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const resCreate = dispatchWithEffects(baseLog, txCreate, now);

    const del1 = deleteTransactionEvent(txCreate.payload.id, DEVICE_ID);
    const resDel1 = dispatchWithEffects(resCreate.log, del1, now);
    const xpAfterFirstDelete = resDel1.replayed.gamification.totalXp;
    expect(getTxXpEvents(resDel1.effects)).toHaveLength(1);
    expect(getTxXpEvents(resDel1.effects)[0].payload.amount).toBe(-10);

    const del2 = deleteTransactionEvent(txCreate.payload.id, DEVICE_ID);
    const resDel2 = dispatchWithEffects(resDel1.log, del2, now);
    expect(resDel2.effects.gamificationEvents).toHaveLength(0);
    expect(resDel2.replayed.gamification.totalXp).toBe(xpAfterFirstDelete);
  });

  it("estornos negativos no mesmo dia não consomem a cota diária de 5 concessões e pendentes excluídas não geram estorno", () => {
    const now = new Date(2026, 10, 16, 12, 0, 0);
    const { log: baseLog, accountId, categoryId } = createBaseLog(now);
    let log = baseLog;

    // 3 ciclos de criar e excluir no mesmo dia geram 3 entradas positivas e 3 negativas no xpHistory
    for (let i = 0; i < 3; i++) {
      const [c] = createTransactionEvent(
        {
          accountId,
          type: "expense",
          amount: 20,
          categoryId,
          date: "2026-11-16",
          description: `Ciclo ${i}`,
          status: "confirmed",
        },
        DEVICE_ID,
      );
      log = dispatchWithEffects(log, c, now).log;
      log = dispatchWithEffects(log, deleteTransactionEvent(c.payload.id, DEVICE_ID), now).log;
    }

    // 4a transação válida ainda deve receber XP (apenas 3 concessões positivas hoje < 5)
    const [validTx] = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 20,
        categoryId,
        date: "2026-11-16",
        description: "Válida",
        status: "confirmed",
      },
      DEVICE_ID,
    );
    const validRes = dispatchWithEffects(log, validTx, now);
    expect(getTxXpEvents(validRes.effects)).toHaveLength(1);
    expect(getTxXpEvents(validRes.effects)[0].payload.amount).toBeGreaterThan(0);

    // Transação pendente excluída nunca recebeu XP e não deve gerar estorno
    const [pendingTx] = createTransactionEvent(
      {
        accountId,
        type: "expense",
        amount: 50,
        categoryId,
        date: "2026-11-16",
        description: "Pendente",
        status: "pending",
      },
      DEVICE_ID,
    );
    const pendingCreate = dispatchWithEffects(validRes.log, pendingTx, now);
    expect(getTxXpEvents(pendingCreate.effects)).toHaveLength(0);
    const pendingDel = dispatchWithEffects(
      pendingCreate.log,
      deleteTransactionEvent(pendingTx.payload.id, DEVICE_ID),
      now,
    );
    expect(getTxXpEvents(pendingDel.effects)).toHaveLength(0);
  });
});
