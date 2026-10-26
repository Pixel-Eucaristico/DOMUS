import { describe, it, expect } from "vitest";
import { replayAllEvents } from "../replay";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { MAX_FUTURE_SKEW_MS } from "@packages/events/src/validateEnvelope";

/**
 * Story 3.7: com relógios diferentes, a exclusão/edição pode ter `timestamp`
 * menor que o lançamento que ela altera. Depois da ordem total da 3.4, o replay
 * a vê antes do alvo; ela fica pendente e vale quando o alvo chega.
 */

const T0 = 1_792_627_200_000;
// dev-a está 10 min adiantado: o lançamento dele tem horário maior que a
// exclusão/edição feita depois no dev-b (relógio certo).
const AHEAD = 10 * 60_000;

function ev(id: string, type: string, payload: object, timestamp: number, deviceId: string): SyncEvent {
  return { id, type, payload, timestamp, deviceId, signature: "" };
}

const account = ev("acc", "ACCOUNT_CREATED", { id: "acc-1", name: "Carteira", type: "wallet", balance: 1000 }, T0, "dev-b");
const created = ev("tx-c", "TRANSACTION_CREATED", {
  id: "tx-1", accountId: "acc-1", type: "expense", amount: 30, categoryId: "c", date: "2026-10-26",
}, T0 + 60_000 + AHEAD, "dev-a");
const updated = ev("tx-u", "TRANSACTION_UPDATED", { id: "tx-1", amount: 50 }, T0 + 120_000, "dev-b");
const deleted = ev("tx-d", "TRANSACTION_DELETED", { id: "tx-1" }, T0 + 180_000, "dev-b");

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) out.push([item, ...p]);
  });
  return out;
}

describe("replayAllEvents — edição/exclusão antes do alvo (Story 3.7)", () => {
  it("exclusão com horário menor que o lançamento: lançamento excluído e saldo certo", () => {
    expect(deleted.timestamp).toBeLessThan(created.timestamp);
    const r = replayAllEvents([account, created, deleted]);
    expect(r.domain.transactions["tx-1"]).toBeUndefined();
    expect(r.domain.accounts["acc-1"]!.balance).toBe(1000);
    expect(r.quarantine).toEqual([]);
  });

  it("edição com horário menor que o lançamento: valor e saldo da edição", () => {
    const r = replayAllEvents([account, created, updated]);
    expect(r.domain.transactions["tx-1"]!.amount).toBe(50);
    expect(r.domain.accounts["acc-1"]!.balance).toBe(950);
    expect(r.domain.outOfOrder).toBeUndefined();
    expect(r.quarantine).toEqual([]);
  });

  it("edição e exclusão antes do lançamento: excluído e saldo sem ele", () => {
    const r = replayAllEvents([account, created, updated, deleted]);
    expect(r.domain.transactions["tx-1"]).toBeUndefined();
    expect(r.domain.accounts["acc-1"]!.balance).toBe(1000);
  });

  it("conta excluída/editada com horário menor que a criação", () => {
    const accCreated = ev("a-c", "ACCOUNT_CREATED", { id: "acc-9", name: "Banco", type: "checking", balance: 10 }, T0 + AHEAD, "dev-a");
    const accUpdated = ev("a-u", "ACCOUNT_UPDATED", { id: "acc-9", name: "Banco novo" }, T0 + 1_000, "dev-b");
    const accDeleted = ev("a-d", "ACCOUNT_DELETED", { id: "acc-9" }, T0 + 2_000, "dev-b");
    const edited = replayAllEvents([accCreated, accUpdated]);
    expect(edited.domain.accounts["acc-9"]!.name).toBe("Banco novo");
    const removed = replayAllEvents([accCreated, accUpdated, accDeleted]);
    expect(removed.domain.accounts["acc-9"]).toBeUndefined();
  });

  it("alvo que nunca chega não muda nada e não vai para a Quarentena", () => {
    const orphan = ev("orphan", "TRANSACTION_DELETED", { id: "tx-9" }, T0 + 5_000, "dev-b");
    const base = replayAllEvents([account, created]);
    const r = replayAllEvents([account, created, orphan]);
    expect(r.quarantine).toEqual([]);
    expect(r.domain.accounts).toEqual(base.domain.accounts);
    expect(r.domain.transactions).toEqual(base.domain.transactions);
  });

  // Reconfere a ordem total da Story 3.4 (o replay ordena antes de aplicar) com um log
  // que tem edição e exclusão antes do alvo, e o saldo esperado da 3.7. Não testa o
  // reducer com eventos fora da ordem do replay — isso está em outOfOrder.test.ts.
  it("ordem total da 3.4 com pendências da 3.7: as 120 ordens de chegada → mesmo estado e saldo da 3.7", () => {
    const log = [account, created, updated, deleted, ev("tx2", "TRANSACTION_CREATED", {
      id: "tx-2", accountId: "acc-1", type: "income", amount: 200, categoryId: "c", date: "2026-10-26",
    }, T0 + 30_000, "dev-b")];
    const reference = replayAllEvents(log);
    expect(reference.domain.accounts["acc-1"]!.balance).toBe(1200);
    for (const order of permutations(log)) {
      expect(replayAllEvents(order)).toEqual(reference);
    }
  });

  it("edição de conta com horário menor que a criação: nome novo, saldo derivado do formulário ignorado", () => {
    const M = 60_000;
    // dev-a adiantado 10 min cria a conta (1000) e lança 30; dev-b (relógio certo)
    // renomeia e o formulário manda o saldo que ele via (970).
    const accC = ev("ac", "ACCOUNT_CREATED", { id: "a1", name: "Carteira", type: "wallet", balance: 1000 }, T0 + AHEAD, "dev-a");
    const tx = ev("tc", "TRANSACTION_CREATED", {
      id: "t1", accountId: "a1", type: "expense", amount: 30, categoryId: "c", date: "2026-10-26",
    }, T0 + M + AHEAD, "dev-a");
    const accU = ev("au", "ACCOUNT_UPDATED", { id: "a1", name: "Nubank", balance: 970 }, T0 + 5 * M, "dev-b");
    const r = replayAllEvents([accC, tx, accU]);
    expect(r.domain.accounts["a1"]!.name).toBe("Nubank");
    expect(r.domain.accounts["a1"]!.balance).toBe(970);
  });

  it("exclusão pendente de lançamento em Quarentena por horário no futuro: vale quando ele é liberado", () => {
    const M = 60_000;
    const FUT = MAX_FUTURE_SKEW_MS + 60 * M;
    const base = ev("ab", "ACCOUNT_CREATED", { id: "a1", name: "C", type: "wallet", balance: 1000 }, T0, "dev-b");
    const other = ev("o", "TRANSACTION_CREATED", {
      id: "t0", accountId: "a1", type: "expense", amount: 10, categoryId: "c", date: "2026-10-26",
    }, T0 + M, "dev-b");
    const c2 = ev("c2", "TRANSACTION_CREATED", {
      id: "t2", accountId: "a1", type: "expense", amount: 40, categoryId: "c", date: "2026-10-26",
    }, T0 + FUT, "dev-a");
    const d2 = ev("d2", "TRANSACTION_DELETED", { id: "t2" }, T0 + 2 * M, "dev-c");
    const log = [base, other, c2, d2];

    const before = replayAllEvents(log, { now: T0 + 3 * M, currentDeviceId: "dev-b" });
    expect(before.quarantine.map((q) => [q.id, q.kind])).toEqual([["c2", "future_timestamp"]]);
    expect(before.domain.transactions["t2"]).toBeUndefined();
    expect(before.domain.accounts["a1"]!.balance).toBe(990);
    expect(Object.keys(before.domain.outOfOrder?.pendingTransactions ?? {})).toEqual(["t2"]);

    const after = replayAllEvents(log, { now: T0 + FUT - MAX_FUTURE_SKEW_MS, currentDeviceId: "dev-b" });
    expect(after.quarantine).toEqual([]);
    expect(after.domain.transactions["t2"]).toBeUndefined();
    expect(after.domain.accounts["a1"]!.balance).toBe(990);
    expect(after.domain.outOfOrder?.pendingTransactions).toEqual({});
    expect(after.domain.outOfOrder?.deletedTransactions).toEqual({ t2: true });
  });

  it("não altera o log recebido", () => {
    const log = [deleted, created, account];
    const copy = JSON.parse(JSON.stringify(log));
    replayAllEvents(log);
    expect(log).toEqual(copy);
  });
});
