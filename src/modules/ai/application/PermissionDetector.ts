import type { AIDataPermissions } from "../domain/AISettings";

/**
 * Keywords that suggest the user is asking about a specific data type.
 * Returns the first missing permission key needed, or null if all needed
 * permissions are already granted.
 */

const KEYWORD_MAP: { keys: string[]; permission: keyof AIDataPermissions }[] = [
  {
    keys: ["transacao", "transacoes", "gasto", "gastos", "despesa", "despesas", "compra", "compras", "extrato", "pagamento", "pagamentos", "receita", "receitas"],
    permission: "transactions",
  },
  {
    keys: ["conta", "contas", "saldo", "banco", "cartao", "credito", "limite", "debito"],
    permission: "accounts",
  },
  {
    keys: ["categoria", "categorias", "orcamento", "grupo"],
    permission: "categories",
  },
  {
    keys: ["nota", "notas", "fiscal", "cupom", "nfe", "danfe"],
    permission: "invoices",
  },
  {
    keys: ["desejo", "desejos", "wishlist", "lista de desejo", "quero comprar", "meta de compra"],
    permission: "wishlist",
  },
  {
    keys: ["trofeu", "trofeus", "conquista", "conquistas", "nivel", "xp", "streak", "medalha", "gamificacao"],
    permission: "gamification",
  },
  {
    keys: ["sinc", "sincroniz", "sync", "grupo", "dispositivo", "aparelho", "relay"],
    permission: "sync",
  },
];

export function detectMissingPermission(
  message: string,
  currentPermissions: AIDataPermissions,
): keyof AIDataPermissions | null {
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const entry of KEYWORD_MAP) {
    const matches = entry.keys.some((k) => {
      const normalized = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return lower.includes(normalized);
    });

    if (matches && !currentPermissions[entry.permission]) {
      return entry.permission;
    }
  }

  return null;
}
