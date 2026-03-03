import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  PanResponder,
  Animated,
  LayoutRectangle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { URGENCY_ORDER } from "@packages/wishlist";
import type { WishlistItem, UrgencyLevel } from "@packages/wishlist";
import type { AccountPayload } from "@packages/events";
import { WishlistItemRow } from "./WishlistItemRow";

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
  const containerYRef = useRef(0);
  const containerHeightRef = useRef(0);
  // Ref estável para o callback (evita recrear computeVisibleIds a cada render)
  const onVisibleItemIdsRef = useRef(onVisibleItemIds);
  useEffect(() => { onVisibleItemIdsRef.current = onVisibleItemIds; });

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
      items
        .filter((i) => i.urgencyLevel === urgency)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [items],
  );

  /** Calcula os IDs visíveis com base no scroll e nos layouts dos itens */
  const computeVisibleIds = useCallback(() => {
    const cb = onVisibleItemIdsRef.current;
    if (!cb) return;
    const scrollY = scrollYRef.current;
    const height = containerHeightRef.current;
    const visible: string[] = [];
    itemLayouts.current.forEach((layout, id) => {
      const top = layout.y - scrollY;
      const bottom = top + layout.height;
      // Tolera 80px fora da área visível (itens quase na tela)
      if (bottom > -80 && top < height + 80) {
        visible.push(id);
      }
    });
    if (visible.length > 0) cb(visible);
  }, []);

  // Dispara a detecção inicial após os items serem medidos (~400ms)
  useEffect(() => {
    const timer = setTimeout(computeVisibleIds, 400);
    return () => clearTimeout(timer);
  }, [items, computeVisibleIds]);

  const findDropTarget = useCallback(
    (absY: number): { urgency: UrgencyLevel; index: number } | null => {
      const adjustedY = absY + scrollYRef.current - containerYRef.current;

      let targetUrgency: UrgencyLevel | null = null;
      let closestDist = Infinity;

      for (const urgency of URGENCY_ORDER) {
        const section = sectionLayouts.current.get(urgency);
        if (!section) continue;
        const sectionCenter = section.y + section.height / 2;
        const dist = Math.abs(adjustedY - sectionCenter);
        if (dist < closestDist) {
          closestDist = dist;
          targetUrgency = urgency;
        }
      }

      if (!targetUrgency) return null;

      const sectionItems = getItemsByUrgency(targetUrgency);
      let targetIndex = sectionItems.length;

      for (let i = 0; i < sectionItems.length; i++) {
        const layout = itemLayouts.current.get(sectionItems[i].id);
        if (!layout) continue;
        const itemMid = layout.y + layout.height / 2;
        if (adjustedY < itemMid) {
          targetIndex = i;
          break;
        }
      }

      return { urgency: targetUrgency, index: targetIndex };
    },
    [getItemsByUrgency],
  );

  const createPanResponder = useCallback(
    (item: WishlistItem) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dy) > 5,
        onPanResponderGrant: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const floatY = new Animated.Value(0);
          const state: DragState = {
            itemId: item.id,
            urgency: item.urgencyLevel,
            orderIndex: item.orderIndex,
            startY: 0,
            floatY,
            scrollY: scrollYRef.current,
          };
          dragStateRef.current = state;
          setDragState(state);
        },
        onPanResponderMove: (_, gs) => {
          const current = dragStateRef.current;
          if (!current) return;
          current.floatY.setValue(gs.dy);
          const absY = gs.moveY;
          const target = findDropTarget(absY);
          setDropTarget(target);
        },
        onPanResponderRelease: (_, gs) => {
          const current = dragStateRef.current;
          if (!current) return;

          const absY = gs.moveY;
          const target = findDropTarget(absY);

          if (target) {
            if (target.urgency !== current.urgency) {
              onPriorityChange(
                current.itemId,
                item.listId,
                current.urgency,
                target.urgency,
                target.index,
              );
            } else if (target.index !== current.orderIndex) {
              onReorder(
                current.itemId,
                item.listId,
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
    [findDropTarget, onReorder, onPriorityChange],
  );

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
        containerYRef.current = e.nativeEvent.layout.y;
        containerHeightRef.current = e.nativeEvent.layout.height;
      }}
      scrollEnabled={dragState === null}
    >
      {URGENCY_ORDER.map((urgency) => {
        const sectionItems = getItemsByUrgency(urgency);
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
              <Text style={[styles.sectionTitle, { color: urgencyColor }]}>
                {URGENCY_LABELS[urgency]}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: urgencyColor + "20" },
                ]}
              >
                <Text style={[styles.countText, { color: urgencyColor }]}>
                  {sectionItems.length}
                </Text>
              </View>
            </View>

            {/* Items */}
            {sectionItems.length === 0 ? (
              <View style={styles.emptySection}>
                <Text
                  style={[
                    styles.emptySectionText,
                    { color: theme.secondaryText },
                  ]}
                >
                  Nenhum item. Arraste aqui ou adicione.
                </Text>
              </View>
            ) : (
              sectionItems.map((item, idx) => {
                const isDragging = dragState?.itemId === item.id;
                const showDropIndicator =
                  dropTarget?.urgency === urgency &&
                  dropTarget?.index === idx &&
                  dragState !== null &&
                  dragState.itemId !== item.id;

                const panResponder = createPanResponder(item);

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
  sectionTitle: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
  },
  countBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
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
  emptySectionText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
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
