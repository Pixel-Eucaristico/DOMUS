import React from "react";
import {
  View,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { soundManager } from "@/src/services/SoundManager";
import { TCard, TText } from "@/src/components/tamagui";
import type { ThemeColors } from "@packages/theme";
import type { WishlistList, WishlistItem, UrgencyLevel } from "@packages/wishlist";

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  PRIORITY: "#DC2626",
  ESSENTIAL: "#D97706",
  PLANNED: "#2563EB",
  FUTURE: "#6B7280",
};

interface Props {
  list: WishlistList;
  items: WishlistItem[];
  theme: ThemeColors;
  onPress: (list: WishlistList) => void;
}

export function WishlistListCard({ list, items, theme, onPress }: Props) {
  const affordableCount = items.filter((i) => i.canBuyThisMonth).length;
  const totalPrice = items.reduce((sum, i) => sum + (i.price ?? 0), 0);

  const urgencyCounts: Record<UrgencyLevel, number> = {
    PRIORITY: 0,
    ESSENTIAL: 0,
    PLANNED: 0,
    FUTURE: 0,
  };
  items.forEach((i) => { urgencyCounts[i.urgencyLevel]++; });

  return (
    <TCard
      elevated
      backgroundColor={theme.cardBackground}
      borderColor={theme.border}
      onPress={() => {
        soundManager.play("tap");
        onPress(list);
      }}
      pressStyle={{ opacity: 0.7 }}
      style={{ marginHorizontal: 16, marginVertical: 6, overflow: "hidden", padding: 0 }}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TText variant="subtitle" color={theme.textColor}>{list.name}</TText>
          <TText variant="caption" secondary>
            {items.length} {items.length === 1 ? "item" : "itens"}
          </TText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.secondaryText} />
      </View>

      {/* Urgency distribution */}
      <View style={styles.urgencyBar}>
        {(["PRIORITY", "ESSENTIAL", "PLANNED", "FUTURE"] as UrgencyLevel[]).map(
          (level) => {
            const count = urgencyCounts[level];
            if (count === 0) return null;
            const flex = count;
            return (
              <View
                key={level}
                style={[
                  styles.urgencySegment,
                  {
                    flex,
                    backgroundColor: URGENCY_COLORS[level],
                  },
                ]}
              />
            );
          },
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {totalPrice > 0 && (
          <View style={styles.stat}>
            <Feather name="tag" size={12} color={theme.secondaryText} />
            <TText variant="caption" secondary fontWeight="500">
              R${" "}
              {totalPrice.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </TText>
          </View>
        )}
        {affordableCount > 0 && (
          <View style={styles.stat}>
            <Feather name="check-circle" size={12} color="#16A34A" />
            <TText variant="caption" color="#16A34A" fontWeight="500">
              {affordableCount} possíveis
            </TText>
          </View>
        )}
        <TText variant="caption" secondary fontSize={11} marginLeft="auto">
          {new Date(list.createdAt).toLocaleDateString("pt-BR")}
        </TText>
      </View>
    </TCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: { flex: 1, gap: 2 },
  urgencyBar: {
    flexDirection: "row",
    height: 4,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: "hidden",
    gap: 2,
  },
  urgencySegment: {
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 10,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
