import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { WishlistItem } from "@packages/wishlist";
import type { AccountPayload } from "@packages/events";
import { soundManager } from "@/src/services/SoundManager";

interface Props {
  visible: boolean;
  item: WishlistItem | null;
  accounts: AccountPayload[];
  theme: ThemeColors;
  onConfirm: (item: WishlistItem, accountId: string) => void;
  onCancel: () => void;
}

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  checking: "credit-card",
  savings: "dollar-sign",
  wallet: "pocket",
};

export function ConvertToExpenseModal({
  visible,
  item,
  accounts,
  theme,
  onConfirm,
  onCancel,
}: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Pre-select linked account or first available account
  useEffect(() => {
    if (!visible || !item) return;
    const linkedId = item.savingsGoal?.linkedAccountId;
    const spendableAccounts = accounts.filter((a) => a.type !== "credit_card");
    if (linkedId && spendableAccounts.find((a) => a.id === linkedId)) {
      setSelectedAccountId(linkedId);
    } else if (spendableAccounts.length > 0) {
      setSelectedAccountId(spendableAccounts[0].id);
    }
  }, [visible, item, accounts]);

  if (!item) return null;

  const spendableAccounts = accounts.filter((a) => a.type !== "credit_card");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: theme.background }]}>
              <View
                style={[styles.iconWrap, { backgroundColor: theme.primaryColor + "20" }]}
              >
                <Feather name="shopping-bag" size={28} color={theme.primaryColor} />
              </View>

              <Text style={[styles.title, { color: theme.textColor }]}>
                Registrar Compra
              </Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                O item será removido da lista de desejos e a despesa registrada nas suas finanças.
              </Text>

              <View
                style={[styles.itemBox, { backgroundColor: theme.cardBackground }]}
              >
                <Text
                  style={[styles.itemName, { color: theme.textColor }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                {item.price !== undefined && (
                  <Text style={[styles.itemPrice, { color: theme.primaryColor }]}>
                    R${" "}
                    {item.price.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                )}
                {item.category && (
                  <Text
                    style={[styles.itemCat, { color: theme.secondaryText }]}
                  >
                    {item.category}
                  </Text>
                )}
              </View>

              {/* Account picker */}
              {spendableAccounts.length > 0 && (
                <View style={styles.accountSection}>
                  <Text style={[styles.accountLabel, { color: theme.secondaryText }]}>
                    Descontar de qual conta?
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.accountRow}
                  >
                    {spendableAccounts.map((acc) => {
                      const selected = selectedAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.accountChip,
                            {
                              backgroundColor: selected
                                ? (acc.color ?? theme.primaryColor) + "25"
                                : theme.cardBackground,
                              borderColor: selected
                                ? (acc.color ?? theme.primaryColor)
                                : theme.cardBackground,
                            },
                          ]}
                          onPress={() => { soundManager.play("tap"); setSelectedAccountId(acc.id); }}
                          activeOpacity={0.7}
                        >
                          <Feather
                            name={(ACCOUNT_TYPE_ICONS[acc.type] ?? "credit-card") as any}
                            size={12}
                            color={selected ? (acc.color ?? theme.primaryColor) : theme.secondaryText}
                          />
                          <Text
                            style={[
                              styles.accountChipText,
                              {
                                color: selected
                                  ? (acc.color ?? theme.primaryColor)
                                  : theme.textColor,
                                fontFamily: selected ? "DMSans_700Bold" : "DMSans_400Regular",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, { borderColor: theme.border ?? "#E5E7EB" }]}
                  onPress={() => { soundManager.play("tap"); onCancel(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.btnText, { color: theme.secondaryText }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.primaryColor }]}
                  onPress={() => { soundManager.play("success"); onConfirm(item, selectedAccountId); }}
                  activeOpacity={0.7}
                >
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.btnTextPrimary}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  itemBox: {
    width: "100%",
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginVertical: 4,
  },
  itemName: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  itemCat: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
  },
  accountSection: {
    width: "100%",
    gap: 6,
  },
  accountLabel: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  accountRow: {
    gap: 6,
    paddingBottom: 2,
  },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accountChipText: {
    fontSize: 12,
    maxWidth: 100,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnPrimary: { borderWidth: 0 },
  btnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  btnTextPrimary: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});
