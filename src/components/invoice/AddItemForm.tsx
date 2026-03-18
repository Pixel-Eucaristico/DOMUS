import React, { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";
import { CATEGORY_OPTIONS, GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { CategoryPickerModal } from "@/src/components/shared/CategoryPickerModal";
import { NCM_SUBCATEGORIES } from "@packages/parsers/src/classifier/ncmCategories";

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
  /** Categoria selecionada (opcional — se não for passada, usa estado interno) */
  categoryId?: string;
  onCategoryChange?: (catId: string, subCatId?: string) => void;
}

function getCatDisplayName(categoryId: string): string {
  const sub = NCM_SUBCATEGORIES.find((s) => s.id === categoryId);
  if (sub) return sub.name;
  const cat = CATEGORY_OPTIONS.find((c) => c.id === categoryId);
  return cat?.name ?? "Selecionar categoria...";
}

function getCatColor(categoryId: string): string {
  // Check if it's a subcategory
  const sub = NCM_SUBCATEGORIES.find((s) => s.id === categoryId);
  if (sub) return GROUP_COLORS[sub.group] ?? GROUP_COLORS.wants;
  const cat = CATEGORY_OPTIONS.find((c) => c.id === categoryId);
  return cat ? GROUP_COLORS[cat.group] : GROUP_COLORS.wants;
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
  categoryId: externalCatId,
  onCategoryChange,
}: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [internalCatId, setInternalCatId] = useState("alimentacao");

  const catId = externalCatId ?? internalCatId;
  const color = getCatColor(catId);

  const handlePickerSelect = (newCatId: string, subCatId?: string) => {
    if (onCategoryChange) {
      onCategoryChange(newCatId, subCatId);
    } else {
      setInternalCatId(newCatId);
    }
  };

  return (
    <View style={[s.addItemForm, { borderColor: theme.border }]}>
      <TextInput
        style={[s.editInput, { color: theme.textColor, borderColor: theme.border }]}
        value={desc}
        onChangeText={onDescChange}
        placeholder="Descricao do produto"
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
          placeholder="Preco unit."
          placeholderTextColor={theme.secondaryText}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Category picker */}
      <Text style={[s.sectionLabel, { color: theme.secondaryText }]}>Categoria</Text>
      <Pressable
        onPress={() => setPickerVisible(true)}
        style={[s.catPickerBtn, { borderColor: color, backgroundColor: `${color}10` }]}
      >
        <View style={[s.catDot, { backgroundColor: color }]} />
        <Text style={[s.catPickerText, { color: theme.textColor }]}>
          {getCatDisplayName(catId)}
        </Text>
        <Feather name="chevron-right" size={14} color={theme.secondaryText} />
      </Pressable>

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

      <CategoryPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickerSelect}
        theme={theme}
        selectedId={catId}
      />
    </View>
  );
}

const s = StyleSheet.create({
  addItemForm: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  addItemRow: { flexDirection: "row", gap: 8 },
  editInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  editInputSmall: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  catPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  catPickerText: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 13 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
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
