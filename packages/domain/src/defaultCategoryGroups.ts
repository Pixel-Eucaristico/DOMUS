import type { CategoryGroup } from "../../events/src/types";

/**
 * Grupos padrão (50/30/20) para os IDs de categoria constantes usados pela
 * importação de notas fiscais e pelo classificador NCM.
 *
 * Serve de fallback em `calculate503020` quando o ID referenciado por uma
 * transação/item não existe em `domain.categories` — caso de transações
 * importadas antes de o evento CATEGORY_CREATED correspondente ser emitido.
 * Sem este fallback, itens essenciais (ex.: arroz em "alimentacao") eram
 * contabilizados como "wants".
 */
export const DEFAULT_CATEGORY_GROUPS: Record<string, CategoryGroup> = {
  alimentacao: "needs",
  higiene: "needs",
  limpeza: "needs",
  saude: "needs",
  transporte: "needs",
  moradia: "needs",
  lazer: "wants",
  vestuario: "wants",
  outros: "wants",
  compras: "wants",
  compras_diversas: "wants",
  restaurantes: "wants",
  educacao: "savings",
  investimentos: "savings",
};
