import React from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";

interface Props {
  theme: ThemeColors;
  desc: string;
  qty: string;
  unit: string;
  unitPrice: string;
  ean: string;
  ncm: string;
  onDescChange: (v: string) => void;
  onQtyChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  onUnitPriceChange: (v: string) => void;
  onEanChange: (v: string) => void;
  onNcmChange: (v: string) => void;
  onConfirm: () => void;
}

export function AddItemForm({
  theme,
  desc,
  qty,
  unit,
  unitPrice,
  ean,
  ncm,
  onDescChange,
  onQtyChange,
  onUnitChange,
  onUnitPriceChange,
  onEanChange,
  onNcmChange,
  onConfirm,
}: Props) {
  return (
    <View style={[s.addItemForm, { borderColor: theme.border }]}>
      <TextInput
        style={[s.editInput, { color: theme.textColor, borderColor: theme.border }]}
        value={desc}
        onChangeText={onDescChange}
        placeholder="Descrição do produto"
        placeholderTextColor={theme.secondaryText}
      />
      <View style={s.addItemRow}>
        <TextInput
          style={[s.editInputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
          value={qty}
          onChangeText={onQtyChange}
          placeholder="Qtd"
          placeholderTextColor={theme.secondaryText}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[s.editInputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
          value={unit}
          onChangeText={onUnitChange}
          placeholder="UN"
          placeholderTextColor={theme.secondaryText}
          autoCapitalize="characters"
        />
        <TextInput
          style={[s.editInputSmall, { color: theme.textColor, borderColor: theme.border, flex: 2 }]}
          value={unitPrice}
          onChangeText={onUnitPriceChange}
          placeholder="Preço unit."
          placeholderTextColor={theme.secondaryText}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={s.addItemRow}>
        <TextInput
          style={[s.editInputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
          value={ean}
          onChangeText={onEanChange}
          placeholder="EAN (opcional)"
          placeholderTextColor={theme.secondaryText}
          keyboardType="number-pad"
          maxLength={14}
        />
        <TextInput
          style={[s.editInputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
          value={ncm}
          onChangeText={onNcmChange}
          placeholder="NCM (opcional)"
          placeholderTextColor={theme.secondaryText}
          keyboardType="number-pad"
          maxLength={8}
        />
      </View>
      <Pressable
        style={[s.confirmItemBtn, { backgroundColor: theme.primaryColor }]}
        onPress={() => {
          if (!desc.trim() || !qty.trim() || !unitPrice.trim()) {
            soundManager.play("error");
            return;
          }
          soundManager.play("success");
          onConfirm();
        }}
      >
        <Feather name="check" size={16} color="#FFF" />
        <Text style={s.confirmItemBtnText}>Confirmar</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  addItemForm: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  addItemRow: { flexDirection: "row", gap: 8 },
  editInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  editInputSmall: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  confirmItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmItemBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
});
