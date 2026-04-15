import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  PanResponder,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { URGENCY_ORDER } from "@packages/wishlist";
import type { WishlistItem, UrgencyLevel } from "@packages/wishlist";
import type { AccountPayload } from "@packages/events";
import { WishlistItemRow } from "./WishlistItemRow";
import { TText } from "@/src/components/tamagui";

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  PRIORITY: "Prioridade",
  ESSENTIAL: "Essencial",
  PLANNED: "Planejado",
  FUTURE: "Futuro",
};

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  PRIORITY: "#DC2626",
  ESSENTIAL: "#D97706",
  PLANNED: "#2563EB",
  FUTURE: "#6B7280",
};

const URGENCY_ICONS: Record<UrgencyLevel, string> = {
  PRIORITY: "alert-circle",
  ESSENTIAL: "star",
  PLANNED: "calendar",
  FUTURE: "clock",
};

interface DragState {
  itemId: string;
  urgency: UrgencyLevel;
  orderIndex: number;
  startY: number;
  floatY: Animated.Value;
  scrollY: number;
}

interface LayoutEntry {
  y: number;
  height: number;
}

interface Props {
  items: WishlistItem[];
  theme: ThemeColors;
  accounts?: Record<string, AccountPayload>;
  refreshingItemId?: string | null;
  onVisibleItemIds?: (ids: string[]) => void;
  onReorder: (
    itemId: string,
    listId: string,
    prevIndex: number,
    newIndex: number,
    urgency: UrgencyLevel,
  ) => void;
  onPriorityChange: (
    itemId: string,
    listId: string,
    prevUrgency: UrgencyLevel,
    newUrgency: UrgencyLevel,
    newIndex: number,
  ) => void;
  onItemPress: (item: WishlistItem) => void;
  onItemEdit: (item: WishlistItem) => void;
  onItemRemove: (item: WishlistItem) => void;
  onItemConvert: (item: WishlistItem) => void;
}

export function DraggableWishlistList({
  items,
  theme,
  accounts,
  refreshingItemId,
  onVisibleItemIds,
  onReorder,
  onPriorityChange,
  onItemPress,
  onItemEdit,
  onItemRemove,
  onItemConvert,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const containerHeightRef = useRef(0);

  const onVisibleItemIdsRef = useRef(onVisibleItemIds);
  const onReorderRef = useRef(onReorder);
  const onPriorityChangeRef = useRef(onPriorityChange);
  const itemsRef = useRef(items);
  useEffect(() => { onVisibleItemIdsRef.current = onVisibleItemIds; });
  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);
  useEffect(() => { onPriorityChangeRef.current = onPriorityChange; }, [onPriorityChange]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const itemLayouts = useRef<Map<string, LayoutEntry>>(new Map());
  const sectionLayouts = useRef<Map<UrgencyLevel, LayoutEntry>>(new Map());

  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    urgency: UrgencyLevel;
    index: number;
  } | null>(null);

  const getItemsByUrgency = useCallback(
    (urgency: UrgencyLevel): WishlistItem[] =>
      itemsRef.current
        .filter((i) => i.urgencyLevel === urgency)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [],
  );

  const computeVisibleIds = useCallback(() => {
    const cb = onVisibleItemIdsRef.current;
    if (!cb) return;
    const scrollY = scrollYRef.current;
    const height = containerHeightRef.current;
    const visible: string[] = [];
    itemLayouts.current.forEach((layout, id) => {
      const item = itemsRef.current.find((i) => i.id === id);
      const sectionY = item
        ? (sectionLayouts.current.get(item.urgencyLevel)?.y ?? 0)
        : 0;
      const contentTop = sectionY + layout.y - scrollY;
      const contentBottom = contentTop + layout.height;
      if (contentBottom > -80 && contentTop < height + 80) {
        visible.push(id);
      }
    });
    if (visible.length > 0) cb(visible);
  }, []);

  useEffect(() => {
    const timer = setTimeout(computeVisibleIds, 400);
    return () => clearTimeout(timer);
  }, [items, computeVisibleIds]);

  const findDropTarget = useCallback(
    (contentY: number): { urgency: UrgencyLevel; index: number } | null => {
      let targetUrgency: UrgencyLevel | null = null;

      for (const urgency of URGENCY_ORDER) {
        const section = sectionLayouts.current.get(urgency);
        if (!section) continue;
        if (contentY >= section.y && contentY <= section.y + section.height) {
          targetUrgency = urgency;
          break;
        }
      }

      if (!targetUrgency) {
        let closestDist = Infinity;
        for (const urgency of URGENCY_ORDER) {
          const section = sectionLayouts.current.get(urgency);
          if (!section) continue;
          const sectionCenter = section.y + section.height / 2;
          const dist = Math.abs(contentY - sectionCenter);
          if (dist < closestDist) {
            closestDist = dist;
            targetUrgency = urgency;
          }
        }
      }

      if (!targetUrgency) return null;

      const sectionLayout = sectionLayouts.current.get(targetUrgency);
      const sectionOffsetY = sectionLayout?.y ?? 0;

      const sectionItems = getItemsByUrgency(targetUrgency);
      let targetIndex = sectionItems.length;

      for (let i = 0; i < sectionItems.length; i++) {
        const layout = itemLayouts.current.get(sectionItems[i].id);
        if (!layout) continue;
        const itemMid = sectionOffsetY + layout.y + layout.height / 2;
        if (contentY < itemMid) {
          targetIndex = i;
          break;
        }
      }

      return { urgency: targetUrgency, index: targetIndex };
    },
    [getItemsByUrgency],
  );

  const findDropTargetRef = useRef(findDropTarget);
  useEffect(() => { findDropTargetRef.current = findDropTarget; }, [findDropTarget]);

  const panResponderMap = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());

  useEffect(() => {
    const currentIds = new Set(items.map((i) => i.id));
    panResponderMap.current.forEach((_, id) => {
      if (!currentIds.has(id)) panResponderMap.current.delete(id);
    });
  }, [items]);

  const getOrCreatePanResponder = useCallback((item: WishlistItem) => {
    if (!panResponderMap.current.has(item.id)) {
      panResponderMap.current.set(
        item.id,
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
          onPanResponderGrant: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const floatY = new Animated.Value(0);
            const currentItem = itemsRef.current.find((i) => i.id === item.id) ?? item;
            const itemLayout = itemLayouts.current.get(item.id);
            const sectionLayout = sectionLayouts.current.get(currentItem.urgencyLevel);
            const itemCenterY =
              (sectionLayout?.y ?? 0) +
              (itemLayout?.y ?? 0) +
              (itemLayout?.height ?? 0) / 2;
            const state: DragState = {
              itemId: item.id,
              urgency: currentItem.urgencyLevel,
              orderIndex: currentItem.orderIndex,
              startY: itemCenterY,
              floatY,
              scrollY: scrollYRef.current,
            };
            dragStateRef.current = state;
            setDragState({ ...state });
          },
          onPanResponderMove: (_, gs) => {
            const current = dragStateRef.current;
            if (!current) return;
            current.floatY.setValue(gs.dy);
            const contentY = current.startY + gs.dy;
            const target = findDropTargetRef.current(contentY);
            setDropTarget(target);
          },
          onPanResponderRelease: (_, gs) => {
            const current = dragStateRef.current;
            if (!current) return;

            const contentY = current.startY + gs.dy;
            const target = findDropTargetRef.current(contentY);

            if (target) {
              const currentItem = itemsRef.current.find((i) => i.id === item.id);
              const listId = currentItem?.listId ?? item.listId;
              if (target.urgency !== current.urgency) {
                onPriorityChangeRef.current(
                  current.itemId,
                  listId,
                  current.urgency,
                  target.urgency,
                  target.index,
                );
              } else if (target.index !== current.orderIndex) {
                onReorderRef.current(
                  current.itemId,
                  listId,
                  current.orderIndex,
                  target.index,
                  current.urgency,
                );
              }
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dragStateRef.current = null;
            setDragState(null);
            setDropTarget(null);
          },
          onPanResponderTerminate: () => {
            dragStateRef.current = null;
            setDragState(null);
            setDropTarget(null);
          },
        }),
      );
    }
    return panResponderMap.current.get(item.id)!;
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(e) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
        computeVisibleIds();
      }}
      onLayout={(e) => {
        containerHeightRef.current = e.nativeEvent.layout.height;
      }}
      scrollEnabled={dragState === null}
    >
      {URGENCY_ORDER.map((urgency) => {
        const sectionItems = items
          .filter((i) => i.urgencyLevel === urgency)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        const urgencyColor = URGENCY_COLORS[urgency];

        return (
          <View
            key={urgency}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              sectionLayouts.current.set(urgency, { y, height });
            }}
          >
            {/* Section header */}
            <View
              style={[
                styles.sectionHeader,
                {
                  borderLeftColor: urgencyColor,
                  backgroundColor:
                    dropTarget?.urgency === urgency
                      ? urgencyColor + "15"
                      : "transparent",
                },
              ]}
            >
              <Feather
                name={URGENCY_ICONS[urgency] as any}
                size={15}
                color={urgencyColor}
              />
              <TText
                variant="label"
                bold
                color={urgencyColor}
                fontSize={13}
                textTransform="uppercase"
                letterSpacing={0.6}
                flex={1}
              >
                {URGENCY_LABELS[urgency]}
              </TText>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: urgencyColor + "20" },
                ]}
              >
                <TText variant="caption" bold color={urgencyColor} fontSize={11}>
                  {sectionItems.length}
                </TText>
              </View>
            </View>

            {/* Items */}
            {sectionItems.length === 0 ? (
              <View style={styles.emptySection}>
                <TText variant="caption" color={theme.secondaryText}>
                  Nenhum item. Arraste aqui ou adicione.
                </TText>
              </View>
            ) : (
              sectionItems.map((item, idx) => {
                const isDragging = dragState?.itemId === item.id;
                const showDropIndicator =
                  dropTarget?.urgency === urgency &&
                  dropTarget?.index === idx &&
                  dragState !== null &&
                  dragState.itemId !== item.id;

                const panResponder = getOrCreatePanResponder(item);

                return (
                  <React.Fragment key={item.id}>
                    {showDropIndicator && (
                      <View
                        style={[
                          styles.dropIndicator,
                          { backgroundColor: theme.primaryColor },
                        ]}
                      />
                    )}
                    <Animated.View
                      style={isDragging ? { opacity: 0.4 } : undefined}
                      onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        itemLayouts.current.set(item.id, { y, height });
                      }}
                    >
                      <WishlistItemRow
                        item={item}
                        theme={theme}
                        isDragging={isDragging}
                        isRefreshing={refreshingItemId === item.id}
                        linkedAccountBalance={
                          item.savingsGoal?.enabled && item.savingsGoal.linkedAccountId
                            ? accounts?.[item.savingsGoal.linkedAccountId]?.balance
                            : undefined
                        }
                        dragHandleProps={panResponder.panHandlers}
                        onPress={onItemPress}
                        onEdit={onItemEdit}
                        onRemove={onItemRemove}
                        onConvert={onItemConvert}
                      />
                    </Animated.View>
                  </React.Fragment>
                );
              })
            )}

            {/* Drop indicator at end of section */}
            {dropTarget?.urgency === urgency &&
              dropTarget?.index === sectionItems.length &&
              dragState !== null && (
                <View
                  style={[
                    styles.dropIndicator,
                    { backgroundColor: theme.primaryColor },
                  ]}
                />
              )}

            <View style={styles.sectionSpacer} />
          </View>
        );
      })}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  countBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  emptySection: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  dropIndicator: {
    height: 2,
    marginHorizontal: 20,
    borderRadius: 2,
    marginVertical: 2,
    opacity: 0.7,
  },
  sectionSpacer: { height: 4 },
  bottomSpacer: { height: 100 },
});
