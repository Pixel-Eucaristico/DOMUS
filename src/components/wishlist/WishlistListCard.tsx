import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { soundManager } from "@/src/services/SoundManager";
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
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.cardBackground }]}
      onPress={() => {
        soundManager.play("tap");
        onPress(list);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.name, { color: theme.textColor }]}>{list.name}</Text>
          <Text style={[styles.itemCount, { color: theme.secondaryText }]}>
            {items.length} {items.length === 1 ? "item" : "itens"}
          </Text>
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
            <Text style={[styles.statText, { color: theme.secondaryText }]}>
              R${" "}
              {totalPrice.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        )}
        {affordableCount > 0 && (
          <View style={styles.stat}>
            <Feather name="check-circle" size={12} color="#16A34A" />
            <Text style={[styles.statText, { color: "#16A34A" }]}>
              {affordableCount} possíveis
            </Text>
          </View>
        )}
        <Text style={[styles.date, { color: theme.secondaryText }]}>
          {new Date(list.createdAt).toLocaleDateString("pt-BR")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: { flex: 1, gap: 2 },
  name: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  itemCount: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
  },
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
  statText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  date: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    marginLeft: "auto",
  },
});
