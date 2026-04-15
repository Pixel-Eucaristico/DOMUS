import {
  WISHLIST_EVENTS,
  createInitialWishlistState,
} from "./types";
import type { WishlistEvent, WishlistState, WishlistItem } from "./types";

export function wishlistReducer(
  state: WishlistState,
  event: WishlistEvent,
): WishlistState {
  switch (event.type) {
    case WISHLIST_EVENTS.WISHLIST_LIST_CREATED: {
      const { id, name, createdAt } = event.payload;
      return {
        ...state,
        lists: {
          ...state.lists,
          [id]: { id, name, createdAt },
        },
      };
    }

    case WISHLIST_EVENTS.WISHLIST_ITEM_ADDED: {
      const { item } = event.payload;
      const sectionItems = getSectionItems(state, item.listId, item.urgencyLevel);
      const maxIndex = sectionItems.reduce(
        (max, i) => Math.max(max, i.orderIndex),
        -1,
      );
      const normalizedItem: WishlistItem = {
        ...item,
        orderIndex: item.orderIndex >= 0 ? item.orderIndex : maxIndex + 1,
      };
      return {
        ...state,
        items: { ...state.items, [item.id]: normalizedItem },
      };
    }

    case WISHLIST_EVENTS.WISHLIST_ITEM_UPDATED: {
      const { itemId, changes } = event.payload;
      const existing = state.items[itemId];
      if (!existing) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [itemId]: { ...existing, ...changes },
        },
      };
    }

    case WISHLIST_EVENTS.WISHLIST_ITEM_PRIORITY_CHANGED: {
      const { itemId, newUrgency, newOrderIndex } = event.payload;
      const existing = state.items[itemId];
      if (!existing) return state;

      const prevSectionItems = getSectionItems(state, existing.listId, existing.urgencyLevel)
        .filter((i) => i.id !== itemId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const reIndexedPrev = prevSectionItems.map((item, idx) => ({
        ...item,
        orderIndex: idx,
      }));

      const newSectionItems = getSectionItems(state, existing.listId, newUrgency)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const clampedIndex = Math.min(
        Math.max(0, newOrderIndex),
        newSectionItems.length,
      );

      const insertedItems = [
        ...newSectionItems.slice(0, clampedIndex),
        { ...existing, urgencyLevel: newUrgency, orderIndex: clampedIndex },
        ...newSectionItems.slice(clampedIndex),
      ].map((item, idx) => ({ ...item, orderIndex: idx }));

      const updatedItems = { ...state.items };
      reIndexedPrev.forEach((i) => { updatedItems[i.id] = i; });
      insertedItems.forEach((i) => { updatedItems[i.id] = i; });

      return { ...state, items: updatedItems };
    }

    case WISHLIST_EVENTS.WISHLIST_ITEM_REORDERED: {
      const { itemId, newOrderIndex, urgencyLevel } = event.payload;
      const existing = state.items[itemId];
      if (!existing) return state;

      const sectionItems = getSectionItems(state, existing.listId, urgencyLevel)
        .filter((i) => i.id !== itemId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const clampedIndex = Math.min(
        Math.max(0, newOrderIndex),
        sectionItems.length,
      );

      const reOrdered = [
        ...sectionItems.slice(0, clampedIndex),
        existing,
        ...sectionItems.slice(clampedIndex),
      ].map((item, idx) => ({ ...item, orderIndex: idx }));

      const updatedItems = { ...state.items };
      reOrdered.forEach((i) => { updatedItems[i.id] = i; });

      return { ...state, items: updatedItems };
    }

    case WISHLIST_EVENTS.WISHLIST_ITEM_REMOVED: {
      const { itemId } = event.payload;
      const existing = state.items[itemId];
      if (!existing) return state;

      const { [itemId]: _removed, ...remainingItems } = state.items;

      const sectionItems = Object.values(remainingItems)
        .filter(
          (i) =>
            i.listId === existing.listId &&
            i.urgencyLevel === existing.urgencyLevel,
        )
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item, idx) => ({ ...item, orderIndex: idx }));

      const reIndexed = { ...remainingItems };
      sectionItems.forEach((i) => { reIndexed[i.id] = i; });

      return { ...state, items: reIndexed };
    }

    case WISHLIST_EVENTS.WISHLIST_PRICE_UPDATED: {
      const { itemId, newPrice } = event.payload;
      const existing = state.items[itemId];
      if (!existing) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [itemId]: { ...existing, price: newPrice },
        },
      };
    }

    case WISHLIST_EVENTS.WISHLIST_ITEM_CONVERTED_TO_EXPENSE: {
      const { itemId } = event.payload;
      if (!state.items[itemId]) return state;
      const { [itemId]: _removed, ...remainingItems } = state.items;
      return { ...state, items: remainingItems };
    }

    case WISHLIST_EVENTS.WISHLIST_SAVINGS_GOAL_SET: {
      const { itemId, savingsGoal } = event.payload;
      const existing = state.items[itemId];
      if (!existing) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [itemId]: { ...existing, savingsGoal },
        },
      };
    }

    case WISHLIST_EVENTS.WISHLIST_LIST_DELETED: {
      const { listId } = event.payload;
      if (!state.lists[listId]) return state;
      const { [listId]: _removedList, ...remainingLists } = state.lists;
      // Remove all items belonging to this list
      const remainingItems: typeof state.items = {};
      for (const [id, item] of Object.entries(state.items)) {
        if (item.listId !== listId) remainingItems[id] = item;
      }
      return { lists: remainingLists, items: remainingItems };
    }

    default:
      return state;
  }
}

function getSectionItems(
  state: WishlistState,
  listId: string,
  urgencyLevel: string,
): WishlistItem[] {
  return Object.values(state.items).filter(
    (i) => i.listId === listId && i.urgencyLevel === urgencyLevel,
  );
}

export { createInitialWishlistState };
