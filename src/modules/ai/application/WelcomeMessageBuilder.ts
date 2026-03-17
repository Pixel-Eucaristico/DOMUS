import type {
  TransactionPayload,
  AccountPayload,
} from "@packages/events/src/types";
import type { GamificationState } from "@packages/gamification/src/types";
import type { WishlistState } from "@packages/wishlist/src/types";
import type { AIDataPermissions } from "../domain/AISettings";

/**
 * Builds a personalized welcome message based on the data the user
 * has granted access to. Returns null if no interesting data is available.
 */
export function buildWelcomeMessage(
  permissions: AIDataPermissions,
  transactions: TransactionPayload[],
  accounts: AccountPayload[],
  gamification: GamificationState,
  wishlist: WishlistState,
): string {
  const lines: string[] = [];

  lines.push("**Ola! Sou o DOMUS, seu consultor financeiro.**\n");

  // Gamification highlights
  if (permissions.gamification) {
    if (gamification.currentStreak > 0) {
      lines.push(
        `🔥 **Parabens!** Voce esta com um streak de **${gamification.currentStreak} dias** consecutivos!`,
      );
    }
    if (gamification.level > 1) {
      lines.push(
        `🏆 Nivel **${gamification.level}** com **${gamification.totalXp.toLocaleString("pt-BR")} XP** acumulados.`,
      );
    }
    const achievements = gamification.unlockedAchievements?.length ?? 0;
    if (achievements > 0) {
      lines.push(`🎖️ ${achievements} conquista${achievements > 1 ? "s" : ""} desbloqueada${achievements > 1 ? "s" : ""}!`);
    }
  }

  // Account summary
  if (permissions.accounts && accounts.length > 0) {
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    lines.push(
      `\n💰 Saldo total: **R$ ${totalBalance.toFixed(2)}** em ${accounts.length} conta${accounts.length > 1 ? "s" : ""}.`,
    );
  }

  // Recent transaction insight
  if (permissions.transactions && transactions.length > 0) {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTx = transactions.filter((t) => t.date?.startsWith(thisMonth));
    const expenses = monthTx
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    if (expenses > 0) {
      lines.push(
        `📊 Este mes voce ja gastou **R$ ${expenses.toFixed(2)}** em ${monthTx.filter((t) => t.type === "expense").length} transacoes.`,
      );
    }
  }

  // Wishlist highlights
  if (permissions.wishlist) {
    const items = Object.values(wishlist.items);
    if (items.length > 0) {
      const urgentItems = items.filter((i) => i.urgencyLevel === "PRIORITY" || i.urgencyLevel === "ESSENTIAL");
      if (urgentItems.length > 0) {
        lines.push(
          `🎯 Voce tem **${urgentItems.length} item${urgentItems.length > 1 ? "ns" : ""}** urgente${urgentItems.length > 1 ? "s" : ""} na lista de desejos.`,
        );
      } else {
        lines.push(`📋 ${items.length} item${items.length > 1 ? "ns" : ""} na sua lista de desejos.`);
      }
    }
  }

  lines.push("\nComo posso te ajudar hoje? Pergunte sobre seus gastos, peca uma analise ou conselho antes de uma compra.");

  return lines.join("\n");
}
