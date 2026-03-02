import { useCallback, useMemo } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  URGENCY_ORDER,
  wishlistAffordabilityService,
  createWishlistListEvent,
  addWishlistItemEvent,
  updateWishlistItemEvent,
  changeWishlistItemPriorityEvent,
  reorderWishlistItemEvent,
  removeWishlistItemEvent,
  updateWishlistPriceEvent,
  convertWishlistItemToExpenseEvent,
} from "@packages/wishlist";
import type {
  WishlistItem,
  WishlistList,
  UrgencyLevel,
  AffordabilityInput,
} from "@packages/wishlist";

export interface UseWishlistResult {
  lists: WishlistList[];
  getItemsByList: (listId: string) => WishlistItem[];
  getItemsByUrgency: (listId: string, urgency: UrgencyLevel) => WishlistItem[];
  createList: (name: string) => void;
  addItem: (item: Omit<WishlistItem, "id"> & { id?: string }) => void;
  updateItem: (
    itemId: string,
    listId: string,
    changes: Partial<Omit<WishlistItem, "id" | "listId">>,
  ) => void;
  changePriority: (
    itemId: string,
    listId: string,
    prevUrgency: UrgencyLevel,
    newUrgency: UrgencyLevel,
    newOrderIndex: number,
  ) => void;
  reorderItem: (
    itemId: string,
    listId: string,
    prevIndex: number,
    newIndex: number,
    urgency: UrgencyLevel,
  ) => void;
  removeItem: (itemId: string, listId: string) => void;
  updatePrice: (
    itemId: string,
    listId: string,
    newPrice: number,
    prevPrice?: number,
  ) => void;
  convertToExpense: (item: WishlistItem) => void;
  computeAffordability: (
    listId: string,
    input: AffordabilityInput,
  ) => WishlistItem[];
}

export function useWishlist(): UseWishlistResult {
  const { wishlist, dispatch, deviceId } = useAppState();
  const did = deviceId ?? "local";

  const lists = useMemo<WishlistList[]>(
    () => Object.values(wishlist?.lists ?? {}),
    [wishlist],
  );

  const getItemsByList = useCallback(
    (listId: string): WishlistItem[] =>
      Object.values(wishlist?.items ?? {}).filter(
        (i: WishlistItem) => i.listId === listId,
      ),
    [wishlist],
  );

  const getItemsByUrgency = useCallback(
    (listId: string, urgency: UrgencyLevel): WishlistItem[] =>
      getItemsByList(listId)
        .filter((i) => i.urgencyLevel === urgency)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [getItemsByList],
  );

  const createList = useCallback(
    (name: string) => {
      dispatch(createWishlistListEvent(name, did));
    },
    [dispatch, did],
  );

  const addItem = useCallback(
    (item: Omit<WishlistItem, "id"> & { id?: string }) => {
      dispatch(addWishlistItemEvent(item, did));
    },
    [dispatch, did],
  );

  const updateItem = useCallback(
    (
      itemId: string,
      listId: string,
      changes: Partial<Omit<WishlistItem, "id" | "listId">>,
    ) => {
      dispatch(updateWishlistItemEvent(itemId, listId, changes, did));
    },
    [dispatch, did],
  );

  const changePriority = useCallback(
    (
      itemId: string,
      listId: string,
      prevUrgency: UrgencyLevel,
      newUrgency: UrgencyLevel,
      newOrderIndex: number,
    ) => {
      dispatch(
        changeWishlistItemPriorityEvent(
          itemId,
          listId,
          prevUrgency,
          newUrgency,
          newOrderIndex,
          did,
        ),
      );
    },
    [dispatch, did],
  );

  const reorderItem = useCallback(
    (
      itemId: string,
      listId: string,
      prevIndex: number,
      newIndex: number,
      urgency: UrgencyLevel,
    ) => {
      dispatch(
        reorderWishlistItemEvent(
          itemId,
          listId,
          prevIndex,
          newIndex,
          urgency,
          did,
        ),
      );
    },
    [dispatch, did],
  );

  const removeItem = useCallback(
    (itemId: string, listId: string) => {
      dispatch(removeWishlistItemEvent(itemId, listId, did));
    },
    [dispatch, did],
  );

  const updatePrice = useCallback(
    (
      itemId: string,
      listId: string,
      newPrice: number,
      prevPrice?: number,
    ) => {
      dispatch(updateWishlistPriceEvent(itemId, listId, newPrice, prevPrice, did));
    },
    [dispatch, did],
  );

  const convertToExpense = useCallback(
    (item: WishlistItem) => {
      dispatch(
        convertWishlistItemToExpenseEvent(
          item.id,
          item.listId,
          item.name,
          item.price,
          item.category,
          did,
        ),
      );
    },
    [dispatch, did],
  );

  const computeAffordability = useCallback(
    (listId: string, input: AffordabilityInput): WishlistItem[] => {
      const items = getItemsByList(listId);
      const { items: computed } = wishlistAffordabilityService.compute(
        items,
        input,
      );
      return computed;
    },
    [getItemsByList],
  );

  return {
    lists,
    getItemsByList,
    getItemsByUrgency,
    createList,
    addItem,
    updateItem,
    changePriority,
    reorderItem,
    removeItem,
    updatePrice,
    convertToExpense,
    computeAffordability,
  };
}
