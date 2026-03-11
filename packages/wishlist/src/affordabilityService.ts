import { URGENCY_ORDER } from "./types";
import type { WishlistItem, UrgencyLevel, AffordabilityInput, AffordabilityResult } from "./types";

export class WishlistAffordabilityService {
  compute(
    items: WishlistItem[],
    input: AffordabilityInput,
  ): { items: WishlistItem[]; result: AffordabilityResult } {
    const { monthlyIncome, totalExpenses, investmentAmount } = input;
    const availableAmount = monthlyIncome - totalExpenses - investmentAmount;

    const sortedItems = this.sortByUrgency(items.filter((i) => i.price !== undefined));
    const affordableIds = new Set<string>();

    let remaining = availableAmount;
    for (const item of sortedItems) {
      const price = (item.price ?? 0) * (item.quantity ?? 1);
      if (remaining >= price) {
        affordableIds.add(item.id);
        remaining -= price;
      }
    }

    const updatedItems = items.map((item) => ({
      ...item,
      canBuyThisMonth: affordableIds.has(item.id),
    }));

    return {
      items: updatedItems,
      result: {
        availableAmount,
        itemsAffordable: Array.from(affordableIds),
      },
    };
  }

  private sortByUrgency(items: WishlistItem[]): WishlistItem[] {
    return [...items].sort((a, b) => {
      const urgencyDiff =
        URGENCY_ORDER.indexOf(a.urgencyLevel) -
        URGENCY_ORDER.indexOf(b.urgencyLevel);
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.orderIndex - b.orderIndex;
    });
  }
}

export const wishlistAffordabilityService = new WishlistAffordabilityService();
