import { WISHLIST_EVENTS } from "./types";
import type {
  WishlistEvent,
  WishlistListCreatedEvent,
  WishlistItemAddedEvent,
  WishlistItemUpdatedEvent,
  WishlistItemPriorityChangedEvent,
  WishlistItemReorderedEvent,
  WishlistItemRemovedEvent,
  WishlistPriceUpdatedEvent,
  WishlistItemConvertedToExpenseEvent,
  WishlistSavingsGoalSetEvent,
  WishlistItem,
  UrgencyLevel,
  WishlistEventMetadata,
  SavingsGoalConfig,
} from "./types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function makeMetadata(deviceId: string): WishlistEventMetadata {
  return {
    createdAt: new Date().toISOString(),
    deviceId,
    version: 1,
  };
}

function baseEvent(deviceId: string): {
  id: string;
  timestamp: number;
  deviceId: string;
  signature: string;
} {
  return {
    id: generateId(),
    timestamp: Date.now(),
    deviceId,
    signature: "",
  };
}

export function createWishlistListEvent(
  name: string,
  deviceId: string,
): WishlistListCreatedEvent {
  const id = generateId();
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_LIST_CREATED,
    payload: {
      id,
      name,
      createdAt: new Date().toISOString(),
      metadata: makeMetadata(deviceId),
    },
  };
}

export function addWishlistItemEvent(
  item: Omit<WishlistItem, "id"> & { id?: string },
  deviceId: string,
): WishlistItemAddedEvent {
  const fullItem: WishlistItem = {
    id: item.id ?? generateId(),
    listId: item.listId,
    name: item.name,
    urgencyLevel: item.urgencyLevel,
    orderIndex: item.orderIndex ?? -1,
    category: item.category,
    ean: item.ean,
    ncm: item.ncm,
    originalUrl: item.originalUrl,
    affiliateUrl: item.affiliateUrl,
    price: item.price,
    canBuyThisMonth: item.canBuyThisMonth ?? false,
  };
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_ITEM_ADDED,
    payload: {
      item: fullItem,
      metadata: makeMetadata(deviceId),
    },
  };
}

export function updateWishlistItemEvent(
  itemId: string,
  listId: string,
  changes: Partial<Omit<WishlistItem, "id" | "listId">>,
  deviceId: string,
): WishlistItemUpdatedEvent {
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_ITEM_UPDATED,
    payload: {
      itemId,
      listId,
      changes,
      metadata: makeMetadata(deviceId),
    },
  };
}

export function changeWishlistItemPriorityEvent(
  itemId: string,
  listId: string,
  previousUrgency: UrgencyLevel,
  newUrgency: UrgencyLevel,
  newOrderIndex: number,
  deviceId: string,
): WishlistItemPriorityChangedEvent {
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_ITEM_PRIORITY_CHANGED,
    payload: {
      itemId,
      listId,
      previousUrgency,
      newUrgency,
      newOrderIndex,
      metadata: makeMetadata(deviceId),
    },
  };
}

export function reorderWishlistItemEvent(
  itemId: string,
  listId: string,
  previousOrderIndex: number,
  newOrderIndex: number,
  urgencyLevel: UrgencyLevel,
  deviceId: string,
): WishlistItemReorderedEvent {
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_ITEM_REORDERED,
    payload: {
      itemId,
      listId,
      previousOrderIndex,
      newOrderIndex,
      urgencyLevel,
      metadata: makeMetadata(deviceId),
    },
  };
}

export function removeWishlistItemEvent(
  itemId: string,
  listId: string,
  deviceId: string,
): WishlistItemRemovedEvent {
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_ITEM_REMOVED,
    payload: {
      itemId,
      listId,
      metadata: makeMetadata(deviceId),
    },
  };
}

export function updateWishlistPriceEvent(
  itemId: string,
  listId: string,
  newPrice: number,
  previousPrice: number | undefined,
  deviceId: string,
): WishlistPriceUpdatedEvent {
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_PRICE_UPDATED,
    payload: {
      itemId,
      listId,
      previousPrice,
      newPrice,
      metadata: makeMetadata(deviceId),
    },
  };
}

export function convertWishlistItemToExpenseEvent(
  itemId: string,
  listId: string,
  itemName: string,
  price: number | undefined,
  category: string | undefined,
  deviceId: string,
): WishlistItemConvertedToExpenseEvent {
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_ITEM_CONVERTED_TO_EXPENSE,
    payload: {
      itemId,
      listId,
      itemName,
      price,
      category,
      metadata: makeMetadata(deviceId),
    },
  };
}

export function setSavingsGoalEvent(
  itemId: string,
  listId: string,
  savingsGoal: SavingsGoalConfig,
  deviceId: string,
): WishlistSavingsGoalSetEvent {
  return {
    ...baseEvent(deviceId),
    type: WISHLIST_EVENTS.WISHLIST_SAVINGS_GOAL_SET,
    payload: {
      itemId,
      listId,
      savingsGoal,
      metadata: makeMetadata(deviceId),
    },
  };
}

export type { WishlistEvent };
