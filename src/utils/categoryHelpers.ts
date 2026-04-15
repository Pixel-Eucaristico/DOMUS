import type { CategoryGroup } from "@packages/events/src/types";
import { NCM_SUBCATEGORIES } from "@packages/parsers/src/classifier/ncmCategories";
import { CATEGORY_OPTIONS, GROUP_COLORS } from "@/src/constants/invoiceCategories";

// ─── Group Labels & Colors ───────────────────────────────────────────────────

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  needs: "Necessidade",
  wants: "Desejo",
  savings: "Poupanca",
};

export const GROUP_COLOR_MAP: Record<CategoryGroup, string> = {
  needs: "#4CAF50",
  wants: "#FF9800",
  savings: "#2196F3",
};

// ─── Category Display ────────────────────────────────────────────────────────

export function getCategoryDisplayName(categoryId: string, subcategoryId?: string): string {
  if (subcategoryId) {
    const sub = NCM_SUBCATEGORIES.find((s) => s.id === subcategoryId);
    if (sub) return sub.name;
  }
  const cat = CATEGORY_OPTIONS.find((c) => c.id === categoryId);
  return cat?.name ?? "Outros";
}

export function getCategoryColor(categoryId: string): string {
  const cat = CATEGORY_OPTIONS.find((c) => c.id === categoryId);
  return cat ? GROUP_COLORS[cat.group] : GROUP_COLORS.wants;
}

export function getCategoryGroup(categoryId: string, subcategoryId?: string): CategoryGroup {
  if (subcategoryId) {
    const sub = NCM_SUBCATEGORIES.find((s) => s.id === subcategoryId);
    if (sub) return sub.group;
  }
  const cat = CATEGORY_OPTIONS.find((c) => c.id === categoryId);
  return cat?.group ?? "wants";
}

export function getGroupColor(group: CategoryGroup): string {
  return GROUP_COLOR_MAP[group] ?? GROUP_COLOR_MAP.wants;
}

export function getGroupLabel(group: CategoryGroup): string {
  return GROUP_LABELS[group] ?? GROUP_LABELS.wants;
}

// ─── Color Alpha Utility ─────────────────────────────────────────────────────

export function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}
