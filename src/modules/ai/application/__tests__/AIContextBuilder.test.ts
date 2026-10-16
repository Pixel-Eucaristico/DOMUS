import { describe, it, expect } from "vitest";
import { buildFinancialContext, toSyncInfo, type ContextData } from "../AIContextBuilder";
import { DEFAULT_AI_DATA_PERMISSIONS, type AIDataPermissions } from "../../domain/AISettings";

const SECRET = "ABC-SECRET-123";

const ALL_ON = Object.fromEntries(
  Object.keys(DEFAULT_AI_DATA_PERMISSIONS).map((k) => [k, true]),
) as unknown as AIDataPermissions;

function data(groupId: string | null): ContextData {
  return {
    transactions: [],
    accounts: [],
    categories: {},
    invoices: {},
    wishlist: { lists: {}, items: {} },
    gamification: {
      level: 1,
      totalXp: 0,
      seasonXp: 0,
      currentStreak: 0,
      longestStreak: 0,
      unlockedAchievements: [],
      completedMonthlyTrophies: [],
    } as unknown as ContextData["gamification"],
    sync: toSyncInfo({ groupId, eventCount: 3, relayCount: 6, isAutoSyncEnabled: true, lastSyncTime: null }),
  };
}

describe("toSyncInfo", () => {
  it("descarta o código do grupo e mantém só se há grupo", () => {
    const info = toSyncInfo({ groupId: SECRET, eventCount: 1, relayCount: 2, isAutoSyncEnabled: false, lastSyncTime: 5 });
    expect(JSON.stringify(info)).not.toContain(SECRET);
    expect(info).toEqual({ inGroup: true, eventCount: 1, relayCount: 2, isAutoSyncEnabled: false, lastSyncTime: 5 });
  });
});

describe("buildFinancialContext — sincronização", () => {
  it("com todas as permissões, não contém o código do grupo em nenhuma linha", () => {
    const ctx = buildFinancialContext(ALL_ON, data(SECRET));
    expect(ctx).not.toContain(SECRET);
    expect(ctx).toContain("- Grupo: configurado");
    expect(ctx).toContain("- Eventos sincronizados: 3");
  });

  it("sem grupo, informa 'nenhum'", () => {
    expect(buildFinancialContext(ALL_ON, data(null))).toContain("- Grupo: nenhum");
  });

  it("com a permissão de sync desligada, omite a seção", () => {
    const ctx = buildFinancialContext({ ...ALL_ON, sync: false }, data(SECRET));
    expect(ctx).not.toContain("SINCRONIZACAO");
    expect(ctx).not.toContain(SECRET);
  });
});
