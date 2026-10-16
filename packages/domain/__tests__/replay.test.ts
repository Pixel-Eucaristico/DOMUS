import { describe, it, expect } from "vitest";
import { replayEvents, replayEventsSince } from "../src/replay";
import { createInitialState } from "../src/state";
import { domainReducer } from "../src/reducer";
import { createEvent } from "../../events/src/factory";
import { EVENT_TYPES } from "../../events/src/types";
import { recordPayslipEvent, deletePayslipEvent } from "../src/payslips";
import type {
  AccountCreatedEvent,
  AccountUpdatedEvent,
  AccountDeletedEvent,
  TransactionCreatedEvent,
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
  CategoryCreatedEvent,
  InvoiceImportedEvent,
  InvoiceConfirmedEvent,
  DomainEvent,
} from "../../events/src/types";

describe("replayEvents", () => {
  it("reconstructs state from empty events", () => {
    const state = replayEvents([]);
    expect(Object.keys(state.accounts)).toHaveLength(0);
    expect(Object.keys(state.transactions)).toHaveLength(0);
    expect(Object.keys(state.categories)).toHaveLength(0);
  });

  it("reconstructs full state from event sequence", () => {
    const events: DomainEvent[] = [
      createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
        id: "cat-1",
        name: "Alimentacao",
        group: "needs",
      }),
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Nubank",
        type: "checking",
        balance: 5000,
      }),
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-2",
        name: "Poupanca",
        type: "savings",
        balance: 0,
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 200,
        categoryId: "cat-1",
        date: "2026-02-14",
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-2",
        accountId: "acc-1",
        type: "transfer",
        amount: 1000,
        categoryId: "cat-1",
        date: "2026-02-14",
        targetAccountId: "acc-2",
      }),
    ];

    const state = replayEvents(events);

    expect(Object.keys(state.accounts)).toHaveLength(2);
    expect(Object.keys(state.transactions)).toHaveLength(2);
    expect(Object.keys(state.categories)).toHaveLength(1);

    expect(state.accounts["acc-1"]!.balance).toBe(3800);
    expect(state.accounts["acc-2"]!.balance).toBe(1000);
  });

  it("produces same state regardless of how many times replayed", () => {
    const events: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta",
        type: "checking",
        balance: 1000,
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 100,
        categoryId: "cat-1",
        date: "2026-02-14",
      }),
    ];

    const state1 = replayEvents(events);
    const state2 = replayEvents(events);
    const state3 = replayEvents(events);

    expect(state1).toEqual(state2);
    expect(state2).toEqual(state3);
  });

  it("state is never saved - always reconstructed", () => {
    const events: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta",
        type: "checking",
        balance: 1000,
      }),
    ];

    const state = replayEvents(events);
    expect(state.accounts["acc-1"]!.balance).toBe(1000);

    const freshState = replayEvents(events);
    expect(freshState.accounts["acc-1"]!.balance).toBe(1000);
    expect(state).toEqual(freshState);
  });
});

describe("replayEventsSince", () => {
  it("applies new events to existing state", () => {
    const initialEvents: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta",
        type: "checking",
        balance: 2000,
      }),
    ];

    const baseState = replayEvents(initialEvents);

    const newEvents: DomainEvent[] = [
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 500,
        categoryId: "cat-1",
        date: "2026-02-14",
      }),
    ];

    const updatedState = replayEventsSince(baseState, newEvents);
    expect(updatedState.accounts["acc-1"]!.balance).toBe(1500);
  });

  it("preserves existing state when no new events", () => {
    const baseState = replayEvents([
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta",
        type: "checking",
        balance: 1000,
      }),
    ]);

    const result = replayEventsSince(baseState, []);
    expect(result).toEqual(baseState);
  });
});

describe("integration with SQLiteEventStore pattern", () => {
  it("simulates eventStore.replayEvents using domainReducer", () => {
    const events: DomainEvent[] = [
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "acc-1",
        name: "Conta Corrente",
        type: "checking",
        balance: 3000,
      }),
      createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, {
        id: "cc-1",
        name: "Nubank Roxo",
        type: "credit_card",
        balance: 0,
        creditLimit: 5000,
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-1",
        accountId: "acc-1",
        type: "expense",
        amount: 150,
        categoryId: "cat-1",
        date: "2026-02-14",
      }),
      createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
        id: "tx-2",
        accountId: "cc-1",
        type: "expense",
        amount: 500,
        categoryId: "cat-2",
        date: "2026-02-14",
      }),
    ];

    let state = createInitialState();
    for (const event of events) {
      state = domainReducer(state, event);
    }

    expect(state.accounts["acc-1"]!.balance).toBe(2850);
    expect(state.accounts["cc-1"]!.balance).toBe(0);
    expect(Object.keys(state.transactions)).toHaveLength(2);
  });
});

// ── Cobertura de replay para os tipos de evento adicionados depois do MVP ──

function account(id: string, type: "checking" | "savings" | "credit_card" = "checking", balance = 1000) {
  return createEvent<AccountCreatedEvent>(EVENT_TYPES.ACCOUNT_CREATED, { id, name: id, type, balance });
}

function tx(payload: Partial<TransactionCreatedEvent["payload"]> & { id: string }) {
  return createEvent<TransactionCreatedEvent>(EVENT_TYPES.TRANSACTION_CREATED, {
    accountId: "acc-1",
    type: "expense",
    amount: 100,
    categoryId: "cat-1",
    date: "2026-03-01",
    ...payload,
  });
}

describe("replay de novos tipos de evento", () => {
  it("INVOICE_IMPORTED + INVOICE_CONFIRMED reconstroem a nota confirmada", () => {
    const imported = createEvent<InvoiceImportedEvent>(EVENT_TYPES.INVOICE_IMPORTED, {
      invoiceId: "nf-1",
      source: "SEFAZ_QR",
      emitter: { cnpj: "12345678000190", name: "Mercado" },
      date: "2026-03-01",
      items: [{ description: "Arroz", quantity: 1, unitPrice: 25, totalPrice: 25 }],
      totalAmount: 25,
    });
    const confirmed = createEvent<InvoiceConfirmedEvent>(EVENT_TYPES.INVOICE_CONFIRMED, {
      invoiceId: "nf-1",
      date: "2026-03-01",
      totalAmount: 25,
    });

    const state = replayEvents([imported, confirmed]);
    expect(state.invoices["nf-1"]).toMatchObject({
      confirmed: true,
      importedAt: imported.timestamp,
      confirmedAt: confirmed.timestamp,
      totalAmount: 25,
    });
  });

  it("INVOICE_CONFIRMED sem importação prévia é ignorado", () => {
    const state = replayEvents([
      createEvent<InvoiceConfirmedEvent>(EVENT_TYPES.INVOICE_CONFIRMED, {
        invoiceId: "fantasma",
        date: "2026-03-01",
        totalAmount: 10,
      }),
    ]);
    expect(state.invoices).toEqual({});
  });

  it("transação pendente só altera saldo ao ser efetivada via TRANSACTION_UPDATED", () => {
    const pending = replayEvents([account("acc-1"), tx({ id: "tx-1", status: "pending" })]);
    expect(pending.accounts["acc-1"]!.balance).toBe(1000);

    const confirmed = replayEvents([
      account("acc-1"),
      tx({ id: "tx-1", status: "pending" }),
      createEvent<TransactionUpdatedEvent>(EVENT_TYPES.TRANSACTION_UPDATED, { id: "tx-1", status: "confirmed" }),
    ]);
    expect(confirmed.accounts["acc-1"]!.balance).toBe(900);
  });

  it("dividendo de CDB acumula cdbDividendsTotal e é revertido ao excluir", () => {
    const base = [
      account("cdb", "savings", 0),
      tx({ id: "dep", accountId: "cdb", type: "income", amount: 1000 }),
      tx({ id: "div", accountId: "cdb", type: "income", amount: 50, isCdbDividend: true }),
    ];
    const state = replayEvents(base);
    expect(state.accounts.cdb!.balance).toBe(1050);
    expect(state.accounts.cdb!.cdbDividendsTotal).toBe(50);

    const afterDelete = replayEvents([
      ...base,
      createEvent<TransactionDeletedEvent>(EVENT_TYPES.TRANSACTION_DELETED, { id: "div" }),
    ]);
    expect(afterDelete.accounts.cdb!.balance).toBe(1000);
    expect(afterDelete.accounts.cdb!.cdbDividendsTotal).toBe(0);
  });

  it("transferência para cartão de crédito não altera o saldo do cartão", () => {
    const state = replayEvents([
      account("acc-1"),
      account("card", "credit_card", 0),
      tx({ id: "pay", type: "transfer", amount: 300, targetAccountId: "card" }),
    ]);
    expect(state.accounts["acc-1"]!.balance).toBe(700);
    expect(state.accounts.card!.balance).toBe(0);
  });

  it("ACCOUNT_UPDATED e ACCOUNT_DELETED são reaplicados na ordem", () => {
    const state = replayEvents([
      account("acc-1"),
      account("acc-2"),
      createEvent<AccountUpdatedEvent>(EVENT_TYPES.ACCOUNT_UPDATED, { id: "acc-1", name: "Renomeada", linkedCreditCardId: "card" }),
      createEvent<AccountDeletedEvent>(EVENT_TYPES.ACCOUNT_DELETED, { id: "acc-2" }),
      createEvent<AccountUpdatedEvent>(EVENT_TYPES.ACCOUNT_UPDATED, { id: "acc-2", name: "Não deve voltar" }),
    ]);
    expect(Object.keys(state.accounts)).toEqual(["acc-1"]);
    expect(state.accounts["acc-1"]).toMatchObject({ name: "Renomeada", linkedCreditCardId: "card" });
  });

  it("PAYSLIP_RECORDED / PAYSLIP_DELETED convivem com transações de salário", () => {
    const salary = tx({ id: "sal", type: "income", amount: 4000, categoryId: "salario" });
    const state = replayEvents([
      account("acc-1", "checking", 0),
      salary,
      recordPayslipEvent({
        id: "hol-1",
        period: "2026-03",
        company: "ACME",
        grossSalary: 5000,
        netSalary: 4000,
        deductions: [{ name: "INSS", value: 1000 }],
        source: "vision",
        transactionId: "sal",
      }),
      recordPayslipEvent({
        id: "hol-2",
        period: "2026-04",
        company: "ACME",
        grossSalary: 5000,
        netSalary: 4000,
        deductions: [],
        source: "manual",
      }),
      deletePayslipEvent("hol-2"),
    ]);
    expect(state.accounts["acc-1"]!.balance).toBe(4000);
    expect(Object.keys(state.payslips)).toEqual(["hol-1"]);
    expect(state.payslips["hol-1"]!.transactionId).toBe("sal");
  });

  it("replayEventsSince com novos tipos equivale ao replay completo", () => {
    const events: DomainEvent[] = [
      account("acc-1"),
      tx({ id: "tx-1", status: "pending" }),
      recordPayslipEvent({ id: "h", period: "2026-03", company: "X", grossSalary: 1, netSalary: 1, deductions: [], source: "manual" }),
      createEvent<TransactionUpdatedEvent>(EVENT_TYPES.TRANSACTION_UPDATED, { id: "tx-1", status: "confirmed" }),
      deletePayslipEvent("h"),
    ];
    for (let split = 0; split <= events.length; split++) {
      const partial = replayEvents(events.slice(0, split));
      expect(replayEventsSince(partial, events.slice(split))).toEqual(replayEvents(events));
    }
  });

  it("evento de tipo desconhecido não altera o estado", () => {
    const before = replayEvents([account("acc-1")]);
    const after = domainReducer(before, { ...account("x"), type: "EVENTO_FUTURO" } as unknown as DomainEvent);
    expect(after).toBe(before);
  });
});
