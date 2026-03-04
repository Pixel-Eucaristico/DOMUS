import type { SyncEvent } from "@packages/storage/src/eventStore";

/**
 * Seed events for the guided tour sandbox.
 * When replayed through replayAllEvents, produce a rich demo state:
 *   - 2 accounts (Carteira R$2.460, Cartão Nubank)
 *   - 13 default categories
 *   - 7 transactions for March 2026 (1 income + 6 expenses)
 *   - Gamification: ~250 XP, streak 5 days
 */

// 2026-03-01T00:00:00Z
const T1 = 1772323200000;
const T2 = T1 + 86400000; // 2026-03-02
const T3 = T2 + 86400000; // 2026-03-03

function ev(id: string, type: string, payload: object, ts: number): SyncEvent {
  return { id, type, payload, timestamp: ts, deviceId: "demo", signature: "" };
}

export const DEMO_SEED_EVENTS: SyncEvent[] = [
  // ── Accounts ─────────────────────────────────────────────────────────────
  ev("d-acc-1", "ACCOUNT_CREATED", {
    id: "demo-wallet", name: "Carteira", type: "wallet", balance: 0, color: "#10B981",
  }, T1),
  ev("d-acc-2", "ACCOUNT_CREATED", {
    id: "demo-card", name: "Cartão Nubank", type: "credit_card",
    balance: 0, creditLimit: 5000, color: "#6C47FF",
  }, T1 + 1),

  // ── Categories (default set) ──────────────────────────────────────────────
  ev("d-cat-ali", "CATEGORY_CREATED", { id: "alimentacao", name: "Alimentação",          group: "needs"   }, T1 + 10),
  ev("d-cat-hig", "CATEGORY_CREATED", { id: "higiene",     name: "Higiene",              group: "needs"   }, T1 + 11),
  ev("d-cat-lim", "CATEGORY_CREATED", { id: "limpeza",     name: "Limpeza",              group: "needs"   }, T1 + 12),
  ev("d-cat-sau", "CATEGORY_CREATED", { id: "saude",       name: "Saúde",                group: "needs"   }, T1 + 13),
  ev("d-cat-tra", "CATEGORY_CREATED", { id: "transporte",  name: "Transporte",           group: "needs"   }, T1 + 14),
  ev("d-cat-mor", "CATEGORY_CREATED", { id: "moradia",     name: "Moradia",              group: "needs"   }, T1 + 15),
  ev("d-cat-imp", "CATEGORY_CREATED", { id: "impostos",    name: "Impostos Obrigatórios",group: "needs"   }, T1 + 16),
  ev("d-cat-laz", "CATEGORY_CREATED", { id: "lazer",       name: "Lazer",                group: "wants"   }, T1 + 17),
  ev("d-cat-ves", "CATEGORY_CREATED", { id: "vestuario",   name: "Vestuário",            group: "wants"   }, T1 + 18),
  ev("d-cat-out", "CATEGORY_CREATED", { id: "outros",      name: "Outros",               group: "wants"   }, T1 + 19),
  ev("d-cat-com", "CATEGORY_CREATED", { id: "compras_diversas", name: "Compras Diversas",group: "wants"   }, T1 + 20),
  ev("d-cat-edu", "CATEGORY_CREATED", { id: "educacao",    name: "Educação",             group: "savings" }, T1 + 21),
  ev("d-cat-inv", "CATEGORY_CREATED", { id: "investimentos",name: "Investimentos",       group: "savings" }, T1 + 22),

  // ── Transactions — March 2026 ─────────────────────────────────────────────
  // Income
  ev("d-tx-1", "TRANSACTION_CREATED", {
    id: "d-tx-1", accountId: "demo-wallet", type: "income", amount: 5000,
    categoryId: "outros", date: "2026-03-01", description: "Salário",
  }, T1 + 100),
  // Needs (~50%)
  ev("d-tx-2", "TRANSACTION_CREATED", {
    id: "d-tx-2", accountId: "demo-wallet", type: "expense", amount: 1200,
    categoryId: "moradia", date: "2026-03-01", description: "Aluguel",
  }, T1 + 200),
  ev("d-tx-3", "TRANSACTION_CREATED", {
    id: "d-tx-3", accountId: "demo-wallet", type: "expense", amount: 380,
    categoryId: "alimentacao", date: "2026-03-02", description: "Supermercado",
  }, T2 + 100),
  ev("d-tx-4", "TRANSACTION_CREATED", {
    id: "d-tx-4", accountId: "demo-wallet", type: "expense", amount: 150,
    categoryId: "transporte", date: "2026-03-02", description: "Combustível",
  }, T2 + 200),
  // Wants (~30%)
  ev("d-tx-5", "TRANSACTION_CREATED", {
    id: "d-tx-5", accountId: "demo-wallet", type: "expense", amount: 90,
    categoryId: "lazer", date: "2026-03-03", description: "Cinema",
  }, T3 + 100),
  ev("d-tx-6", "TRANSACTION_CREATED", {
    id: "d-tx-6", accountId: "demo-wallet", type: "expense", amount: 220,
    categoryId: "vestuario", date: "2026-03-02", description: "Roupas",
  }, T2 + 300),
  // Savings (~20%)
  ev("d-tx-7", "TRANSACTION_CREATED", {
    id: "d-tx-7", accountId: "demo-wallet", type: "expense", amount: 500,
    categoryId: "investimentos", date: "2026-03-01", description: "Aporte na carteira",
  }, T1 + 300),

  // ── Gamification ─────────────────────────────────────────────────────────
  ev("d-gam-1", "XP_GAINED", {
    amount: 250, source: "transaction_logged", description: "Boas-vindas ao DOMUS!",
  }, T1 + 50),
  ev("d-gam-2", "STREAK_UPDATED", {
    currentStreak: 5, longestStreak: 8, lastActiveDate: "2026-03-03", broken: false,
  }, T3 + 50),
];
