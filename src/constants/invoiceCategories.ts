export interface CategoryOption {
  id: string;
  name: string;
  group: "needs" | "wants" | "savings";
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "alimentacao",    name: "Alimentação",       group: "needs"   },
  { id: "higiene",        name: "Higiene",            group: "needs"   },
  { id: "limpeza",        name: "Limpeza",            group: "needs"   },
  { id: "saude",          name: "Saúde",              group: "needs"   },
  { id: "transporte",     name: "Transporte",         group: "needs"   },
  { id: "moradia",        name: "Moradia",            group: "needs"   },
  { id: "lazer",          name: "Lazer",              group: "wants"   },
  { id: "vestuario",      name: "Vestuário",          group: "wants"   },
  { id: "outros",         name: "Outros",             group: "wants"   },
  { id: "compras_diversas", name: "Compras Diversas", group: "wants"   },
  { id: "educacao",       name: "Educação",           group: "savings" },
  { id: "investimentos",  name: "Investimentos",      group: "savings" },
];

export const GROUP_COLORS: Record<"needs" | "wants" | "savings", string> = {
  needs:   "#4CAF50",
  wants:   "#FF9800",
  savings: "#2196F3",
};
