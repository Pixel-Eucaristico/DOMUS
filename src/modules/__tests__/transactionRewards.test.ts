import { describe, it, expect } from "vitest";
import { transactionRewardEligibility } from "../transactionRewards";
import { replayAllEvents } from "@/src/context/replay";
import { EVENT_TYPES } from "@packages/events/src/types";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const YES = { awardXp: true, updateStreak: true };
const NO = { awardXp: false, updateStreak: false };

describe("Story 7.4: transactionRewardEligibility", () => {
  it("criar pendente não concede", () => {
    expect(
      transactionRewardEligibility({ eventType: "TRANSACTION_CREATED", payload: { status: "pending" } }),
    ).toEqual(NO);
  });
  it("criar confirmada ou sem status concede", () => {
    expect(
      transactionRewardEligibility({ eventType: "TRANSACTION_CREATED", payload: { status: "confirmed" } }),
    ).toEqual(YES);
    expect(transactionRewardEligibility({ eventType: "TRANSACTION_CREATED", payload: {} })).toEqual(YES);
  });
  it("confirmar pendente concede", () => {
    expect(
      transactionRewardEligibility({
        eventType: "TRANSACTION_UPDATED",
        payload: { status: "confirmed" },
        existing: { status: "pending" },
      }),
    ).toEqual(YES);
  });
  it("editar confirmada não concede", () => {
    expect(
      transactionRewardEligibility({
        eventType: "TRANSACTION_UPDATED",
        payload: { status: "confirmed" },
        existing: { status: "confirmed" },
      }),
    ).toEqual(NO);
    expect(
      transactionRewardEligibility({ eventType: "TRANSACTION_UPDATED", payload: {}, existing: {} }),
    ).toEqual(NO);
  });
  it("editar pendente mantendo pendente não concede", () => {
    expect(
      transactionRewardEligibility({
        eventType: "TRANSACTION_UPDATED",
        payload: {},
        existing: { status: "pending" },
      }),
    ).toEqual(NO);
  });
  it("atualizar inexistente não concede", () => {
    expect(
      transactionRewardEligibility({
        eventType: "TRANSACTION_UPDATED",
        payload: { status: "confirmed" },
        existing: undefined,
      }),
    ).toEqual(NO);
  });
  it("status desconhecido não concede (criar ou atualizar)", () => {
    expect(
      transactionRewardEligibility({ eventType: "TRANSACTION_CREATED", payload: { status: "cancelled" } }),
    ).toEqual(NO);
    expect(
      transactionRewardEligibility({
        eventType: "TRANSACTION_UPDATED",
        payload: { status: "cancelled" },
        existing: { status: "pending" },
      }),
    ).toEqual(NO);
  });
  it("excluir não concede", () => {
    expect(transactionRewardEligibility({ eventType: "TRANSACTION_DELETED", payload: {} })).toEqual(NO);
    expect(
      transactionRewardEligibility({
        eventType: "TRANSACTION_DELETED",
        payload: {},
        existing: { status: "pending" },
      }),
    ).toEqual(NO);
  });
});

describe("Story 7.4: replay do XP de transação pendente", () => {
  let n = 0;
  const ev = (type: string, payload: unknown, ts: number): SyncEvent => ({
    id: `e-${++n}`,
    type,
    payload: payload as never,
    timestamp: ts,
    deviceId: "dev-a",
    signature: "",
  });
  const xp = (txId: string, ts: number) =>
    ev("XP_GAINED", { amount: 10, source: "transaction_logged", transactionId: txId }, ts);
  const created = ev(
    EVENT_TYPES.TRANSACTION_CREATED as string,
    {
      id: "tx-p",
      accountId: "acc-1",
      type: "income",
      amount: 5000,
      categoryId: "outros",
      date: "2026-11-05",
      description: "Aporte poupança: Meta (mensal)",
      status: "pending",
    },
    1_000,
  );
  const confirm = ev(EVENT_TYPES.TRANSACTION_UPDATED as string, { id: "tx-p", status: "confirmed" }, 2_000);

  it("pendente sem XP_GAINED não soma XP", () => {
    expect(replayAllEvents([created]).gamification.totalXp).toBe(0);
  });
  it("confirmação com XP_GAINED soma uma vez, mesmo com XP_GAINED duplicado", () => {
    expect(replayAllEvents([created, confirm, xp("tx-p", 2_001)]).gamification.totalXp).toBe(10);
    expect(
      replayAllEvents([created, confirm, xp("tx-p", 2_001), xp("tx-p", 2_002)]).gamification.totalXp,
    ).toBe(10);
  });
  it("excluir a transação confirmada mantém o XP (exclusão não desconta)", () => {
    const del = ev(EVENT_TYPES.TRANSACTION_DELETED as string, { id: "tx-p" }, 3_000);
    const state = replayAllEvents([created, confirm, xp("tx-p", 2_001), del]);
    expect(state.gamification.totalXp).toBe(10);
  });
});
