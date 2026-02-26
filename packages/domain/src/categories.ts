import { createEvent } from "@packages/events/src/factory";
import { EVENT_TYPES, type CategoryCreatedEvent } from "@packages/events/src/types";

export function createDefaultCategories(): CategoryCreatedEvent[] {
  const defaults = [
    // Necessidades (needs)
    { id: "alimentacao", name: "Alimentação", group: "needs" as const },
    { id: "higiene", name: "Higiene", group: "needs" as const },
    { id: "limpeza", name: "Limpeza", group: "needs" as const },
    { id: "saude", name: "Saúde", group: "needs" as const },
    { id: "transporte", name: "Transporte", group: "needs" as const },
    { id: "moradia", name: "Moradia", group: "needs" as const },
    { id: "impostos", name: "Impostos Obrigatórios", group: "needs" as const },

    // Desejos (wants)
    { id: "lazer", name: "Lazer", group: "wants" as const },
    { id: "vestuario", name: "Vestuário", group: "wants" as const },
    { id: "outros", name: "Outros", group: "wants" as const },
    { id: "compras_diversas", name: "Compras Diversas", group: "wants" as const },

    // Poupança (savings)
    { id: "educacao", name: "Educação", group: "savings" as const },
    { id: "investimentos", name: "Investimentos", group: "savings" as const },
  ];

  return defaults.map(cat =>
    createEvent<CategoryCreatedEvent>(
      EVENT_TYPES.CATEGORY_CREATED,
      cat,
      "system"
    )
  );
}
