import type {
  TransactionPayload,
  AccountPayload,
  CategoryPayload,
} from "@packages/events/src/types";
import type { StoredInvoice } from "@packages/domain/src/state";
import type { WishlistState } from "@packages/wishlist/src/types";
import type { GamificationState } from "@packages/gamification/src/types";
import type { AIDataPermissions } from "../domain/AISettings";

/** Max items to include to avoid blowing token budget */
const MAX_TRANSACTIONS = 50;
const MAX_INVOICES = 10;

export interface SyncInfo {
  groupId: string | null;
  eventCount: number;
  relayCount: number;
  isAutoSyncEnabled: boolean;
  lastSyncTime: number | null;
}

export interface ContextData {
  transactions: TransactionPayload[];
  accounts: AccountPayload[];
  categories: Record<string, CategoryPayload>;
  invoices: Record<string, StoredInvoice>;
  wishlist: WishlistState;
  gamification: GamificationState;
  sync: SyncInfo;
}

/**
 * Builds a rich text context string from the user's real data,
 * filtered by the data permissions they granted.
 */
export function buildFinancialContext(
  permissions: AIDataPermissions,
  data: ContextData,
): string {
  const sections: string[] = [];

  // Accounts
  if (permissions.accounts && data.accounts.length > 0) {
    const lines = data.accounts.map((a) => {
      let line = `- ${a.name} (${a.type}): R$ ${a.balance.toFixed(2)}`;
      if (a.creditLimit) line += ` | limite R$ ${a.creditLimit.toFixed(2)}`;
      return line;
    });
    sections.push(`CONTAS:\n${lines.join("\n")}`);
  }

  // Categories
  if (permissions.categories && Object.keys(data.categories).length > 0) {
    const lines = Object.values(data.categories).map(
      (c) => `- ${c.name} (${c.group})`,
    );
    sections.push(`CATEGORIAS:\n${lines.join("\n")}`);
  }

  // Transactions (most recent first)
  if (permissions.transactions && data.transactions.length > 0) {
    const sorted = [...data.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, MAX_TRANSACTIONS);

    const lines = sorted.map((t) => {
      const cat = data.categories[t.categoryId]?.name ?? t.categoryId;
      const desc = t.description ?? "sem descricao";
      return `- ${t.date} | ${t.type} | R$ ${t.amount.toFixed(2)} | ${cat} | ${desc}`;
    });
    sections.push(
      `TRANSACOES RECENTES (${sorted.length} de ${data.transactions.length}):\n${lines.join("\n")}`,
    );
  }

  // Invoices
  if (permissions.invoices && Object.keys(data.invoices).length > 0) {
    const list = Object.values(data.invoices).slice(0, MAX_INVOICES);
    const lines = list.map((inv) => {
      const itemCount = inv.items?.length ?? 0;
      const emitter = inv.emitter?.name ?? "desconhecido";
      return `- ${inv.date} | ${emitter} | ${itemCount} itens | R$ ${inv.totalAmount.toFixed(2)}`;
    });
    sections.push(
      `NOTAS FISCAIS RECENTES (${list.length}):\n${lines.join("\n")}`,
    );
  }

  // Wishlist
  if (permissions.wishlist && Object.keys(data.wishlist.items).length > 0) {
    const items = Object.values(data.wishlist.items);
    const lines = items.map((item) => {
      const price = item.price != null ? `R$ ${item.price.toFixed(2)}` : "sem preco";
      return `- ${item.name} | ${item.urgencyLevel} | ${price}`;
    });
    sections.push(`LISTA DE DESEJOS (${items.length} itens):\n${lines.join("\n")}`);
  }

  // Gamification
  if (permissions.gamification) {
    const g = data.gamification;
    const achieveCount = g.unlockedAchievements?.length ?? 0;
    const trophyCount = g.completedMonthlyTrophies?.length ?? 0;
    const lines = [
      `- Nivel: ${g.level} | XP total: ${g.totalXp} | XP temporada: ${g.seasonXp}`,
      `- Streak atual: ${g.currentStreak} dias | Maior streak: ${g.longestStreak} dias`,
      `- Conquistas desbloqueadas: ${achieveCount}`,
      `- Trofeus mensais completados: ${trophyCount}`,
    ];
    sections.push(`GAMIFICACAO:\n${lines.join("\n")}`);
  }

  // Sync
  if (permissions.sync) {
    const s = data.sync;
    const syncTime = s.lastSyncTime
      ? new Date(s.lastSyncTime).toLocaleString("pt-BR")
      : "nunca";
    const lines = [
      `- Grupo: ${s.groupId ?? "nenhum"}`,
      `- Auto-sync: ${s.isAutoSyncEnabled ? "ativado" : "desativado"}`,
      `- Eventos sincronizados: ${s.eventCount}`,
      `- Relays conectados: ${s.relayCount}`,
      `- Ultima sincronizacao: ${syncTime}`,
    ];
    sections.push(`SINCRONIZACAO:\n${lines.join("\n")}`);
  }

  if (sections.length === 0) return "";
  return `\n\n[DADOS FINANCEIROS DO USUARIO]\n${sections.join("\n\n")}`;
}
