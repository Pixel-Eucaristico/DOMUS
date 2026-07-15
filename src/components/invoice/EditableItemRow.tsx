import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ThemeColors } from "@packages/theme";
import type { CategoryGroup } from "@packages/events/src/types";
import type { EditableItem } from "@/src/hooks/useEditableItems";
import { CategoryPickerModal } from "@/src/components/shared/CategoryPickerModal";
import { soundManager } from "@/src/services/SoundManager";
import {
  getCategoryDisplayName,
  getCategoryColor,
  getCategoryGroup,
  getGroupColor,
  getGroupLabel,
} from "@/src/utils/categoryHelpers";
import { TText } from "@/src/components/tamagui";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  item: EditableItem;
  index: number;
  isEditing: boolean;
  theme: ThemeColors;
  onToggleEdit: (idx: number | null) => void;
  onEditField: (idx: number, field: string, value: string) => void;
  onRemove: (idx: number) => void;
}

const GROUP_TOGGLE_CYCLE: CategoryGroup[] = ["needs", "wants"];

// ─── Component ───────────────────────────────────────────────────────────────

export function EditableItemRow({ item, index, isEditing, theme, onToggleEdit, onEditField, onRemove }: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const catColor = getCategoryColor(item.categoryId);
  const catName = getCategoryDisplayName(item.categoryId, item.subcategoryId);
  const currentGroup = (item.groupOverride ?? getCategoryGroup(item.categoryId, item.subcategoryId)) as CategoryGroup;
  const groupColor = getGroupColor(currentGroup);
  const groupLabel = getGroupLabel(currentGroup);

  // O usuário sempre pode corrigir o grupo — a classificação automática pode
  // errar (ex.: salgadinho é "alimentacao" mas é desejo, não necessidade).
  const handleToggleGroup = () => {
    const idx = GROUP_TOGGLE_CYCLE.indexOf(currentGroup);
    const next = GROUP_TOGGLE_CYCLE[(idx + 1) % GROUP_TOGGLE_CYCLE.length]!;
    soundManager.play("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEditField(index, "groupOverride", next);
  };

  const handlePickerSelect = (categoryId: string, subcategoryId?: string) => {
    onEditField(index, "categoryId", categoryId);
    // Sempre atualiza a subcategoria (vazio limpa) e reseta o override manual,
    // já que a troca de categoria redefine o grupo automático.
    onEditField(index, "subcategoryId", subcategoryId ?? "");
    onEditField(index, "groupOverride", "");
  };

  return (
    <View>
      {/* Item row */}
      <View style={[s.itemRow, { borderBottomColor: theme.border }]}>
        <View style={s.itemInfo}>
          <TText variant="body" fontWeight="500" color={theme.textColor} fontSize={15} numberOfLines={2}>
            {item.description}
          </TText>
          <TText variant="label" color={theme.secondaryText}>
            {item.quantity} {item.unit || "un"} × R$ {item.unitPrice.toFixed(2)}
          </TText>
          {item.ean && <TText variant="caption" color={theme.secondaryText} fontSize={11} marginTop={2}>EAN: {item.ean}</TText>}
          {item.ncm && <TText variant="caption" color={theme.secondaryText} fontSize={11} marginTop={2}>NCM: {item.ncm}</TText>}
          {item.productCode && <TText variant="caption" color={theme.secondaryText} fontSize={11} marginTop={2}>Cod: {item.productCode}</TText>}

          {/* Category + Group tags */}
          <View style={s.tagRow}>
            <Pressable onPress={() => setPickerVisible(true)} style={[s.tag, { backgroundColor: `${catColor}22` }]}>
              <View style={[s.dot, { backgroundColor: catColor }]} />
              <TText variant="caption" fontWeight="600" color={catColor} fontSize={10}>{catName}</TText>
              <Feather name="chevron-right" size={10} color={catColor} />
            </Pressable>
            <Pressable
              onPress={handleToggleGroup}
              style={[s.tag, { backgroundColor: `${groupColor}18`, borderColor: `${groupColor}40`, borderWidth: 1 }]}
            >
              <Feather name="refresh-cw" size={9} color={groupColor} />
              <TText variant="caption" bold color={groupColor} fontSize={9}>{groupLabel}</TText>
            </Pressable>
          </View>
        </View>

        <TText variant="body" fontWeight="600" color={theme.textColor} fontSize={15} flexShrink={0}>
          R$ {item.totalPrice.toFixed(2)}
        </TText>
        <Pressable onPress={() => onToggleEdit(isEditing ? null : index)} hitSlop={8} style={{ marginLeft: 8 }}>
          <Feather name="edit-2" size={16} color={theme.primaryColor} />
        </Pressable>
        <Pressable onPress={() => { soundManager.play("trash"); onRemove(index); }} hitSlop={8} style={{ marginLeft: 8 }}>
          <Feather name="trash-2" size={16} color={theme.danger} />
        </Pressable>
      </View>

      {/* Inline edit form */}
      {isEditing && (
        <View style={[s.editForm, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
          <TextInput style={[s.editInput, { color: theme.textColor, borderColor: theme.border }]} value={item.description} onChangeText={(v) => onEditField(index, "description", v)} placeholder="Descrição" placeholderTextColor={theme.secondaryText} />
          <View style={s.editRow}>
            <TextInput style={[s.editInputSm, { color: theme.textColor, borderColor: theme.border, flex: 1 }]} value={String(item.quantity)} onChangeText={(v) => onEditField(index, "quantity", v)} placeholder="Qtd" placeholderTextColor={theme.secondaryText} keyboardType="decimal-pad" />
            <TextInput style={[s.editInputSm, { color: theme.textColor, borderColor: theme.border, flex: 1 }]} value={item.unit || ""} onChangeText={(v) => onEditField(index, "unit", v)} placeholder="UN" placeholderTextColor={theme.secondaryText} autoCapitalize="characters" />
            <TextInput style={[s.editInputSm, { color: theme.textColor, borderColor: theme.border, flex: 2 }]} value={String(item.unitPrice)} onChangeText={(v) => onEditField(index, "unitPrice", v)} placeholder="Preco unit." placeholderTextColor={theme.secondaryText} keyboardType="decimal-pad" />
          </View>
          <View style={s.editRow}>
            <TextInput style={[s.editInputSm, { color: theme.textColor, borderColor: theme.border, flex: 1 }]} value={item.ean || ""} onChangeText={(v) => onEditField(index, "ean", v)} placeholder="EAN" placeholderTextColor={theme.secondaryText} keyboardType="number-pad" maxLength={14} />
            <TextInput style={[s.editInputSm, { color: theme.textColor, borderColor: theme.border, flex: 1 }]} value={item.ncm || ""} onChangeText={(v) => onEditField(index, "ncm", v)} placeholder="NCM" placeholderTextColor={theme.secondaryText} keyboardType="number-pad" maxLength={8} />
          </View>
          <TText variant="caption" fontWeight="500" color={theme.secondaryText} fontSize={11} marginTop={2}>
            Categoria do gasto
          </TText>
          <Pressable onPress={() => setPickerVisible(true)} style={[s.catPickerBtn, { borderColor: catColor, backgroundColor: `${catColor}10` }]}>
            <View style={[s.dot, { backgroundColor: catColor }]} />
            <TText variant="label" color={theme.textColor} flex={1}>{catName}</TText>
            <Feather name="chevron-right" size={14} color={theme.secondaryText} />
          </Pressable>
          <Pressable style={{ alignSelf: "flex-end", marginTop: 6 }} onPress={() => onToggleEdit(null)}>
            <TText variant="body" fontWeight="600" color={theme.primaryColor}>Fechar</TText>
          </Pressable>
        </View>
      )}

      <CategoryPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={handlePickerSelect} theme={theme} selectedId={item.categoryId} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, gap: 8 },
  itemInfo: { flex: 1, flexShrink: 1 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  editForm: { padding: 12, borderTopWidth: 1, marginBottom: 4, gap: 8 },
  editRow: { flexDirection: "row", gap: 8 },
  editInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  editInputSm: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  catPickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
});
