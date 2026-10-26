import { describe, it, expect } from "vitest";
import { domainReducer } from "../src/reducer";
import { createInitialState } from "../src/state";
import type { AppState } from "../src/state";
import { EVENT_TYPES } from "../../events/src/types";
import type { DomainEvent, TransactionPayload, AccountPayload } from "../../events/src/types";

/**
 * Story 3.7: edição/exclusão que chega (na ordem do replay) antes do alvo fica
 * pendente e é aplicada quando o alvo é criado.
 */

let seq = 0;
function ev(type: DomainEvent["type"], payload: object): DomainEvent {
  seq += 1;
  return { id: `e-${seq}`, type, payload, timestamp: seq, deviceId: "dev-a", signature: "" } as DomainEvent;
}

const ACC: AccountPayload = { id: "a1", name: "Carteira", type: "wallet", balance: 1000 };
const ACC2: AccountPayload = { id: "a2", name: "Banco", type: "checking", balance: 500 };
const TX: TransactionPayload = {
  id: "t1",
  accountId: "a1",
  type: "expense",
  amount: 30,
  categoryId: "c",
  date: "2026-10-26",
};

const accCreated = (p: AccountPayload = ACC) => ev(EVENT_TYPES.ACCOUNT_CREATED, p);
const accUpdated = (p: Partial<AccountPayload> & { id: string }) => ev(EVENT_TYPES.ACCOUNT_UPDATED, p);
const accDeleted = (id: string) => ev(EVENT_TYPES.ACCOUNT_DELETED, { id });
const txCreated = (p: TransactionPayload = TX) => ev(EVENT_TYPES.TRANSACTION_CREATED, p);
const txUpdated = (p: Partial<TransactionPayload> & { id: string }) => ev(EVENT_TYPES.TRANSACTION_UPDATED, p);
const txDeleted = (id: string) => ev(EVENT_TYPES.TRANSACTION_DELETED, { id });

function run(events: DomainEvent[], start: AppState = createInitialState()): AppState {
  return events.reduce(domainReducer, start);
}

/** Partes públicas do estado (sem o controle interno `outOfOrder`). */
function publicOf(state: AppState) {
  const { outOfOrder: _o, ...rest } = state;
  return rest;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}

describe("domainReducer — edição/exclusão antes do alvo (Story 3.7)", () => {
  describe("lançamentos", () => {
    it("exclusão antes do lançamento: t1 excluída, saldo como se nunca tivesse existido", () => {
      const s = run([accCreated(), txDeleted("t1"), txCreated()]);
      expect(s.transactions["t1"]).toBeUndefined();
      expect(s.accounts["a1"]!.balance).toBe(1000);
      expect(s.outOfOrder?.deletedTransactions).toEqual({ t1: true });
      expect(s.outOfOrder?.pendingTransactions).toEqual({});
    });

    it("exclusão pendente fica pendente até o lançamento chegar, sem mexer no saldo", () => {
      const s = run([accCreated(), txDeleted("t1")]);
      expect(s.accounts["a1"]!.balance).toBe(1000);
      expect(Object.keys(s.transactions)).toEqual([]);
      expect(s.outOfOrder?.pendingTransactions["t1"]).toHaveLength(1);
    });

    it("edição antes do lançamento: t1 com valor 50 e saldo com 50", () => {
      const s = run([accCreated(), txUpdated({ id: "t1", amount: 50 }), txCreated()]);
      expect(s.transactions["t1"]!.amount).toBe(50);
      expect(s.accounts["a1"]!.balance).toBe(950);
      // Nada sobra: o estado é igual ao da ordem normal.
      expect(s.outOfOrder).toBeUndefined();
      expect(s).toEqual(run([accCreated(), txCreated(), txUpdated({ id: "t1", amount: 50 })]));
    });

    it("duas edições antes do lançamento são aplicadas na ordem do log", () => {
      const s = run([
        accCreated(),
        txUpdated({ id: "t1", amount: 50 }),
        txUpdated({ id: "t1", amount: 70, description: "Feira" }),
        txCreated(),
      ]);
      expect(s.transactions["t1"]!.amount).toBe(70);
      expect(s.transactions["t1"]!.description).toBe("Feira");
      expect(s.accounts["a1"]!.balance).toBe(930);
    });

    it("edição de status antes do lançamento segue a regra de saldo de hoje (pendente não mexe no saldo)", () => {
      const s = run([accCreated(), txUpdated({ id: "t1", status: "pending" }), txCreated()]);
      expect(s.transactions["t1"]!.status).toBe("pending");
      expect(s.accounts["a1"]!.balance).toBe(1000);

      const confirmed = run([
        accCreated(),
        txUpdated({ id: "t1", status: "confirmed" }),
        txCreated({ ...TX, status: "pending" }),
      ]);
      expect(confirmed.accounts["a1"]!.balance).toBe(970);
    });

    it("edição e exclusão antes: t1 excluída e saldo sem ela", () => {
      const s = run([accCreated(), txUpdated({ id: "t1", amount: 50 }), txDeleted("t1"), txCreated()]);
      expect(s.transactions["t1"]).toBeUndefined();
      expect(s.accounts["a1"]!.balance).toBe(1000);
    });

    it("exclusão e depois edição antes do lançamento: continua excluída", () => {
      const s = run([accCreated(), txDeleted("t1"), txUpdated({ id: "t1", amount: 50 }), txCreated()]);
      expect(s.transactions["t1"]).toBeUndefined();
      expect(s.accounts["a1"]!.balance).toBe(1000);
      expect(s.outOfOrder?.pendingTransactions).toEqual({});
    });

    it("edição que chega depois da exclusão pendente já aplicada não faz nada", () => {
      const s = run([accCreated(), txDeleted("t1"), txCreated(), txUpdated({ id: "t1", amount: 99 })]);
      expect(s.transactions["t1"]).toBeUndefined();
      expect(s.accounts["a1"]!.balance).toBe(1000);
      expect(s.outOfOrder?.pendingTransactions).toEqual({});
    });

    it("lançamento repetido depois de uma exclusão pendente continua excluído, sem efeito no saldo", () => {
      const s = run([accCreated(), txDeleted("t1"), txCreated(), txCreated({ ...TX, amount: 80 })]);
      expect(s.transactions["t1"]).toBeUndefined();
      expect(s.accounts["a1"]!.balance).toBe(1000);
    });

    it("transferência excluída antes de chegar: as duas contas ficam como estavam", () => {
      const transfer: TransactionPayload = { ...TX, type: "transfer", amount: 200, targetAccountId: "a2" };
      const s = run([accCreated(), accCreated(ACC2), txDeleted("t1"), txCreated(transfer)]);
      expect(s.accounts["a1"]!.balance).toBe(1000);
      expect(s.accounts["a2"]!.balance).toBe(500);
    });

    it("transferência editada antes de chegar: saldo das duas contas com o valor editado", () => {
      const transfer: TransactionPayload = { ...TX, type: "transfer", amount: 200, targetAccountId: "a2" };
      const s = run([accCreated(), accCreated(ACC2), txUpdated({ id: "t1", amount: 300 }), txCreated(transfer)]);
      expect(s.accounts["a1"]!.balance).toBe(700);
      expect(s.accounts["a2"]!.balance).toBe(800);
    });

    it("ordem normal (CREATED, UPDATED, DELETED) igual a hoje; a exclusão deixa só a marca", () => {
      const created = run([accCreated(), txCreated()]);
      expect(created.accounts["a1"]!.balance).toBe(970);
      const updated = run([txUpdated({ id: "t1", amount: 50 })], created);
      expect(updated.accounts["a1"]!.balance).toBe(950);
      expect(updated.transactions["t1"]!.amount).toBe(50);
      const deleted = run([txDeleted("t1")], updated);
      expect(deleted.accounts["a1"]!.balance).toBe(1000);
      expect(deleted.transactions["t1"]).toBeUndefined();
      expect(deleted.outOfOrder).toEqual({
        pendingTransactions: {},
        pendingAccounts: {},
        deletedTransactions: { t1: true },
        deletedAccounts: {},
        deletedPayslips: {},
      });
      expect(publicOf(deleted)).toEqual({ ...createInitialState(), accounts: { a1: ACC } });
    });

    it("toda exclusão deixa a marca: edição velha depois de C, D não fica pendente", () => {
      const s = run([accCreated(), txCreated(), txDeleted("t1"), txUpdated({ id: "t1", amount: 99 })]);
      expect(s.transactions["t1"]).toBeUndefined();
      expect(s.accounts["a1"]!.balance).toBe(1000);
      expect(s.outOfOrder?.pendingTransactions).toEqual({});
      expect(s.outOfOrder?.deletedTransactions).toEqual({ t1: true });
    });

    it("id excluído continua excluído: C D U C igual a D C C' (decisão da revisão)", () => {
      const normal = run([accCreated(), txCreated(), txDeleted("t1"), txUpdated({ id: "t1", amount: 99 }), txCreated()]);
      const early = run([accCreated(), txDeleted("t1"), txCreated(), txCreated({ ...TX, amount: 80 })]);
      for (const s of [normal, early]) {
        expect(s.transactions["t1"]).toBeUndefined();
        expect(s.accounts["a1"]!.balance).toBe(1000);
        expect(s.outOfOrder?.pendingTransactions).toEqual({});
      }
      expect(publicOf(normal)).toEqual(publicOf(early));
    });

    it("exclusão antes do lançamento com id 'constructor' (nome do protótipo): fica excluído", () => {
      const tx = { ...TX, id: "constructor" };
      const s = run([accCreated(), txDeleted("constructor"), txCreated(tx)]);
      expect(Object.prototype.hasOwnProperty.call(s.transactions, "constructor")).toBe(false);
      expect(s.accounts["a1"]!.balance).toBe(1000);
      const edited = run([accCreated(), txUpdated({ id: "constructor", amount: 50 }), txCreated(tx)]);
      expect(edited.transactions["constructor"]!.amount).toBe(50);
      expect(edited.accounts["a1"]!.balance).toBe(950);
    });

    it("alvo nunca chega: só TRANSACTION_DELETED(t9) não muda nada público", () => {
      const before = run([accCreated(), txCreated()]);
      const after = run([txDeleted("t9")], before);
      expect(publicOf(after)).toEqual(publicOf(before));
      const onlyUpdate = run([txUpdated({ id: "t9", amount: 1 })], before);
      expect(publicOf(onlyUpdate)).toEqual(publicOf(before));
    });

    it("excluir lançamento cuja conta já foi excluída não quebra o reducer", () => {
      const s = run([accCreated(), txDeleted("t1"), accDeleted("a1"), txCreated()]);
      expect(s.transactions["t1"]).toBeUndefined();
      expect(s.accounts["a1"]).toBeUndefined();

      const normal = run([accCreated(), txCreated(), accDeleted("a1"), txDeleted("t1")]);
      expect(normal.transactions["t1"]).toBeUndefined();
      expect(normal.accounts).toEqual({});
    });

    it("id que coincide com nome do protótipo ('constructor') não confunde as pendências", () => {
      const s = run([accCreated(), txCreated({ ...TX, id: "constructor" })]);
      expect(s.transactions["constructor"]!.amount).toBe(30);
      expect(s.accounts["a1"]!.balance).toBe(970);
      expect(s.outOfOrder).toBeUndefined();
    });
  });

  describe("contas", () => {
    it("ACCOUNT_DELETED antes de ACCOUNT_CREATED: a1 excluída", () => {
      const s = run([accDeleted("a1"), accCreated()]);
      expect(s.accounts["a1"]).toBeUndefined();
      expect(s.outOfOrder?.deletedAccounts).toEqual({ a1: true });
      expect(s.outOfOrder?.pendingAccounts).toEqual({});
    });

    it("ACCOUNT_UPDATED antes de ACCOUNT_CREATED: a1 com os campos da edição (menos o saldo)", () => {
      const s = run([accUpdated({ id: "a1", name: "Nubank", color: "#f00" }), accCreated()]);
      expect(s.accounts["a1"]).toEqual({ ...ACC, name: "Nubank", color: "#f00" });
      expect(s.outOfOrder).toBeUndefined();
    });

    it("ACCOUNT_UPDATED pendente: o `balance` (derivado do formulário) é ignorado, o resto vale", () => {
      // O aparelho que editou já via a despesa de 30 e mandou balance 970; reaplicar
      // 970 depois da criação contaria a despesa de novo (940).
      const s = run([accUpdated({ id: "a1", name: "Nubank", balance: 970 }), accCreated(), txCreated()]);
      expect(s.accounts["a1"]!.name).toBe("Nubank");
      expect(s.accounts["a1"]!.balance).toBe(970);
      // Com o alvo existente, a edição de saldo segue valendo como hoje.
      const normal = run([accCreated(), accUpdated({ id: "a1", balance: 2500 })]);
      expect(normal.accounts["a1"]!.balance).toBe(2500);
    });

    it("ACCOUNT_DELETED('toString') antes da criação: fica excluída", () => {
      const s = run([accDeleted("toString"), accCreated({ ...ACC, id: "toString" })]);
      expect(Object.prototype.hasOwnProperty.call(s.accounts, "toString")).toBe(false);
      expect(s.outOfOrder?.deletedAccounts).toEqual({ toString: true });
    });

    it("edição e exclusão de conta antes: a1 excluída", () => {
      const s = run([accUpdated({ id: "a1", name: "X" }), accDeleted("a1"), accCreated()]);
      expect(s.accounts["a1"]).toBeUndefined();
    });

    it("lançamento numa conta excluída antes de chegar não mexe em saldo nem quebra", () => {
      const s = run([accDeleted("a1"), accCreated(), txCreated()]);
      expect(s.accounts["a1"]).toBeUndefined();
      expect(s.transactions["t1"]).toEqual(TX);
    });

    it("ordem normal de conta igual a hoje", () => {
      const s = run([accCreated(), accUpdated({ id: "a1", name: "Y" })]);
      expect(s.accounts["a1"]!.name).toBe("Y");
      const d = run([accDeleted("a1")], s);
      expect(d.accounts).toEqual({});
      expect(d.outOfOrder?.deletedAccounts).toEqual({ a1: true });
      // Id excluído: criação e edição posteriores são ignoradas.
      const again = run([accCreated(), accUpdated({ id: "a1", name: "W" })], d);
      expect(again.accounts).toEqual({});
      expect(again.outOfOrder?.pendingAccounts).toEqual({});
    });

    it("alvo nunca chega: só ACCOUNT_DELETED não muda nada público", () => {
      const before = run([accCreated()]);
      expect(publicOf(run([accDeleted("zz")], before))).toEqual(publicOf(before));
      expect(publicOf(run([accUpdated({ id: "zz", name: "Q" })], before))).toEqual(publicOf(before));
    });
  });

  it("nunca altera o estado anterior nem as listas pendentes (imutável)", () => {
    const s1 = deepFreeze(run([accCreated(), txUpdated({ id: "t1", amount: 50 })]));
    const s2 = deepFreeze(domainReducer(s1, txDeleted("t1")));
    expect(s1.outOfOrder?.pendingTransactions["t1"]).toHaveLength(1);
    expect(s2.outOfOrder?.pendingTransactions["t1"]).toHaveLength(2);
    const s3 = domainReducer(s2, txCreated());
    expect(s3.transactions["t1"]).toBeUndefined();
    expect(s3.accounts["a1"]!.balance).toBe(1000);
    expect(s2.outOfOrder?.pendingTransactions["t1"]).toHaveLength(2);
    expect(s2.accounts["a1"]!.balance).toBe(1000);

    const a1 = deepFreeze(run([accUpdated({ id: "a1", name: "Z" })]));
    const a2 = domainReducer(a1, accCreated());
    expect(a2.accounts["a1"]!.name).toBe("Z");
    expect(a1.accounts).toEqual({});
  });

  it("estado público da ordem trocada é igual ao da ordem normal", () => {
    const pairs: [DomainEvent[], DomainEvent[]][] = [
      [
        [accCreated(), txCreated(), txUpdated({ id: "t1", amount: 50 })],
        [accCreated(), txUpdated({ id: "t1", amount: 50 }), txCreated()],
      ],
      [
        [accCreated(), txCreated(), txDeleted("t1")],
        [accCreated(), txDeleted("t1"), txCreated()],
      ],
      [
        [accCreated(), txCreated(), txUpdated({ id: "t1", amount: 50 }), txDeleted("t1")],
        [accCreated(), txUpdated({ id: "t1", amount: 50 }), txDeleted("t1"), txCreated()],
      ],
      [
        [accCreated(), accUpdated({ id: "a1", name: "Novo" })],
        [accUpdated({ id: "a1", name: "Novo" }), accCreated()],
      ],
      [
        [accCreated(), accDeleted("a1")],
        [accDeleted("a1"), accCreated()],
      ],
    ];
    for (const [normal, early] of pairs) {
      expect(publicOf(run(early))).toEqual(publicOf(run(normal)));
    }
  });
});
