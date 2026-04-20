import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { TInput } from "@/src/components/tamagui";
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
  namePlaceholder = "Descrição do produto",
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
        <TInput
          flex={1}
          value={data.name}
          onChangeText={(v) => onChange("name", v)}
          placeholder={namePlaceholder}
          color={theme.textColor}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
        />
        {extraActions}
        {showRemove && (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Feather name="trash-2" size={16} color={theme.danger} />
          </Pressable>
        )}
      </View>

      <View style={s.row}>
        <TInput
          flex={1}
          height={36}
          fontSize={13}
          paddingHorizontal="$md"
          value={data.qty}
          onChangeText={(v) => onChange("qty", v)}
          placeholder="Qtd"
          keyboardType="decimal-pad"
          color={theme.textColor}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
        />
        <TInput
          flex={1}
          height={36}
          fontSize={13}
          paddingHorizontal="$md"
          value={data.unit}
          onChangeText={(v) => onChange("unit", v)}
          placeholder="UN"
          autoCapitalize="characters"
          color={theme.textColor}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
        />
        <TInput
          flex={2}
          height={36}
          fontSize={13}
          paddingHorizontal="$md"
          value={data.unitPrice}
          onChangeText={(v) => onChange("unitPrice", v)}
          placeholder="Preco unit."
          keyboardType="decimal-pad"
          color={theme.textColor}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
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
        <TInput
          flex={1}
          height={36}
          fontSize={13}
          paddingHorizontal="$md"
          value={data.ean}
          onChangeText={(v) => onChange("ean", v)}
          placeholder="EAN (opcional)"
          keyboardType="number-pad"
          maxLength={14}
          color={theme.textColor}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
        />
        <TInput
          flex={1}
          height={36}
          fontSize={13}
          paddingHorizontal="$md"
          value={data.ncm}
          onChangeText={(v) => onChange("ncm", v)}
          placeholder="NCM (opcional)"
          keyboardType="number-pad"
          maxLength={8}
          color={theme.textColor}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
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
  catBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catText: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 13 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  confirmText: { color: "#FFF", fontFamily: "DMSans_600SemiBold", fontSize: 14 },
});
