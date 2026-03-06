import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { WishlistItem, UrgencyLevel } from "@packages/wishlist";
import { soundManager } from "@/src/services/SoundManager";

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  PRIORITY: "#DC2626",
  ESSENTIAL: "#D97706",
  PLANNED: "#2563EB",
  FUTURE: "#6B7280",
};

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  PRIORITY: "Prioridade",
  ESSENTIAL: "Essencial",
  PLANNED: "Planejado",
  FUTURE: "Futuro",
};

interface Props {
  item: WishlistItem;
  theme: ThemeColors;
  isDragging?: boolean;
  isRefreshing?: boolean;
  /** Saldo atual da conta vinculada ao objetivo de poupança */
  linkedAccountBalance?: number;
  dragHandleProps?: object;
  onPress?: (item: WishlistItem) => void;
  onEdit?: (item: WishlistItem) => void;
  onRemove?: (item: WishlistItem) => void;
  onConvert?: (item: WishlistItem) => void;
  onChangePriority?: (item: WishlistItem, newUrgency: UrgencyLevel) => void;
}

export function WishlistItemRow({
  item,
  theme,
  isDragging = false,
  isRefreshing = false,
  linkedAccountBalance,
  dragHandleProps,
  onPress,
  onEdit,
  onRemove,
  onConvert,
  onChangePriority,
}: Props) {
  const urgencyColor = URGENCY_COLORS[item.urgencyLevel];

  const openUrl = () => {
    const url = item.affiliateUrl ?? item.originalUrl;
    if (url) Linking.openURL(url);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDragging ? theme.primaryColor + "15" : theme.cardBackground,
          borderColor: isDragging ? theme.primaryColor : "transparent",
          shadowOpacity: isDragging ? 0.18 : 0.04,
        },
      ]}
    >
      {/* Drag handle */}
      <View style={styles.dragHandle} {...(dragHandleProps ?? {})}>
        <Feather name="menu" size={18} color={theme.secondaryText} />
      </View>

      {/* Product thumbnail or urgency icon */}
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.urgencyBar, { backgroundColor: urgencyColor }]} />
      )}

      {/* Content — toque abre o link afiliado (ou original) se existir */}
      <TouchableOpacity
        style={styles.content}
        onPress={() => {
          const url = item.affiliateUrl ?? item.originalUrl;
          if (url) Linking.openURL(url);
          else onPress?.(item);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.topRow}>
          <Text
            style={[styles.name, { color: theme.textColor }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {item.canBuyThisMonth && (
            <View
              style={[
                styles.affordableBadge,
                { backgroundColor: "#16A34A20" },
              ]}
            >
              <Feather name="check-circle" size={10} color="#16A34A" />
              <Text style={styles.affordableText}>Possível</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.urgencyChip,
              { backgroundColor: urgencyColor + "20" },
            ]}
          >
            <Text style={[styles.urgencyText, { color: urgencyColor }]}>
              {URGENCY_LABELS[item.urgencyLevel]}
            </Text>
          </View>

          {isRefreshing ? (
            <View style={styles.refreshingRow}>
              <ActivityIndicator size="small" color={theme.primaryColor} style={styles.refreshSpinner} />
              {item.price !== undefined && (
                <Text style={[styles.price, styles.priceRefreshing, { color: theme.primaryColor }]}>
                  R${" "}
                  {item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Text>
              )}
            </View>
          ) : item.price !== undefined ? (
            <Text style={[styles.price, { color: theme.primaryColor }]}>
              R${" "}
              {item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Text>
          ) : null}

          {item.category && (
            <Text style={[styles.category, { color: theme.secondaryText }]}>
              {item.category}
            </Text>
          )}

          {(item.affiliateUrl ?? item.originalUrl) && (
            <TouchableOpacity onPress={openUrl} activeOpacity={0.7}>
              <View style={styles.linkRow}>
                <Feather
                  name="external-link"
                  size={11}
                  color={item.affiliateUrl ? "#22C55E" : theme.secondaryText}
                />
                {item.affiliateUrl && (
                  <Text style={styles.affiliateLabel}>Patrocinado</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Savings goal progress bar */}
        {item.savingsGoal?.enabled && item.price !== undefined && linkedAccountBalance !== undefined && (
          (() => {
            const balance = linkedAccountBalance;
            const price = item.price;
            const progress = Math.min(balance / price, 1);
            const reached = balance >= price;
            const remaining = Math.max(price - balance, 0);
            return (
              <View style={styles.savingsContainer}>
                <View style={[styles.savingsTrack, { backgroundColor: theme.cardBackground }]}>
                  <View
                    style={[
                      styles.savingsFill,
                      { width: `${Math.round(progress * 100)}%` as any, backgroundColor: reached ? "#16A34A" : "#3B82F6" },
                    ]}
                  />
                </View>
                <Text style={[styles.savingsText, { color: reached ? "#16A34A" : theme.secondaryText }]}>
                  {reached
                    ? `Objetivo atingido! (${balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`
                    : `R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · Falta R$ ${remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                </Text>
              </View>
            );
          })()
        )}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { soundManager.play("tap"); onEdit(item); }}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={15} color={theme.secondaryText} />
          </TouchableOpacity>
        )}
        {onConvert && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { soundManager.play("tap"); onConvert(item); }}
            activeOpacity={0.7}
          >
            <Feather name="shopping-bag" size={15} color={theme.secondaryText} />
          </TouchableOpacity>
        )}
        {onRemove && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { soundManager.play("trash"); onRemove(item); }}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={15} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    marginVertical: 4,
    marginHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  dragHandle: {
    width: 36,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  urgencyBar: {
    width: 3,
    alignSelf: "stretch",
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 6,
    marginVertical: 8,
    marginLeft: 2,
    backgroundColor: "#F3F4F6",
  },
  content: {
    flex: 1,
    padding: 10,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    lineHeight: 19,
  },
  affordableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  affordableText: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: "#16A34A",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  urgencyChip: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgencyText: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
  },
  price: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
  },
  refreshingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  refreshSpinner: {
    transform: [{ scale: 0.7 }],
  },
  priceRefreshing: {
    opacity: 0.5,
  },
  category: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  affiliateLabel: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: "#22C55E",
  },
  savingsContainer: {
    marginTop: 6,
    gap: 3,
  },
  savingsTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  savingsFill: {
    height: "100%",
    borderRadius: 3,
  },
  savingsText: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
  },
  actions: {
    flexDirection: "column",
    paddingRight: 8,
    gap: 6,
  },
  actionBtn: {
    padding: 6,
  },
});
