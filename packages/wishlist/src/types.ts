export const WISHLIST_EVENTS = {
  WISHLIST_LIST_CREATED: "WISHLIST_LIST_CREATED",
  WISHLIST_ITEM_ADDED: "WISHLIST_ITEM_ADDED",
  WISHLIST_ITEM_UPDATED: "WISHLIST_ITEM_UPDATED",
  WISHLIST_ITEM_PRIORITY_CHANGED: "WISHLIST_ITEM_PRIORITY_CHANGED",
  WISHLIST_ITEM_REORDERED: "WISHLIST_ITEM_REORDERED",
  WISHLIST_ITEM_REMOVED: "WISHLIST_ITEM_REMOVED",
  WISHLIST_PRICE_UPDATED: "WISHLIST_PRICE_UPDATED",
  WISHLIST_ITEM_CONVERTED_TO_EXPENSE: "WISHLIST_ITEM_CONVERTED_TO_EXPENSE",
  WISHLIST_SAVINGS_GOAL_SET: "WISHLIST_SAVINGS_GOAL_SET",
} as const;

export type WishlistEventType =
  (typeof WISHLIST_EVENTS)[keyof typeof WISHLIST_EVENTS];

export const URGENCY_LEVELS = {
  PRIORITY: "PRIORITY",
  ESSENTIAL: "ESSENTIAL",
  PLANNED: "PLANNED",
  FUTURE: "FUTURE",
} as const;

export type UrgencyLevel = (typeof URGENCY_LEVELS)[keyof typeof URGENCY_LEVELS];

export const URGENCY_ORDER: UrgencyLevel[] = [
  "PRIORITY",
  "ESSENTIAL",
  "PLANNED",
  "FUTURE",
];

// ─── Savings Goal ──────────────────────────────────────────────────────────────

export interface SavingsGoalConfig {
  enabled: boolean;
  /** ID da conta poupança vinculada */
  linkedAccountId?: string;
}

// ─── Bundle / Kit ─────────────────────────────────────────────────────────────

/** Componente individual de um kit (ex: peça de PC) */
export interface BundleItem {
  id: string;
  name: string;
  price?: number;
  /** Quantidade desta peça no kit (padrão 1) */
  quantity?: number;
  originalUrl?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  storeId?: string;
  /** true = esta peça já foi comprada */
  purchased?: boolean;
}

// ─── Domain types ──────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  listId: string;
  name: string;
  urgencyLevel: UrgencyLevel;
  orderIndex: number;
  category?: string;
  ean?: string;
  ncm?: string;
  originalUrl?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  price?: number;
  /** Quantidade do item (padrão 1) — o preço exibido é price × quantity */
  quantity?: number;
  canBuyThisMonth?: boolean;
  savingsGoal?: SavingsGoalConfig;
  /** Peças/componentes do kit — quando presente, o item é tratado como bundle */
  bundleItems?: BundleItem[];
}

export interface WishlistList {
  id: string;
  name: string;
  createdAt: string;
}

export interface WishlistState {
  lists: Record<string, WishlistList>;
  items: Record<string, WishlistItem>;
}

export function createInitialWishlistState(): WishlistState {
  return { lists: {}, items: {} };
}

export interface WishlistEventMetadata {
  createdAt: string;
  deviceId: string;
  version: number;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface WishlistListCreatedPayload {
  id: string;
  name: string;
  createdAt: string;
  metadata: WishlistEventMetadata;
}

export interface WishlistItemAddedPayload {
  item: WishlistItem;
  metadata: WishlistEventMetadata;
}

export interface WishlistItemUpdatedPayload {
  itemId: string;
  listId: string;
  changes: Partial<Omit<WishlistItem, "id" | "listId">>;
  metadata: WishlistEventMetadata;
}

export interface WishlistItemPriorityChangedPayload {
  itemId: string;
  listId: string;
  previousUrgency: UrgencyLevel;
  newUrgency: UrgencyLevel;
  newOrderIndex: number;
  metadata: WishlistEventMetadata;
}

export interface WishlistItemReorderedPayload {
  itemId: string;
  listId: string;
  previousOrderIndex: number;
  newOrderIndex: number;
  urgencyLevel: UrgencyLevel;
  metadata: WishlistEventMetadata;
}

export interface WishlistItemRemovedPayload {
  itemId: string;
  listId: string;
  metadata: WishlistEventMetadata;
}

export interface WishlistPriceUpdatedPayload {
  itemId: string;
  listId: string;
  previousPrice?: number;
  newPrice: number;
  metadata: WishlistEventMetadata;
}

export interface WishlistItemConvertedToExpensePayload {
  itemId: string;
  listId: string;
  itemName: string;
  price?: number;
  category?: string;
  metadata: WishlistEventMetadata;
}

export interface WishlistSavingsGoalSetPayload {
  itemId: string;
  listId: string;
  savingsGoal: SavingsGoalConfig;
  metadata: WishlistEventMetadata;
}

// ─── Events ───────────────────────────────────────────────────────────────────

interface WishlistBaseEvent {
  id: string;
  type: WishlistEventType;
  timestamp: number;
  deviceId: string;
  signature: string;
}

export interface WishlistListCreatedEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_LIST_CREATED;
  payload: WishlistListCreatedPayload;
}

export interface WishlistItemAddedEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_ITEM_ADDED;
  payload: WishlistItemAddedPayload;
}

export interface WishlistItemUpdatedEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_ITEM_UPDATED;
  payload: WishlistItemUpdatedPayload;
}

export interface WishlistItemPriorityChangedEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_ITEM_PRIORITY_CHANGED;
  payload: WishlistItemPriorityChangedPayload;
}

export interface WishlistItemReorderedEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_ITEM_REORDERED;
  payload: WishlistItemReorderedPayload;
}

export interface WishlistItemRemovedEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_ITEM_REMOVED;
  payload: WishlistItemRemovedPayload;
}

export interface WishlistPriceUpdatedEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_PRICE_UPDATED;
  payload: WishlistPriceUpdatedPayload;
}

export interface WishlistItemConvertedToExpenseEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_ITEM_CONVERTED_TO_EXPENSE;
  payload: WishlistItemConvertedToExpensePayload;
}

export interface WishlistSavingsGoalSetEvent extends WishlistBaseEvent {
  type: typeof WISHLIST_EVENTS.WISHLIST_SAVINGS_GOAL_SET;
  payload: WishlistSavingsGoalSetPayload;
}

export type WishlistEvent =
  | WishlistListCreatedEvent
  | WishlistItemAddedEvent
  | WishlistItemUpdatedEvent
  | WishlistItemPriorityChangedEvent
  | WishlistItemReorderedEvent
  | WishlistItemRemovedEvent
  | WishlistPriceUpdatedEvent
  | WishlistItemConvertedToExpenseEvent
  | WishlistSavingsGoalSetEvent;

// ─── Affordability ────────────────────────────────────────────────────────────

export interface AffordabilityInput {
  monthlyIncome: number;
  totalExpenses: number;
  investmentAmount: number;
}

export interface AffordabilityResult {
  availableAmount: number;
  itemsAffordable: string[];
}

// ─── Scraping ─────────────────────────────────────────────────────────────────

export interface ScrapedProductData {
  price?: number;
  ean?: string;
  ncm?: string;
  category?: string;
  name?: string;
  affiliateUrl?: string;
  imageUrl?: string;
}
