import { describe, it, expect } from "vitest";
import {
  calculateStreakFromDates,
  calculateStreakFromTransactions,
} from "../src/streakEngine";
import { GAMIFICATION_EVENTS } from "../src/types";
import { createAccountEvent } from "@packages/domain/src/accounts";
import { createCategoryByNameEvent } from "@packages/domain/src/categories";
import {
  createTransactionEvent,
  updateTransactionEvent,
  deleteTransactionEvent,
} from "@packages/domain/src/transactions";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { mergeImported } from "@/src/context/localEventLog";
import { replayAllEvents, replayOptionsFor } from "@/src/context/replay";

function toSyncEvent(
  evt: {
    id: string;
    type: unknown;
    payload: unknown;
    timestamp: number;
    deviceId?: string;
    signature?: string;
  },
  deviceId: string,
  timestampOverride?: number,
): SyncEvent {
  return {
    id: evt.id,
    type: evt.type as string,
    payload: evt.payload,
    timestamp: timestampOverride ?? evt.timestamp,
    deviceId,
    signature: evt.signature ?? "",
  };
}

function createSharedBase(deviceId: string): {
  events: SyncEvent[];
  accountId: string;
  categoryId: string;
} {
  const accEvt = createAccountEvent(
    { name: "Conta", type: "checking", balance: 1000 },
    deviceId,
  );
  const catEvt = createCategoryByNameEvent(
    { name: "Alimentação", group: "needs" },
    deviceId,
  );
  return {
    events: [
      toSyncEvent(accEvt, deviceId, 1_000_000),
      toSyncEvent(catEvt, deviceId, 1_000_001),
    ],
    accountId: accEvt.payload.id,
    categoryId: catEvt.payload.id,
  };
}

describe("Story 7.9 - Derivação de streak do log", () => {
  describe("calculateStreakFromDates", () => {
    it("retorna estado inicial para lista vazia ou apenas datas malformadas", () => {
      expect(calculateStreakFromDates([])).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
      });

      expect(
        calculateStreakFromDates(["", "invalida", "2026-02-30", "2026-13-01", "2026/11/01"]),
      ).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
      });
    });

    it("deduplica mesmo dia, ignora datas malformadas e calcula lacunas corretamente", () => {
      const result = calculateStreakFromDates([
        "2026-11-06",
        "2026-11-02",
        "2026-11-01",
        "2026-11-02",
        "2026-02-30",
        "bad-date",
        "2026-11-03",
      ]);

      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 3,
        lastActiveDate: "2026-11-06",
      });
    });
  });

  describe("calculateStreakFromTransactions", () => {
    it("considera apenas transações confirmadas (ou sem status) e ignora pendentes", () => {
      const result = calculateStreakFromTransactions([
        { date: "2026-11-10" },
        { date: "2026-11-11", status: "confirmed" },
        { date: "2026-11-12", status: "pending" },
        { date: "2026-11-13", status: "confirmed" },
      ]);

      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 2,
        lastActiveDate: "2026-11-13",
      });
    });
  });

  describe("Integração com replayAllEvents e sync", () => {
    it("dois aparelhos com histórico offline diferente convergem para o mesmo streak após sync", () => {
      const deviceA = "device-a";
      const deviceB = "device-b";
      const base = createSharedBase(deviceA);

      const txA1 = createTransactionEvent(
        {
          accountId: base.accountId,
          type: "expense",
          amount: 20,
          categoryId: base.categoryId,
          date: "2026-11-10",
          status: "confirmed",
        },
        deviceA,
      )[0]!;
      const txA2 = createTransactionEvent(
        {
          accountId: base.accountId,
          type: "expense",
          amount: 30,
          categoryId: base.categoryId,
          date: "2026-11-11",
          status: "confirmed",
        },
        deviceA,
      )[0]!;
      const legacyStreakA: SyncEvent = {
        id: "legacy-streak-a",
        type: GAMIFICATION_EVENTS.STREAK_UPDATED,
        payload: {
          currentStreak: 2,
          longestStreak: 2,
          lastActiveDate: "2026-11-11",
        },
        timestamp: 1_000_020,
        deviceId: deviceA,
        signature: "",
      };

      const txB1 = createTransactionEvent(
        {
          accountId: base.accountId,
          type: "expense",
          amount: 25,
          categoryId: base.categoryId,
          date: "2026-11-12",
          status: "confirmed",
        },
        deviceB,
      )[0]!;
      const txB2 = createTransactionEvent(
        {
          accountId: base.accountId,
          type: "expense",
          amount: 35,
          categoryId: base.categoryId,
          date: "2026-11-13",
          status: "confirmed",
        },
        deviceB,
      )[0]!;

      const logA: SyncEvent[] = [
        ...base.events,
        toSyncEvent(txA1, deviceA, 1_000_010),
        toSyncEvent(txA2, deviceA, 1_000_015),
        legacyStreakA,
      ];
      const logB: SyncEvent[] = [
        ...base.events,
        toSyncEvent(txB1, deviceB, 1_000_012),
        toSyncEvent(txB2, deviceB, 1_000_018),
      ];

      // Antes do sync, cada aparelho tem streak 2
      expect(replayAllEvents(logA, replayOptionsFor(false, deviceA)).gamification.currentStreak).toBe(2);
      expect(replayAllEvents(logB, replayOptionsFor(false, deviceB)).gamification.currentStreak).toBe(2);

      // Após sync em ambos os sentidos, ambos convergem para 4
      const mergedA = mergeImported(logA, logB, deviceA);
      const mergedB = mergeImported(logB, logA, deviceB);

      const stateA = replayAllEvents(mergedA, replayOptionsFor(false, deviceA));
      const stateB = replayAllEvents(mergedB, replayOptionsFor(false, deviceB));

      expect(stateA.quarantine).toEqual([]);
      expect(stateB.quarantine).toEqual([]);
      expect(stateA.gamification.currentStreak).toBe(4);
      expect(stateA.gamification.longestStreak).toBe(4);
      expect(stateA.gamification.lastActiveDate).toBe("2026-11-13");
      expect(stateB.gamification.currentStreak).toBe(stateA.gamification.currentStreak);
      expect(stateB.gamification.longestStreak).toBe(stateA.gamification.longestStreak);
      expect(stateB.gamification.lastActiveDate).toBe(stateA.gamification.lastActiveDate);
    });

    it("ignora STREAK_UPDATED legado sem enviar à Quarentena e deriva streak real das transações", () => {
      const deviceId = "device-legacy";
      const base = createSharedBase(deviceId);
      const tx1 = createTransactionEvent(
        {
          accountId: base.accountId,
          type: "expense",
          amount: 50,
          categoryId: base.categoryId,
          date: "2026-11-05",
          status: "confirmed",
        },
        deviceId,
      )[0]!;

      const legacyStreak: SyncEvent = {
        id: "legacy-streak-99",
        type: GAMIFICATION_EVENTS.STREAK_UPDATED,
        payload: {
          currentStreak: 99,
          longestStreak: 99,
          lastActiveDate: "2026-11-99",
        },
        timestamp: 1_000_020,
        deviceId,
        signature: "",
      };

      const logWithoutTx: SyncEvent[] = [...base.events, legacyStreak];
      const replayedEmpty = replayAllEvents(logWithoutTx, replayOptionsFor(false, deviceId));
      expect(replayedEmpty.quarantine).toEqual([]);
      expect(replayedEmpty.gamification.currentStreak).toBe(0);
      expect(replayedEmpty.gamification.longestStreak).toBe(0);
      expect(replayedEmpty.gamification.lastActiveDate).toBe("");

      const logWithOneTx: SyncEvent[] = [
        ...base.events,
        toSyncEvent(tx1, deviceId, 1_000_010),
        legacyStreak,
      ];
      const replayedOne = replayAllEvents(logWithOneTx, replayOptionsFor(false, deviceId));
      expect(replayedOne.quarantine).toEqual([]);
      expect(replayedOne.gamification.currentStreak).toBe(1);
      expect(replayedOne.gamification.longestStreak).toBe(1);
      expect(replayedOne.gamification.lastActiveDate).toBe("2026-11-05");
    });

    it("ignora transação pendente, passa a contar ao confirmar e deixa de contar ao excluir", () => {
      const deviceId = "device-pending";
      const base = createSharedBase(deviceId);

      const tx1 = createTransactionEvent(
        {
          accountId: base.accountId,
          type: "expense",
          amount: 10,
          categoryId: base.categoryId,
          date: "2026-11-13",
          status: "confirmed",
        },
        deviceId,
      )[0]!;
      const txPending = createTransactionEvent(
        {
          accountId: base.accountId,
          type: "expense",
          amount: 40,
          categoryId: base.categoryId,
          date: "2026-11-14",
          status: "pending",
        },
        deviceId,
      )[0]!;

      const logPending: SyncEvent[] = [
        ...base.events,
        toSyncEvent(tx1, deviceId, 1_000_010),
        toSyncEvent(txPending, deviceId, 1_000_020),
      ];

      const statePending = replayAllEvents(logPending, replayOptionsFor(false, deviceId));
      expect(statePending.gamification.currentStreak).toBe(1);
      expect(statePending.gamification.lastActiveDate).toBe("2026-11-13");

      // Confirma a transação pendente
      const confirmEvt = updateTransactionEvent(
        txPending.payload.id,
        { status: "confirmed" },
        deviceId,
      );
      const logConfirmed: SyncEvent[] = [
        ...logPending,
        toSyncEvent(confirmEvt, deviceId, 1_000_030),
      ];
      const stateConfirmed = replayAllEvents(logConfirmed, replayOptionsFor(false, deviceId));
      expect(stateConfirmed.gamification.currentStreak).toBe(2);
      expect(stateConfirmed.gamification.longestStreak).toBe(2);
      expect(stateConfirmed.gamification.lastActiveDate).toBe("2026-11-14");

      // Exclui a transação confirmada
      const deleteEvt = deleteTransactionEvent(txPending.payload.id, deviceId);
      const logDeleted: SyncEvent[] = [
        ...logConfirmed,
        toSyncEvent(deleteEvt, deviceId, 1_000_040),
      ];
      const stateDeleted = replayAllEvents(logDeleted, replayOptionsFor(false, deviceId));
      expect(stateDeleted.gamification.currentStreak).toBe(1);
      expect(stateDeleted.gamification.longestStreak).toBe(1);
      expect(stateDeleted.gamification.lastActiveDate).toBe("2026-11-13");
    });
  });
});
