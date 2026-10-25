import type { CategoryGroup, TransactionType } from "@packages/events/src/types";

export interface TransactionCategory {
  id: string;
  name: string;
  group: CategoryGroup;
  icon: string;
  /** Quando true, o usuário pode alternar needs/wants para esta categoria */
  allowGroupOverride?: boolean;
  /** Id da categoria pai (para subcategorias) */
  parentId?: string;
}

// ──────────────────────────────────────────────────────────────────
// Expense categories (despesas)
// ──────────────────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  { id: "alimentacao",   name: "Alimentação",    group: "needs",   icon: "shopping-cart", allowGroupOverride: true },
  { id: "higiene",       name: "Higiene",        group: "needs",   icon: "smile"           },
  { id: "limpeza",       name: "Limpeza",        group: "needs",   icon: "wind"            },
  { id: "moradia",       name: "Moradia",        group: "needs",   icon: "home"            },
  { id: "transporte",    name: "Transporte",     group: "needs",   icon: "truck"           },
  { id: "saude",         name: "Saúde",          group: "needs",   icon: "heart"           },
  { id: "educacao",      name: "Educação",       group: "needs",   icon: "book"            },
  { id: "vestuario",     name: "Vestuário",      group: "wants",   icon: "shopping-bag", allowGroupOverride: true },
  { id: "lazer",         name: "Lazer",          group: "wants",   icon: "music"           },
  { id: "compras",       name: "Compras",        group: "wants",   icon: "shopping-bag"    },
  { id: "restaurantes",  name: "Restaurantes",   group: "wants",   icon: "coffee",       allowGroupOverride: true },
  { id: "assinaturas",   name: "Assinaturas",    group: "wants",   icon: "repeat"          },
  { id: "dizimo",        name: "Dízimo / Oferta", group: "wants",  icon: "gift"            },
  { id: "outros_desp",   name: "Outros",         group: "wants",   icon: "more-horizontal" },
];

// ──────────────────────────────────────────────────────────────────
// Income categories (receitas)
// ──────────────────────────────────────────────────────────────────
export const INCOME_CATEGORIES: TransactionCategory[] = [
  { id: "salario",       name: "Salário",        group: "needs",   icon: "briefcase"       },
  { id: "renda_extra",   name: "Renda Extra",    group: "needs",   icon: "dollar-sign"     },
  { id: "freelance",     name: "Freelance",      group: "needs",   icon: "code"            },
  { id: "aluguel_rec",   name: "Aluguel",        group: "needs",   icon: "home"            },
  { id: "investimentos", name: "Investimentos",  group: "savings", icon: "trending-up"     },
  { id: "outros_rec",    name: "Outros",         group: "needs",   icon: "more-horizontal" },
];

// ──────────────────────────────────────────────────────────────────
// Combined list — used by ItemsSection (expense items), and for
// backward-compatibility when looking up stored category names.
// ──────────────────────────────────────────────────────────────────
export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
  // savings / meta categories kept for 50/30/20 lookups
  { id: "reserva",       name: "Reserva",        group: "savings", icon: "shield"          },
];

export function getCategoriesForType(type: TransactionType): TransactionCategory[] {
  if (type === "income") return INCOME_CATEGORIES;
  if (type === "transfer") return [
    { id: "transferencia", name: "Transferência", group: "needs", icon: "repeat" },
  ];
  return EXPENSE_CATEGORIES;
}

export type ManualItem = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  categoryId: string;        // id from TRANSACTION_CATEGORIES
  subcategoryId?: string;    // subcategoria NCM granular
  groupOverride?: "needs" | "wants" | "savings";
  ean?: string;              // código de barras EAN/GTIN
  ncm?: string;              // NCM fiscal (8 dígitos)
};

export function itemTotal(item: ManualItem): number {
  const qty   = parseFloat(item.quantity.replace(",", ".")) || 0;
  const price = parseFloat(item.unitPrice.replace(",", ".")) || 0;
  return qty * price;
}

export function groupLabel(g: CategoryGroup): string {
  switch (g) {
    case "needs":   return "Necessidades (50%)";
    case "wants":   return "Desejos (30%)";
    case "savings": return "Poupança (20%)";
  }
}

export const TX_TYPES = [
  { key: "expense" as const,  label: "Despesa",       icon: "arrow-down-left" },
  { key: "income" as const,   label: "Receita",        icon: "arrow-up-right"  },
  { key: "transfer" as const, label: "Transferência", icon: "repeat"           },
];
