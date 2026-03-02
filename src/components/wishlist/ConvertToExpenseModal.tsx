import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { WishlistItem } from "@packages/wishlist";

interface Props {
  visible: boolean;
  item: WishlistItem | null;
  theme: ThemeColors;
  onConfirm: (item: WishlistItem) => void;
  onCancel: () => void;
}

export function ConvertToExpenseModal({
  visible,
  item,
  theme,
  onConfirm,
  onCancel,
}: Props) {
  if (!item) return null;

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
                Converter em Despesa?
              </Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                O item será removido da lista de desejos e você poderá registrá-lo
                como despesa.
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

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, { borderColor: theme.border ?? "#E5E7EB" }]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.btnText, { color: theme.secondaryText }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.primaryColor }]}
                  onPress={() => onConfirm(item)}
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
