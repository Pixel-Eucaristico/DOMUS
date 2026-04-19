import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { WishlistItem, UrgencyLevel, BundleItem } from "@packages/wishlist";
import { soundManager } from "@/src/services/SoundManager";
import { getCategoryDisplayName, getCategoryGroup, getGroupColor, getGroupLabel } from "@/src/utils/categoryHelpers";
import { TText } from "@/src/components/tamagui";

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
  linkedAccountBalance?: number;
  dragHandleProps?: object;
  onPress?: (item: WishlistItem) => void;
  onEdit?: (item: WishlistItem) => void;
  onRemove?: (item: WishlistItem) => void;
  onConvert?: (item: WishlistItem) => void;
  onChangePriority?: (item: WishlistItem, newUrgency: UrgencyLevel) => void;
  onBundleItemToggle?: (item: WishlistItem, bundleItemId: string, purchased: boolean) => void;
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
  onBundleItemToggle,
}: Props) {
  const urgencyColor = URGENCY_COLORS[item.urgencyLevel];
  const hasBundle = (item.bundleItems?.length ?? 0) > 0;
  const [bundleOpen, setBundleOpen] = useState(false);

  const openUrl = () => {
    const url = item.affiliateUrl ?? item.originalUrl;
    if (url) Linking.openURL(url);
  };

  return (
    <View style={s.wrapper}>
    <View
      style={[
        s.container,
        {
          backgroundColor: isDragging ? theme.primaryColor + "15" : theme.cardBackground,
          borderColor: isDragging ? theme.primaryColor : "transparent",
          shadowOpacity: isDragging ? 0.18 : 0.04,
        },
      ]}
    >
      {/* Drag handle */}
      <View style={s.dragHandle} {...(dragHandleProps ?? {})}>
        <Feather name="menu" size={18} color={theme.secondaryText} />
      </View>

      {/* Product thumbnail or urgency icon */}
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={s.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[s.urgencyBar, { backgroundColor: urgencyColor }]} />
      )}

      {/* Content */}
      <TouchableOpacity
        style={s.content}
        onPress={() => {
          const url = item.affiliateUrl ?? item.originalUrl;
          if (url) Linking.openURL(url);
          else onPress?.(item);
        }}
        activeOpacity={0.7}
      >
        <View style={s.topRow}>
          <TText
            variant="body"
            fontWeight="600"
            color={theme.textColor}
            flex={1}
            lineHeight={19}
            numberOfLines={2}
          >
            {item.name}
          </TText>
          {item.canBuyThisMonth && (
            <View
              style={[
                s.affordableBadge,
                { backgroundColor: "#16A34A20" },
              ]}
            >
              <Feather name="check-circle" size={10} color="#16A34A" />
              <TText variant="caption" fontWeight="600" color="#16A34A" fontSize={10}>
                Possivel
              </TText>
            </View>
          )}
        </View>

        <View style={s.metaRow}>
          <View
            style={[
              s.urgencyChip,
              { backgroundColor: urgencyColor + "20" },
            ]}
          >
            <TText variant="caption" fontWeight="600" color={urgencyColor} fontSize={10}>
              {URGENCY_LABELS[item.urgencyLevel]}
            </TText>
          </View>

          {isRefreshing ? (
            <View style={s.refreshingRow}>
              <ActivityIndicator size="small" color={theme.primaryColor} style={s.refreshSpinner} />
              {item.price !== undefined && (
                <TText variant="label" bold color={theme.primaryColor} opacity={0.5}>
                  R${" "}
                  {item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TText>
              )}
            </View>
          ) : item.price !== undefined ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {(item.quantity ?? 1) > 1 && (
                <TText variant="label" bold color={theme.secondaryText} fontSize={11}>
                  {`×${item.quantity}`}
                </TText>
              )}
              <TText variant="label" bold color={theme.primaryColor}>
                R${" "}
                {((item.price) * (item.quantity ?? 1)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </TText>
              {(item.quantity ?? 1) > 1 && (
                <TText variant="caption" bold color={theme.secondaryText} fontSize={10}>
                  {`(un. R$ ${item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`}
                </TText>
              )}
            </View>
          ) : null}

          {item.category && (() => {
            const catName = getCategoryDisplayName(item.category);
            const group = getCategoryGroup(item.category);
            const gc = getGroupColor(group);
            return (
              <View style={s.categoryRow}>
                <View style={[s.categoryChip, { backgroundColor: `${gc}18` }]}>
                  <View style={[s.categoryDot, { backgroundColor: gc }]} />
                  <TText variant="caption" fontWeight="600" color={gc} fontSize={10}>{catName}</TText>
                </View>
                <View style={[s.groupBadge, { backgroundColor: `${gc}18` }]}>
                  <TText variant="caption" bold color={gc} fontSize={9}>{getGroupLabel(group)}</TText>
                </View>
              </View>
            );
          })()}

          {(item.affiliateUrl ?? item.originalUrl) && (
            <TouchableOpacity onPress={openUrl} activeOpacity={0.7}>
              <View style={s.linkRow}>
                <Feather
                  name="external-link"
                  size={11}
                  color={item.affiliateUrl ? "#22C55E" : theme.secondaryText}
                />
                {item.affiliateUrl && (
                  <TText variant="caption" fontWeight="600" color="#22C55E" fontSize={10}>
                    Patrocinado
                  </TText>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Savings goal progress bar */}
        {item.savingsGoal?.enabled && item.price !== undefined && linkedAccountBalance !== undefined && (
          (() => {
            const balance = linkedAccountBalance;
            const price = item.price * (item.quantity ?? 1);
            const progress = Math.min(balance / price, 1);
            const reached = balance >= price;
            const remaining = Math.max(price - balance, 0);
            return (
              <View style={s.savingsContainer}>
                <View style={[s.savingsTrack, { backgroundColor: theme.cardBackground }]}>
                  <View
                    style={[
                      s.savingsFill,
                      { width: `${Math.round(progress * 100)}%`, backgroundColor: reached ? "#16A34A" : "#3B82F6" },
                    ]}
                  />
                </View>
                <TText variant="caption" color={reached ? "#16A34A" : theme.secondaryText} fontSize={10}>
                  {reached
                    ? `Objetivo atingido! (${balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`
                    : `R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · Falta R$ ${remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                </TText>
              </View>
            );
          })()
        )}
      </TouchableOpacity>

      {/* Badge + toggle de bundle */}
      {hasBundle && (
        <TouchableOpacity
          style={s.bundleToggleBtn}
          onPress={() => { soundManager.play("tap"); setBundleOpen((v) => !v); }}
          activeOpacity={0.7}
        >
          <Feather name="layers" size={13} color={theme.primaryColor} />
          <TText variant="caption" fontWeight="600" color={theme.primaryColor} fontSize={10}>
            {`Kit · ${item.bundleItems!.length} pecas`}
          </TText>
          <Feather name={bundleOpen ? "chevron-up" : "chevron-down"} size={13} color={theme.primaryColor} />
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={s.actions}>
        {onEdit && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => { soundManager.play("tap"); onEdit(item); }}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={15} color={theme.secondaryText} />
          </TouchableOpacity>
        )}
        {onConvert && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => { soundManager.play("tap"); onConvert(item); }}
            activeOpacity={0.7}
          >
            <Feather name="shopping-bag" size={15} color={theme.secondaryText} />
          </TouchableOpacity>
        )}
        {onRemove && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => { soundManager.play("trash"); onRemove(item); }}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={15} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
    </View>

    {/* Accordion de pecas do kit */}
    {hasBundle && bundleOpen && (
      <View style={[s.bundleAccordion, { backgroundColor: theme.cardBackground + "80", borderColor: theme.primaryColor + "30" }]}>
        {item.bundleItems!.map((bItem: BundleItem) => {
          const purchased = bItem.purchased ?? false;
          return (
            <TouchableOpacity
              key={bItem.id}
              style={[s.bundlePieceRow, { borderBottomColor: theme.primaryColor + "15" }]}
              onPress={() => onBundleItemToggle?.(item, bItem.id, !purchased)}
              activeOpacity={0.7}
            >
              <View style={[s.bundleCheck, { borderColor: purchased ? "#16A34A" : theme.secondaryText, backgroundColor: purchased ? "#16A34A" : "transparent" }]}>
                {purchased && <Feather name="check" size={10} color="#fff" />}
              </View>
              <TText
                variant="caption"
                fontWeight="500"
                color={purchased ? theme.secondaryText : theme.textColor}
                textDecorationLine={purchased ? "line-through" : "none"}
                flex={1}
                numberOfLines={1}
              >
                {(bItem.quantity ?? 1) > 1 ? `×${bItem.quantity} ${bItem.name || "Sem nome"}` : (bItem.name || "Sem nome")}
              </TText>
              {bItem.price !== undefined && (
                <TText variant="caption" bold color={purchased ? theme.secondaryText : theme.primaryColor} fontSize={11}>
                  {`R$ ${(bItem.price * (bItem.quantity ?? 1)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                </TText>
              )}
              {(bItem.affiliateUrl ?? bItem.originalUrl) && (
                <TouchableOpacity onPress={() => Linking.openURL(bItem.affiliateUrl ?? bItem.originalUrl!)} activeOpacity={0.7}>
                  <Feather name="external-link" size={12} color={bItem.affiliateUrl ? "#22C55E" : theme.secondaryText} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
        {/* Botoes comprar tudo / desmarcar tudo */}
        <View style={s.bundleActions}>
          <TouchableOpacity
            style={[s.bundleActionBtn, { backgroundColor: "#16A34A20" }]}
            onPress={() => item.bundleItems!.forEach((b) => onBundleItemToggle?.(item, b.id, true))}
            activeOpacity={0.7}
          >
            <Feather name="check-square" size={13} color="#16A34A" />
            <TText variant="caption" fontWeight="600" color="#16A34A" fontSize={11}>Comprar tudo</TText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.bundleActionBtn, { backgroundColor: theme.primaryColor + "15" }]}
            onPress={() => item.bundleItems!.forEach((b) => onBundleItemToggle?.(item, b.id, false))}
            activeOpacity={0.7}
          >
            <Feather name="square" size={13} color={theme.primaryColor} />
            <TText variant="caption" fontWeight="600" color={theme.primaryColor} fontSize={11}>Desmarcar</TText>
          </TouchableOpacity>
        </View>
      </View>
    )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginVertical: 4 },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
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
  affordableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
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
  refreshingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  refreshSpinner: {
    transform: [{ scale: 0.7 }],
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
    flexWrap: "wrap",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  groupBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
  bundleToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignSelf: "stretch",
    borderLeftWidth: 1,
    borderLeftColor: "transparent",
  },
  bundleAccordion: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
  },
  bundlePieceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bundleCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  bundleActions: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  bundleActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 8,
    paddingVertical: 7,
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
