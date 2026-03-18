// ─── NCM-based subcategory system ──────────────────────────────────────────
// Maps NCM prefixes to granular subcategories, grouped under parent categories.
// Each subcategory can optionally allow the user to override the default
// needs/wants/savings group (e.g. "Açúcar e Doces" defaults to needs but user
// may classify it as wants).

import type { CategoryGroup } from "@packages/events/src/types";

export interface NCMSubcategory {
  id: string;
  name: string;
  parentId: string;          // references a top-level category id
  group: CategoryGroup;      // default group
  allowGroupOverride: boolean;
  icon: string;
  ncmPrefixes: string[];     // NCM prefixes that map to this subcategory
}

// ──────────────────────────────────────────────────────────────────────────────
// Subcategories — ordered by parent, then by NCM chapter
// ──────────────────────────────────────────────────────────────────────────────

export const NCM_SUBCATEGORIES: NCMSubcategory[] = [
  // ── Alimentação ────────────────────────────────────────────────────────────
  {
    id: "carnes_peixes",
    name: "Carnes e Peixes",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "box",
    ncmPrefixes: ["02", "03", "16"],
  },
  {
    id: "laticinios_ovos",
    name: "Laticinios e Ovos",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "droplet",
    ncmPrefixes: ["04"],
  },
  {
    id: "hortalicas_legumes",
    name: "Hortalicas e Legumes",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "sun",
    ncmPrefixes: ["07"],
  },
  {
    id: "frutas",
    name: "Frutas",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "aperture",
    ncmPrefixes: ["08"],
  },
  {
    id: "cafe_cha_especiarias",
    name: "Cafe, Cha e Especiarias",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: true,
    icon: "coffee",
    ncmPrefixes: ["09"],
  },
  {
    id: "cereais_graos",
    name: "Cereais e Graos",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "layers",
    ncmPrefixes: ["10", "11"],
  },
  {
    id: "oleos_gorduras",
    name: "Oleos e Gorduras",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "droplet",
    ncmPrefixes: ["15"],
  },
  {
    id: "acucar_doces",
    name: "Acucar e Doces",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: true,
    icon: "star",
    ncmPrefixes: ["17", "1806"],
  },
  {
    id: "massas_panificacao",
    name: "Massas e Panificacao",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: true,
    icon: "grid",
    ncmPrefixes: ["1901", "1902", "1903", "1904", "1905"],
  },
  {
    id: "preparacoes_alimentares",
    name: "Preparacoes Alimentares",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: true,
    icon: "package",
    ncmPrefixes: ["20", "21"],
  },
  {
    id: "farinhas_carnes",
    name: "Farinhas e Derivados",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "archive",
    ncmPrefixes: ["2301", "2302"],
  },

  // ── Bebidas ────────────────────────────────────────────────────────────────
  {
    id: "agua_mineral",
    name: "Agua Mineral",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "droplet",
    ncmPrefixes: ["2201"],
  },
  {
    id: "refrigerantes_sucos",
    name: "Refrigerantes e Sucos",
    parentId: "lazer",
    group: "wants",
    allowGroupOverride: true,
    icon: "zap",
    ncmPrefixes: ["2202"],
  },
  {
    id: "bebidas_alcoolicas",
    name: "Bebidas Alcoolicas",
    parentId: "lazer",
    group: "wants",
    allowGroupOverride: false,
    icon: "glass-water",
    ncmPrefixes: ["2203", "2204", "2205", "2206", "2207", "2208"],
  },
  {
    id: "vinagre",
    name: "Vinagre",
    parentId: "alimentacao",
    group: "needs",
    allowGroupOverride: false,
    icon: "droplet",
    ncmPrefixes: ["2209"],
  },

  // ── Higiene ────────────────────────────────────────────────────────────────
  {
    id: "higiene_pessoal",
    name: "Higiene Pessoal",
    parentId: "higiene",
    group: "needs",
    allowGroupOverride: false,
    icon: "smile",
    ncmPrefixes: ["3301", "3302", "3303", "3304", "3305", "3306", "3307"],
  },
  {
    id: "papel_lencos",
    name: "Papel Higienico e Lencos",
    parentId: "higiene",
    group: "needs",
    allowGroupOverride: false,
    icon: "file",
    ncmPrefixes: ["4818"],
  },

  // ── Limpeza ────────────────────────────────────────────────────────────────
  {
    id: "saboes_detergentes",
    name: "Saboes e Detergentes",
    parentId: "limpeza",
    group: "needs",
    allowGroupOverride: false,
    icon: "wind",
    ncmPrefixes: ["3401", "3402"],
  },
  {
    id: "produtos_limpeza",
    name: "Produtos de Limpeza",
    parentId: "limpeza",
    group: "needs",
    allowGroupOverride: false,
    icon: "refresh-cw",
    ncmPrefixes: ["3403", "3404", "3405"],
  },
  {
    id: "inseticidas_desinfetantes",
    name: "Inseticidas e Desinfetantes",
    parentId: "limpeza",
    group: "needs",
    allowGroupOverride: false,
    icon: "shield",
    ncmPrefixes: ["3808"],
  },

  // ── Saúde ──────────────────────────────────────────────────────────────────
  {
    id: "medicamentos",
    name: "Medicamentos",
    parentId: "saude",
    group: "needs",
    allowGroupOverride: false,
    icon: "activity",
    ncmPrefixes: ["30"],
  },
  {
    id: "produtos_farmaceuticos",
    name: "Produtos Farmaceuticos",
    parentId: "saude",
    group: "needs",
    allowGroupOverride: false,
    icon: "heart",
    ncmPrefixes: ["2936", "2937", "2941"],
  },

  // ── Vestuário ──────────────────────────────────────────────────────────────
  {
    id: "roupas",
    name: "Roupas",
    parentId: "vestuario",
    group: "wants",
    allowGroupOverride: true,
    icon: "shopping-bag",
    ncmPrefixes: ["61", "62", "63"],
  },
  {
    id: "calcados",
    name: "Calcados",
    parentId: "vestuario",
    group: "wants",
    allowGroupOverride: true,
    icon: "navigation",
    ncmPrefixes: ["64"],
  },
  {
    id: "acessorios_moda",
    name: "Acessorios e Moda",
    parentId: "vestuario",
    group: "wants",
    allowGroupOverride: false,
    icon: "tag",
    ncmPrefixes: ["65", "66", "67"],
  },

  // ── Educação ───────────────────────────────────────────────────────────────
  {
    id: "livros_impressos",
    name: "Livros e Impressos",
    parentId: "educacao",
    group: "savings",
    allowGroupOverride: false,
    icon: "book-open",
    ncmPrefixes: ["49"],
  },

  // ── Eletrônicos ────────────────────────────────────────────────────────────
  {
    id: "informatica",
    name: "Informatica",
    parentId: "compras",
    group: "wants",
    allowGroupOverride: false,
    icon: "monitor",
    ncmPrefixes: ["8471", "8473"],
  },
  {
    id: "celulares_telecom",
    name: "Celulares e Telecom",
    parentId: "compras",
    group: "wants",
    allowGroupOverride: false,
    icon: "smartphone",
    ncmPrefixes: ["8517"],
  },
  {
    id: "eletrodomesticos",
    name: "Eletrodomesticos",
    parentId: "compras",
    group: "wants",
    allowGroupOverride: true,
    icon: "zap",
    ncmPrefixes: ["8418", "8450", "8451", "8508", "8509", "8516"],
  },

  // ── Moradia ────────────────────────────────────────────────────────────────
  {
    id: "material_construcao",
    name: "Material de Construcao",
    parentId: "moradia",
    group: "needs",
    allowGroupOverride: false,
    icon: "tool",
    ncmPrefixes: ["68", "69", "70", "72", "73"],
  },
  {
    id: "moveis",
    name: "Moveis",
    parentId: "moradia",
    group: "needs",
    allowGroupOverride: true,
    icon: "layout",
    ncmPrefixes: ["94"],
  },

  // ── Transporte ─────────────────────────────────────────────────────────────
  {
    id: "combustiveis",
    name: "Combustiveis",
    parentId: "transporte",
    group: "needs",
    allowGroupOverride: false,
    icon: "battery",
    ncmPrefixes: ["2710"],
  },
  {
    id: "pneus_autopartes",
    name: "Pneus e Autopartes",
    parentId: "transporte",
    group: "needs",
    allowGroupOverride: false,
    icon: "disc",
    ncmPrefixes: ["4011", "4012", "8708"],
  },

  // ── Tabaco (lazer/wants) ───────────────────────────────────────────────────
  {
    id: "tabaco",
    name: "Tabaco",
    parentId: "lazer",
    group: "wants",
    allowGroupOverride: false,
    icon: "wind",
    ncmPrefixes: ["24"],
  },

  // ── Pets ───────────────────────────────────────────────────────────────────
  {
    id: "produtos_pet",
    name: "Produtos Pet",
    parentId: "compras",
    group: "wants",
    allowGroupOverride: true,
    icon: "heart",
    ncmPrefixes: ["2309"],
  },
];

// ─── Lookup helpers ──────────────────────────────────────────────────────────

/** Find subcategory by NCM code (longest prefix match) */
export function findSubcategoryByNcm(ncm: string): NCMSubcategory | null {
  const digits = ncm.replace(/\D/g, "");
  if (!digits) return null;

  let best: NCMSubcategory | null = null;
  let bestLen = 0;

  for (const sub of NCM_SUBCATEGORIES) {
    for (const prefix of sub.ncmPrefixes) {
      if (digits.startsWith(prefix) && prefix.length > bestLen) {
        best = sub;
        bestLen = prefix.length;
      }
    }
  }

  return best;
}

/** Find subcategory by its id */
export function getSubcategoryById(id: string): NCMSubcategory | undefined {
  return NCM_SUBCATEGORIES.find((s) => s.id === id);
}

/** Get all subcategories for a parent category */
export function getSubcategoriesForParent(parentId: string): NCMSubcategory[] {
  return NCM_SUBCATEGORIES.filter((s) => s.parentId === parentId);
}

/** Get all unique parent category IDs */
export function getParentCategoryIds(): string[] {
  return [...new Set(NCM_SUBCATEGORIES.map((s) => s.parentId))];
}
