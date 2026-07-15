// ─── Keyword → category mapping ──────────────────────────────────────────────

export const KEYWORD_MAP: Record<string, { categoryId: string; group: "needs" | "wants" | "savings" }> = {
  arroz: { categoryId: "alimentacao", group: "needs" },
  feijao: { categoryId: "alimentacao", group: "needs" },
  feijão: { categoryId: "alimentacao", group: "needs" },
  leite: { categoryId: "alimentacao", group: "needs" },
  pao: { categoryId: "alimentacao", group: "needs" },
  pão: { categoryId: "alimentacao", group: "needs" },
  carne: { categoryId: "alimentacao", group: "needs" },
  frango: { categoryId: "alimentacao", group: "needs" },
  ovo: { categoryId: "alimentacao", group: "needs" },
  ovos: { categoryId: "alimentacao", group: "needs" },
  acucar: { categoryId: "alimentacao", group: "needs" },
  açúcar: { categoryId: "alimentacao", group: "needs" },
  sal: { categoryId: "alimentacao", group: "needs" },
  oleo: { categoryId: "alimentacao", group: "needs" },
  óleo: { categoryId: "alimentacao", group: "needs" },
  farinha: { categoryId: "alimentacao", group: "needs" },
  macarrao: { categoryId: "alimentacao", group: "needs" },
  macarrão: { categoryId: "alimentacao", group: "needs" },
  cafe: { categoryId: "alimentacao", group: "needs" },
  café: { categoryId: "alimentacao", group: "needs" },
  manteiga: { categoryId: "alimentacao", group: "needs" },
  queijo: { categoryId: "alimentacao", group: "needs" },
  presunto: { categoryId: "alimentacao", group: "needs" },
  tomate: { categoryId: "alimentacao", group: "needs" },
  cebola: { categoryId: "alimentacao", group: "needs" },
  alho: { categoryId: "alimentacao", group: "needs" },
  batata: { categoryId: "alimentacao", group: "needs" },
  banana: { categoryId: "alimentacao", group: "needs" },
  maca: { categoryId: "alimentacao", group: "needs" },
  maçã: { categoryId: "alimentacao", group: "needs" },
  laranja: { categoryId: "alimentacao", group: "needs" },
  legume: { categoryId: "alimentacao", group: "needs" },
  verdura: { categoryId: "alimentacao", group: "needs" },
  fruta: { categoryId: "alimentacao", group: "needs" },
  iogurte: { categoryId: "alimentacao", group: "needs" },
  margarina: { categoryId: "alimentacao", group: "needs" },

  sabonete: { categoryId: "higiene", group: "needs" },
  shampoo: { categoryId: "higiene", group: "needs" },
  pasta: { categoryId: "higiene", group: "needs" },
  escova: { categoryId: "higiene", group: "needs" },
  absorvente: { categoryId: "higiene", group: "needs" },
  papel: { categoryId: "higiene", group: "needs" },
  desodorante: { categoryId: "higiene", group: "needs" },
  fralda: { categoryId: "higiene", group: "needs" },

  detergente: { categoryId: "limpeza", group: "needs" },
  desinfetante: { categoryId: "limpeza", group: "needs" },
  alvejante: { categoryId: "limpeza", group: "needs" },
  sabao: { categoryId: "limpeza", group: "needs" },
  sabão: { categoryId: "limpeza", group: "needs" },
  esponja: { categoryId: "limpeza", group: "needs" },
  "agua sanitaria": { categoryId: "limpeza", group: "needs" },
  "água sanitária": { categoryId: "limpeza", group: "needs" },

  remedio: { categoryId: "saude", group: "needs" },
  remédio: { categoryId: "saude", group: "needs" },
  medicamento: { categoryId: "saude", group: "needs" },
  dipirona: { categoryId: "saude", group: "needs" },
  paracetamol: { categoryId: "saude", group: "needs" },

  cerveja: { categoryId: "lazer", group: "wants" },
  vinho: { categoryId: "lazer", group: "wants" },
  vodka: { categoryId: "lazer", group: "wants" },
  whisky: { categoryId: "lazer", group: "wants" },
  refrigerante: { categoryId: "lazer", group: "wants" },
  coca: { categoryId: "lazer", group: "wants" },
  suco: { categoryId: "lazer", group: "wants" },
  chocolate: { categoryId: "lazer", group: "wants" },
  sorvete: { categoryId: "lazer", group: "wants" },
  biscoito: { categoryId: "lazer", group: "wants" },
  bolacha: { categoryId: "lazer", group: "wants" },
  salgadinho: { categoryId: "lazer", group: "wants" },
  doce: { categoryId: "lazer", group: "wants" },
  bala: { categoryId: "lazer", group: "wants" },
  chiclete: { categoryId: "lazer", group: "wants" },
  energetico: { categoryId: "lazer", group: "wants" },
  energético: { categoryId: "lazer", group: "wants" },
  energ: { categoryId: "lazer", group: "wants" },
  monster: { categoryId: "lazer", group: "wants" },
  "red bull": { categoryId: "lazer", group: "wants" },
  redbull: { categoryId: "lazer", group: "wants" },
  "burn ener": { categoryId: "lazer", group: "wants" },
  "tnt ener": { categoryId: "lazer", group: "wants" },
  pizza: { categoryId: "lazer", group: "wants" },
  hamburguer: { categoryId: "lazer", group: "wants" },
  hambúrguer: { categoryId: "lazer", group: "wants" },
  lanche: { categoryId: "lazer", group: "wants" },
  // ── Abreviações comuns em NF-e ──────────────────────────────────────────
  refrig: { categoryId: "lazer", group: "wants" },
  guarana: { categoryId: "lazer", group: "wants" },
  guaraná: { categoryId: "lazer", group: "wants" },
  pepsi: { categoryId: "lazer", group: "wants" },
  fanta: { categoryId: "lazer", group: "wants" },
  sprite: { categoryId: "lazer", group: "wants" },
  "coca cola": { categoryId: "lazer", group: "wants" },
  "coca-cola": { categoryId: "lazer", group: "wants" },
  skol: { categoryId: "lazer", group: "wants" },
  brahma: { categoryId: "lazer", group: "wants" },
  heineken: { categoryId: "lazer", group: "wants" },
  amstel: { categoryId: "lazer", group: "wants" },
  budweiser: { categoryId: "lazer", group: "wants" },
  doritos: { categoryId: "lazer", group: "wants" },
  ruffles: { categoryId: "lazer", group: "wants" },
  "beb lact": { categoryId: "alimentacao", group: "needs" },
  nescau: { categoryId: "alimentacao", group: "needs" },
  toddy: { categoryId: "lazer", group: "wants" },
  nutella: { categoryId: "lazer", group: "wants" },
  miojo: { categoryId: "alimentacao", group: "needs" },
  nissin: { categoryId: "alimentacao", group: "needs" },
  "cup noodle": { categoryId: "alimentacao", group: "needs" },
  molho: { categoryId: "alimentacao", group: "needs" },
  ketchup: { categoryId: "alimentacao", group: "needs" },
  maionese: { categoryId: "alimentacao", group: "needs" },
  mostarda: { categoryId: "alimentacao", group: "needs" },
  azeite: { categoryId: "alimentacao", group: "needs" },
  vinagre: { categoryId: "alimentacao", group: "needs" },
  achoc: { categoryId: "lazer", group: "wants" },
  bombom: { categoryId: "lazer", group: "wants" },
  wafer: { categoryId: "lazer", group: "wants" },
  "bisc rec": { categoryId: "lazer", group: "wants" },
  cream: { categoryId: "lazer", group: "wants" },
  picole: { categoryId: "lazer", group: "wants" },
  picolé: { categoryId: "lazer", group: "wants" },
  // ── Higiene abreviações NF ──────────────────────────────────────────
  "cond hair": { categoryId: "higiene", group: "needs" },
  condicion: { categoryId: "higiene", group: "needs" },
  "sab liq": { categoryId: "higiene", group: "needs" },
  "cr dent": { categoryId: "higiene", group: "needs" },
  colgate: { categoryId: "higiene", group: "needs" },
  oral: { categoryId: "higiene", group: "needs" },
  gillette: { categoryId: "higiene", group: "needs" },
  "pap hig": { categoryId: "higiene", group: "needs" },
  "papel hig": { categoryId: "higiene", group: "needs" },
  // ── Limpeza abreviações NF ──────────────────────────────────────────
  "det liq": { categoryId: "limpeza", group: "needs" },
  ype: { categoryId: "limpeza", group: "needs" },
  "ag sanit": { categoryId: "limpeza", group: "needs" },
  "limp mult": { categoryId: "limpeza", group: "needs" },
  veja: { categoryId: "limpeza", group: "needs" },

  // Frete - será reclassificado para categoria predominante da compra
  frete: { categoryId: "outros", group: "wants" },
  "frete cobrado": { categoryId: "outros", group: "wants" },
  entrega: { categoryId: "outros", group: "wants" },

  // Descontos - será reclassificado para categoria predominante
  desconto: { categoryId: "outros", group: "wants" },

  // ── Termos técnicos SISCOMEX (aparecem nas descrições NCM) ────────────
  // Higiene
  perfumaria: { categoryId: "higiene", group: "needs" },
  toucador: { categoryId: "higiene", group: "needs" },
  cosmetica: { categoryId: "higiene", group: "needs" },
  "oleo essencial": { categoryId: "higiene", group: "needs" },
  resinoides: { categoryId: "higiene", group: "needs" },
  antitranspirante: { categoryId: "higiene", group: "needs" },
  // Limpeza
  tensioativo: { categoryId: "limpeza", group: "needs" },
  inseticida: { categoryId: "limpeza", group: "needs" },
  fungicida: { categoryId: "limpeza", group: "needs" },
  rodenticida: { categoryId: "limpeza", group: "needs" },
  // Alimentação (SISCOMEX)
  bovino: { categoryId: "alimentacao", group: "needs" },
  suino: { categoryId: "alimentacao", group: "needs" },
  avicultura: { categoryId: "alimentacao", group: "needs" },
  pescado: { categoryId: "alimentacao", group: "needs" },
  laticinios: { categoryId: "alimentacao", group: "needs" },
  hortalica: { categoryId: "alimentacao", group: "needs" },
  confeitaria: { categoryId: "lazer", group: "wants" },
  // Saúde (SISCOMEX)
  farmaceutico: { categoryId: "saude", group: "needs" },
  vacina: { categoryId: "saude", group: "needs" },
  // Vestuário (SISCOMEX)
  calcado: { categoryId: "vestuario", group: "wants" },
  vestuario: { categoryId: "vestuario", group: "wants" },
  // Educação (SISCOMEX)
  livro: { categoryId: "educacao", group: "savings" },
  impressos: { categoryId: "educacao", group: "savings" },
};

// NCM classification map — keyed by prefix (2, 4, or 8 digits).
// Checked longest-first so more specific rules win.
// NOTE: subcategoryId comes from ncmCategories.ts; this map is the legacy
// fallback used when subcategory lookup is not available.
export const NCM_MAP: Array<{ prefix: string; categoryId: string; group: "needs" | "wants" | "savings"; subcategoryId?: string }> = [
  // ── Bebidas alcoólicas (2203-2208) → lazer ──────────────────────────
  { prefix: "2203", categoryId: "lazer", group: "wants" },
  { prefix: "2204", categoryId: "lazer", group: "wants" },
  { prefix: "2205", categoryId: "lazer", group: "wants" },
  { prefix: "2206", categoryId: "lazer", group: "wants" },
  { prefix: "2207", categoryId: "lazer", group: "wants" },
  { prefix: "2208", categoryId: "lazer", group: "wants" },
  // ── Refrigerantes / sucos industrializados (2202) → lazer ───────────
  { prefix: "2202", categoryId: "lazer", group: "wants" },
  // ── Sorvetes (2105) → lazer ─────────────────────────────────────────
  { prefix: "2105", categoryId: "lazer", group: "wants" },
  // ── Chocolate (1806) → lazer ─────────────────────────────────────────
  { prefix: "1806", categoryId: "lazer", group: "wants" },
  // ── Biscoitos, snacks (1905) → lazer ─────────────────────────────────
  { prefix: "1905", categoryId: "lazer", group: "wants" },
  // ── Brinquedos (9503) → lazer ────────────────────────────────────────
  { prefix: "9503", categoryId: "lazer", group: "wants" },
  // ── Higiene pessoal (3301-3307, 4818) ────────────────────────────────
  { prefix: "3301", categoryId: "higiene", group: "needs" },
  { prefix: "3302", categoryId: "higiene", group: "needs" },
  { prefix: "3303", categoryId: "higiene", group: "needs" },
  { prefix: "3304", categoryId: "higiene", group: "needs" },
  { prefix: "3305", categoryId: "higiene", group: "needs" },
  { prefix: "3306", categoryId: "higiene", group: "needs" },
  { prefix: "3307", categoryId: "higiene", group: "needs" },
  { prefix: "4818", categoryId: "higiene", group: "needs" }, // papel higiênico / lenços
  // ── Limpeza (3401-3405, 3808) ─────────────────────────────────────────
  { prefix: "3401", categoryId: "limpeza", group: "needs" }, // sabões
  { prefix: "3402", categoryId: "limpeza", group: "needs" }, // detergentes
  { prefix: "3403", categoryId: "limpeza", group: "needs" },
  { prefix: "3404", categoryId: "limpeza", group: "needs" },
  { prefix: "3405", categoryId: "limpeza", group: "needs" }, // ceras/polimentos
  { prefix: "3808", categoryId: "limpeza", group: "needs" }, // inseticidas/desinfetantes
  // ── Vestuário (61-67) ────────────────────────────────────────────────
  { prefix: "61", categoryId: "vestuario", group: "wants" },
  { prefix: "62", categoryId: "vestuario", group: "wants" },
  { prefix: "63", categoryId: "vestuario", group: "wants" },
  { prefix: "64", categoryId: "vestuario", group: "wants" }, // calçados
  { prefix: "65", categoryId: "vestuario", group: "wants" }, // chapéus
  { prefix: "66", categoryId: "vestuario", group: "wants" },
  { prefix: "67", categoryId: "vestuario", group: "wants" },
  // ── Livros / educação (49) ───────────────────────────────────────────
  { prefix: "49", categoryId: "educacao", group: "savings" },
  // ── Alimentos (captura ampla — deve vir depois das exceções acima) ───
  { prefix: "02", categoryId: "alimentacao", group: "needs" }, // carnes
  { prefix: "03", categoryId: "alimentacao", group: "needs" }, // peixes
  { prefix: "04", categoryId: "alimentacao", group: "needs" }, // laticínios, ovos
  { prefix: "07", categoryId: "alimentacao", group: "needs" }, // hortaliças
  { prefix: "08", categoryId: "alimentacao", group: "needs" }, // frutas
  { prefix: "09", categoryId: "alimentacao", group: "needs" }, // café, chá, especiarias
  { prefix: "10", categoryId: "alimentacao", group: "needs" }, // cereais
  { prefix: "11", categoryId: "alimentacao", group: "needs" }, // moagem cereais
  { prefix: "15", categoryId: "alimentacao", group: "needs" }, // gorduras, óleos
  { prefix: "16", categoryId: "alimentacao", group: "needs" }, // preparações carnes/peixes
  { prefix: "17", categoryId: "alimentacao", group: "needs" }, // açúcares (inclui 1804 cacau em pó)
  { prefix: "1901", categoryId: "alimentacao", group: "needs" },
  { prefix: "1902", categoryId: "alimentacao", group: "needs" }, // massas
  { prefix: "1903", categoryId: "alimentacao", group: "needs" },
  { prefix: "1904", categoryId: "alimentacao", group: "needs" },
  { prefix: "20", categoryId: "alimentacao", group: "needs" }, // preparações hortaliças
  { prefix: "21", categoryId: "alimentacao", group: "needs" }, // preparações alimentares (café, molhos, etc.)
  { prefix: "2201", categoryId: "alimentacao", group: "needs" }, // água mineral
  { prefix: "2209", categoryId: "alimentacao", group: "needs" }, // vinagre
  { prefix: "2301", categoryId: "alimentacao", group: "needs" }, // farinhas de carne
  { prefix: "2302", categoryId: "alimentacao", group: "needs" },
];

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}
