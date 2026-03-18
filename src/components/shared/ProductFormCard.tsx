import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { CategoryPickerModal } from "./CategoryPickerModal";
import { getCategoryDisplayName, getCategoryColor } from "@/src/utils/categoryHelpers";
import { soundManager } from "@/src/services/SoundManager";

// ─── Shared product data shape ───────────────────────────────────────────────

export interface ProductFormData {
  name: string;
  qty: string;
  unit: string;
  unitPrice: string;
  categoryId: string;
  ean: string;
  ncm: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ProductFormCardProps {
  data: ProductFormData;
  onChange: (field: keyof ProductFormData, value: string) => void;
  theme: ThemeColors;
  namePlaceholder?: string;
  showConfirm?: boolean;
  onConfirm?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
  compact?: boolean;
  extraActions?: React.ReactNode;
}

export function ProductFormCard({
  data,
  onChange,
  theme,
  namePlaceholder = "Descricao do produto",
  showConfirm = false,
  onConfirm,
  showRemove = false,
  onRemove,
  compact = false,
  extraActions,
}: ProductFormCardProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const color = getCategoryColor(data.categoryId);

  return (
    <View style={[s.card, compact && s.cardCompact, { borderColor: theme.border }]}>
      <View style={s.row}>
        <TextInput
          style={[s.input, s.flex1, { color: theme.textColor, borderColor: theme.border }]}
          value={data.name}
          onChangeText={(v) => onChange("name", v)}
          placeholder={namePlaceholder}
          placeholderTextColor={theme.secondaryText}
        />
        {extraActions}
        {showRemove && (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Feather name="trash-2" size={16} color={theme.danger} />
          </Pressable>
        )}
      </View>

      <View style={s.row}>
        <TextInput
          style={[s.inputSm, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
          value={data.qty}
          onChangeText={(v) => onChange("qty", v)}
          placeholder="Qtd"
          placeholderTextColor={theme.secondaryText}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[s.inputSm, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
          value={data.unit}
          onChangeText={(v) => onChange("unit", v)}
          placeholder="UN"
          placeholderTextColor={theme.secondaryText}
          autoCapitalize="characters"
        />
        <TextInput
          style={[s.inputSm, { color: theme.textColor, borderColor: theme.border, flex: 2 }]}
          value={data.unitPrice}
          onChangeText={(v) => onChange("unitPrice", v)}
          placeholder="Preco unit."
          placeholderTextColor={theme.secondaryText}
          keyboardType="decimal-pad"
        />
      </View>

      <Pressable
        onPress={() => setPickerVisible(true)}
        style={[s.catBtn, { borderColor: color, backgroundColor: `${color}10` }]}
      >
        <View style={[s.catDot, { backgroundColor: color }]} />
        <Text style={[s.catText, { color: data.categoryId ? theme.textColor : theme.secondaryText }]}>
          {getCategoryDisplayName(data.categoryId)}
        </Text>
        <Feather name="chevron-right" size={14} color={theme.secondaryText} />
      </Pressable>

      <View style={s.row}>
        <TextInput
          style={[s.inputSm, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
          value={data.ean}
          onChangeText={(v) => onChange("ean", v)}
          placeholder="EAN (opcional)"
          placeholderTextColor={theme.secondaryText}
          keyboardType="number-pad"
          maxLength={14}
        />
        <TextInput
          style={[s.inputSm, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
          value={data.ncm}
          onChangeText={(v) => onChange("ncm", v)}
          placeholder="NCM (opcional)"
          placeholderTextColor={theme.secondaryText}
          keyboardType="number-pad"
          maxLength={8}
        />
      </View>

      {showConfirm && onConfirm && (
        <Pressable
          style={[s.confirmBtn, { backgroundColor: theme.primaryColor }]}
          onPress={() => {
            if (!data.name.trim() || !data.qty.trim() || !data.unitPrice.trim()) {
              soundManager.play("error");
              return;
            }
            soundManager.play("success");
            onConfirm();
          }}
        >
          <Feather name="check" size={16} color="#FFF" />
          <Text style={s.confirmText}>Confirmar</Text>
        </Pressable>
      )}

      <CategoryPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(catId) => onChange("categoryId", catId)}
        theme={theme}
        selectedId={data.categoryId}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  cardCompact: { padding: 10, gap: 6 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  flex1: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: "DMSans_400Regular" },
  inputSm: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, fontFamily: "DMSans_400Regular" },
  catBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catText: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 13 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  confirmText: { color: "#FFF", fontFamily: "DMSans_600SemiBold", fontSize: 14 },
});
