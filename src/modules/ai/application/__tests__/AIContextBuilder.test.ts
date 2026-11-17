import { describe, it, expect, vi } from "vitest";
import { buildFinancialContext, toSyncInfo, type ContextData } from "../AIContextBuilder";
import { ConsultantChatUseCase } from "../ConsultantChatUseCase";
import { AIClientService } from "../AIClientService";
import { DEFAULT_AI_DATA_PERMISSIONS, DEFAULT_AI_SETTINGS, type AIDataPermissions } from "../../domain/AISettings";

vi.mock("../AIClientService", () => ({
  AIClientService: {
    computeCacheKey: vi.fn(async () => "mock-cache-key"),
    complete: vi.fn(),
  },
}));

const SECRET = "ABC-SECRET-123";

const ALL_ON: AIDataPermissions = {
  ...DEFAULT_AI_DATA_PERMISSIONS,
  transactions: true,
  accounts: true,
  categories: true,
  invoices: true,
  wishlist: true,
  gamification: true,
  sync: true,
};

function data(
  groupId: string | null,
  overrides: Partial<ContextData> = {},
): ContextData {
  return {
    transactions: [
      {
        id: "tx-1",
        type: "expense",
        amount: 50,
        description: "Mercado",
        categoryId: "cat-1",
        accountId: "acc-1",
        date: "2026-11-10",
      },
    ],
    accounts: [
      {
        id: "acc-1",
        name: "Carteira",
        type: "checking",
        balance: 1000,
        color: "#000",
      },
    ],
    categories: {
      "cat-1": {
        id: "cat-1",
        name: "Alimentação",
        group: "needs",
      },
    },
    invoices: {
      "inv-1": {
        invoiceId: "inv-1",
        source: "SEFAZ_QR",
        emitter: {
          cnpj: "00000000000100",
          name: "Supermercado",
        },
        date: "2026-11-10",
        items: [],
        totalAmount: 50,
        importedAt: 1,
        confirmed: true,
      },
    },
    wishlist: {
      lists: {
        "wl-1": { id: "wl-1", name: "Desejos", createdAt: "2026-11-01T00:00:00.000Z" },
      },
      items: {
        "wi-1": {
          id: "wi-1",
          listId: "wl-1",
          name: "Livro",
          urgencyLevel: "PLANNED",
          orderIndex: 0,
          price: 80,
        },
      },
    },
    gamification: {
      level: 1,
      totalXp: 0,
      seasonXp: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      xpHistory: [],
      unlockedAchievements: [],
      completedMonthlyTrophies: [],
      selectedSeasonalTrophies: [],
      completedSeasonalTrophies: [],
      completionCounts: {},
    },
    sync: toSyncInfo({ groupId, eventCount: 3, relayCount: 6, isAutoSyncEnabled: true, lastSyncTime: null }),
    ...overrides,
  };
}

describe("toSyncInfo", () => {
  it("descarta o código do grupo e mantém só se há grupo", () => {
    const info = toSyncInfo({ groupId: SECRET, eventCount: 1, relayCount: 2, isAutoSyncEnabled: false, lastSyncTime: 5 });
    expect(JSON.stringify(info)).not.toContain(SECRET);
    expect(info).toEqual({ inGroup: true, eventCount: 1, relayCount: 2, isAutoSyncEnabled: false, lastSyncTime: 5 });
  });

  it("trata groupId vazio ou só com espaços como sem grupo", () => {
    expect(toSyncInfo({ groupId: "   ", eventCount: 0, relayCount: 0, isAutoSyncEnabled: false, lastSyncTime: null }).inGroup).toBe(false);
  });
});

describe("buildFinancialContext — sincronização e guardas", () => {
  it("com todas as permissões, não contém o código do grupo em nenhuma linha", () => {
    const ctx = buildFinancialContext(ALL_ON, data(SECRET));
    expect(ctx).not.toContain(SECRET);
    expect(ctx).toContain("- Grupo: configurado");
    expect(ctx).toContain("- Eventos sincronizados: 3");
    expect(ctx).toContain("TRANSACOES RECENTES");
    expect(ctx).toContain("CONTAS");
    expect(ctx).toContain("NOTAS FISCAIS");
    expect(ctx).toContain("LISTA DE DESEJOS");
  });

  it("sem grupo, informa 'nenhum'", () => {
    expect(buildFinancialContext(ALL_ON, data(null))).toContain("- Grupo: nenhum");
  });

  it("com a permissão de sync desligada, omite a seção", () => {
    const ctx = buildFinancialContext({ ...ALL_ON, sync: false }, data(SECRET));
    expect(ctx).not.toContain("SINCRONIZACAO");
    expect(ctx).not.toContain(SECRET);
  });

  it("trata lastSyncTime e price inválidos (NaN) sem emitir Invalid Date ou R$ NaN", () => {
    const base = data(SECRET);
    const ctx = buildFinancialContext(ALL_ON, {
      ...base,
      sync: { ...base.sync, lastSyncTime: Number.NaN },
      wishlist: {
        ...base.wishlist,
        items: {
          "wi-nan": {
            ...base.wishlist.items["wi-1"],
            id: "wi-nan",
            price: Number.NaN,
          },
        },
      },
    });
    expect(ctx).not.toContain("Invalid Date");
    expect(ctx).not.toContain("NaN");
    expect(ctx).toContain("- Ultima sincronizacao: nunca");
    expect(ctx).toContain("sem preco");
  });
});

describe("ConsultantChatUseCase — blindagem do grupo na saída", () => {
  it("envia '- Grupo: configurado', não vaza o código nem links domus://", async () => {
    const completeMock = vi.mocked(AIClientService.complete);
    completeMock.mockReset();
    completeMock.mockResolvedValue({
      content: "Tudo certo!",
      tokensUsed: 10,
      fromCache: false,
    });

    await ConsultantChatUseCase.execute(
      `Meu link é domus://sync?code=${SECRET}`,
      [],
      data(SECRET),
      null,
      {
        ...DEFAULT_AI_SETTINGS,
        isEnabled: true,
        provider: "openai",
        apiKeyStatus: { openai: true },
        dataPermissions: ALL_ON,
      },
    );

    expect(completeMock).toHaveBeenCalledTimes(1);
    const sent = JSON.stringify(completeMock.mock.calls[0][0].messages);
    expect(sent).toContain("- Grupo: configurado");
    expect(sent).toContain("[link-de-sincronizacao-removido]");
    expect(sent).not.toContain(SECRET);
  });
});
