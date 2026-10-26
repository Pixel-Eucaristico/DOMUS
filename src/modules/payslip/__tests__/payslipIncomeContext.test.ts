import { describe, it, expect } from "vitest";
import { buildPayslipSaveEvents, createAccountEvent, replayEvents } from "@packages/domain";
import type { DomainEvent } from "@packages/events/src/types";
import { buildFinancialContext, toSyncInfo, type ContextData } from "@/src/modules/ai/application/AIContextBuilder";
import { DEFAULT_AI_DATA_PERMISSIONS, type AIDataPermissions } from "@/src/modules/ai/domain/AISettings";

/**
 * R2 da revisão (decisão do dono 26/10): a receita lançada pelo holerite chega
 * ao contexto da IA (e ao Grupo) só como "Salário (MM/AAAA)", sem o empregador.
 */

const ALL_ON = Object.fromEntries(
  Object.keys(DEFAULT_AI_DATA_PERMISSIONS).map((k) => [k, true]),
) as unknown as AIDataPermissions;

describe("contexto da IA depois de uma receita de holerite", () => {
  it("mostra o salário sem o nome nem o CNPJ da empresa", () => {
    const acc = createAccountEvent({ name: "Banco", type: "checking", balance: 0 });
    const events = [
      acc,
      ...buildPayslipSaveEvents(
        {
          period: "2026-09",
          company: "ACME COMERCIO LTDA",
          cnpj: "11.222.333/0001-81",
          grossSalary: 5000,
          netSalary: 4000,
          earnings: [],
          deductions: [],
          source: "manual",
        },
        { income: { accountId: acc.payload.id, date: "2026-10-05" } },
      ),
    ] as DomainEvent[];
    events.forEach((e, i) => (e.timestamp = 1000 + i));
    const state = replayEvents(events);
    const data: ContextData = {
      transactions: Object.values(state.transactions),
      accounts: Object.values(state.accounts),
      categories: state.categories,
      invoices: state.invoices,
      wishlist: { lists: {}, items: {} } as unknown as ContextData["wishlist"],
      gamification: {
        level: 1,
        totalXp: 0,
        seasonXp: 0,
        currentStreak: 0,
        longestStreak: 0,
        unlockedAchievements: [],
        completedMonthlyTrophies: [],
      } as unknown as ContextData["gamification"],
      sync: toSyncInfo({ groupId: null, eventCount: 0, relayCount: 0, isAutoSyncEnabled: false, lastSyncTime: null }),
    };
    const ctx = buildFinancialContext(ALL_ON, data);
    expect(ctx).toContain("Salário (09/2026)");
    expect(ctx).toContain("4000.00");
    expect(ctx).not.toMatch(/acme/i);
    expect(ctx).not.toContain("11.222.333");
  });
});
