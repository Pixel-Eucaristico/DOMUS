import { createEvent } from "@packages/events/src/factory";
import { EVENT_TYPES, type CategoryCreatedEvent, type CategoryGroup } from "@packages/events/src/types";

export const DEFAULT_CATEGORY_EVENT_ID_PREFIX = "cats:default:";
export const CUSTOM_CATEGORY_EVENT_ID_PREFIX = "cats:custom:";

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function defaultCategoryEventId(categoryId: string): string {
  return `${DEFAULT_CATEGORY_EVENT_ID_PREFIX}${categoryId}`;
}

/**
 * Gera um slug estável a partir do nome da categoria (sem acentos, minúsculas,
 * separado por `-`). Usado para que dois aparelhos criem o mesmo `id` para a
 * mesma categoria sob demanda.
 */
export function categorySlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "categoria";
}

export function createCategoryByNameEvent(
  params: { id?: string; name: string; group: CategoryGroup },
  deviceId: string = "local",
): CategoryCreatedEvent {
  const catId = params.id && params.id.trim() ? params.id.trim() : categorySlug(params.name);
  const evt = createEvent<CategoryCreatedEvent>(
    EVENT_TYPES.CATEGORY_CREATED,
    {
      id: catId,
      name: params.name,
      group: params.group,
    },
    deviceId,
  );
  return { ...evt, id: `${CUSTOM_CATEGORY_EVENT_ID_PREFIX}${catId}` };
}

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

  const baseNow = Date.now();
  return defaults.map((cat, index) => {
    const evt = createEvent<CategoryCreatedEvent>(
      EVENT_TYPES.CATEGORY_CREATED,
      cat,
      "system",
    );
    return {
      ...evt,
      id: defaultCategoryEventId(cat.id),
      timestamp: baseNow - (defaults.length - 1 - index),
    };
  });
}
