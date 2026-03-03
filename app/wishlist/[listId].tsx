import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { useWishlist } from "@/src/hooks/useWishlist";
import { usePriceRefresh } from "@/src/hooks/usePriceRefresh";
import { createEvent, generateId } from "@packages/events/src/factory";
import { EVENT_TYPES } from "@packages/events/src/types";
import type { TransactionCreatedEvent } from "@packages/events/src/types";
import { DraggableWishlistList } from "@/src/components/wishlist/DraggableWishlistList";
import { AffordabilityBanner } from "@/src/components/wishlist/AffordabilityBanner";
import { AffiliateInfoBanner } from "@/src/components/wishlist/AffiliateInfoBanner";
import { AddItemModal } from "@/src/components/wishlist/AddItemModal";
import { ConvertToExpenseModal } from "@/src/components/wishlist/ConvertToExpenseModal";
import type { WishlistItem, UrgencyLevel } from "@packages/wishlist";

export default function WishlistDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const { theme, domain, budget, dispatchDomainEvent, deviceId } = useAppState();
  const did = deviceId ?? "local";
  const {
    lists,
    getItemsByList,
    addItem,
    updateItem,
    removeItem,
    reorderItem,
    changePriority,
    convertToExpense,
    computeAffordability,
  } = useWishlist();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [convertItem, setConvertItem] = useState<WishlistItem | null>(null);

  const list = lists.find((l) => l.id === listId);
  const rawItems = getItemsByList(listId ?? "");
  const accounts = Object.values(domain.accounts ?? {});

  // Affordability computation from domain budget
  const monthlyIncome = budget.totalIncome ?? 0;
  const totalExpenses = Object.values(domain.transactions)
    .filter((t) => {
      const now = new Date();
      const d = new Date(t.date);
      return (
        t.type === "expense" &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        (!t.status || t.status === "confirmed")
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const affordabilityInput = useMemo(
    () => ({
      monthlyIncome,
      totalExpenses,
      investmentAmount: 0,
    }),
    [monthlyIncome, totalExpenses],
  );

  const affordableItems = useMemo(
    () => computeAffordability(listId ?? "", affordabilityInput),
    [computeAffordability, listId, affordabilityInput],
  );

  const availableAmount =
    affordabilityInput.monthlyIncome -
    affordabilityInput.totalExpenses -
    affordabilityInput.investmentAmount;

  const affordableCount = affordableItems.filter(
    (i) => i.canBuyThisMonth,
  ).length;

  // Merge canBuyThisMonth into rawItems for display
  const itemsWithAffordability = useMemo(() => {
    const affordableMap = new Map(affordableItems.map((i) => [i.id, i]));
    return rawItems.map((item) => affordableMap.get(item.id) ?? item);
  }, [rawItems, affordableItems]);

  // Atualização automática de preços dos itens visíveis
  const { refreshingId, enqueueVisible } = usePriceRefresh({
    items: itemsWithAffordability,
    updateItem,
  });

  const handleAddItem = useCallback(
    (item: Omit<WishlistItem, "id">) => {
      addItem(item);
      setShowAddModal(false);
    },
    [addItem],
  );

  const handleEditSave = useCallback(
    (changes: Omit<WishlistItem, "id">) => {
      if (!editItem) return;
      updateItem(editItem.id, editItem.listId, {
        name: changes.name,
        urgencyLevel: changes.urgencyLevel,
        price: changes.price,
        originalUrl: changes.originalUrl,
        affiliateUrl: changes.affiliateUrl,
        category: changes.category,
        ean: changes.ean,
        ncm: changes.ncm,
        imageUrl: changes.imageUrl,
        savingsGoal: changes.savingsGoal,
      });
      setEditItem(null);
    },
    [editItem, updateItem],
  );

  const handleRemove = useCallback(
    (item: WishlistItem) => {
      Alert.alert(
        "Remover item",
        `Remover "${item.name}" da lista?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: () => removeItem(item.id, item.listId),
          },
        ],
      );
    },
    [removeItem],
  );

  const handleConvertConfirm = useCallback(
    (item: WishlistItem, accountId: string) => {
      // Remove item from wishlist
      convertToExpense(item);

      // Create expense transaction if we have a price and account
      if (item.price !== undefined && accountId) {
        // Map urgency to category: PRIORITY/ESSENTIAL → needs, PLANNED/FUTURE → wants
        const isNeeds = item.urgencyLevel === "PRIORITY" || item.urgencyLevel === "ESSENTIAL";
        const categoryId = item.category || (isNeeds ? "moradia" : "compras_diversas");
        const txEvent = createEvent<TransactionCreatedEvent>(
          EVENT_TYPES.TRANSACTION_CREATED,
          {
            id: generateId(),
            accountId,
            type: "expense",
            amount: item.price,
            categoryId,
            date: new Date().toISOString().split("T")[0],
            description: item.name,
            status: "confirmed",
          },
          did,
        );
        dispatchDomainEvent(txEvent);
      }

      setConvertItem(null);
    },
    [convertToExpense, dispatchDomainEvent, did],
  );

  const handleReorder = useCallback(
    (
      itemId: string,
      listIdParam: string,
      prevIndex: number,
      newIndex: number,
      urgency: UrgencyLevel,
    ) => {
      reorderItem(itemId, listIdParam, prevIndex, newIndex, urgency);
    },
    [reorderItem],
  );

  const handlePriorityChange = useCallback(
    (
      itemId: string,
      listIdParam: string,
      prevUrgency: UrgencyLevel,
      newUrgency: UrgencyLevel,
      newIndex: number,
    ) => {
      changePriority(itemId, listIdParam, prevUrgency, newUrgency, newIndex);
    },
    [changePriority],
  );

  if (!list) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={theme.textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textColor }]}>
            Lista não encontrada
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: theme.textColor }]}
          numberOfLines={1}
        >
          {list.name}
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primaryColor }]}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Affordability Banner */}
      <AffordabilityBanner
        availableAmount={availableAmount}
        affordableCount={affordableCount}
        theme={theme}
      />

      {/* Affiliate Info Banner */}
      <AffiliateInfoBanner theme={theme} />

      {/* Drag & Drop list */}
      <DraggableWishlistList
        items={itemsWithAffordability}
        theme={theme}
        accounts={domain.accounts}
        refreshingItemId={refreshingId}
        onVisibleItemIds={enqueueVisible}
        onReorder={handleReorder}
        onPriorityChange={handlePriorityChange}
        onItemPress={() => {}}
        onItemEdit={(item) => setEditItem(item)}
        onItemRemove={handleRemove}
        onItemConvert={(item) => setConvertItem(item)}
      />

      {/* Add / Edit Item Modal */}
      <AddItemModal
        visible={showAddModal || editItem !== null}
        listId={editItem?.listId ?? listId ?? ""}
        theme={theme}
        accounts={accounts}
        editItem={editItem ?? undefined}
        onConfirm={editItem !== null ? handleEditSave : handleAddItem}
        onCancel={() => { setShowAddModal(false); setEditItem(null); }}
      />

      {/* Convert to Expense Modal */}
      <ConvertToExpenseModal
        visible={convertItem !== null}
        item={convertItem}
        accounts={accounts}
        theme={theme}
        onConfirm={handleConvertConfirm}
        onCancel={() => setConvertItem(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
});
