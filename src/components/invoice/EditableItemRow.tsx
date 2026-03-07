import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { EditableItem } from "@/src/hooks/useEditableItems";
import { CATEGORY_OPTIONS, GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { CategoryChipScroll } from "@/src/components/shared/CategoryChipScroll";
import { soundManager } from "@/src/services/SoundManager";

interface Props {
  item: EditableItem;
  index: number;
  isEditing: boolean;
  theme: ThemeColors;
  onToggleEdit: (idx: number | null) => void;
  onEditField: (idx: number, field: any, value: string) => void;
  onRemove: (idx: number) => void;
}

export function EditableItemRow({
  item,
  index,
  isEditing,
  theme,
  onToggleEdit,
  onEditField,
  onRemove,
}: Props) {
  const cat = CATEGORY_OPTIONS.find((c) => c.id === item.categoryId);
  const catColor = cat ? GROUP_COLORS[cat.group] : undefined;

  return (
    <View>
      <View style={[s.itemRow, { borderBottomColor: theme.border }]}>
        <View style={s.itemInfo}>
          <Text style={[s.itemDescription, { color: theme.textColor }]} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={[s.itemSub, { color: theme.secondaryText }]}>
            {item.quantity} {item.unit || "un"} × R$ {item.unitPrice.toFixed(2)}
          </Text>
          {item.ean ? (
            <Text style={[s.itemMeta, { color: theme.secondaryText }]}>EAN: {item.ean}</Text>
          ) : null}
          {item.ncm ? (
            <Text style={[s.itemMeta, { color: theme.secondaryText }]}>NCM: {item.ncm}</Text>
          ) : null}
          {item.productCode ? (
            <Text style={[s.itemMeta, { color: theme.secondaryText }]}>
              Cod: {item.productCode}
            </Text>
          ) : null}
          {cat && catColor && (
            <View style={[s.categoryChip, { backgroundColor: catColor + "22" }]}>
              <View style={[s.categoryDot, { backgroundColor: catColor }]} />
              <Text style={[s.categoryChipText, { color: catColor }]}>{cat.name}</Text>
            </View>
          )}
        </View>
        <Text style={[s.itemPrice, { color: theme.textColor }]}>
          R$ {item.totalPrice.toFixed(2)}
        </Text>
        <Pressable
          onPress={() => onToggleEdit(isEditing ? null : index)}
          hitSlop={8}
          style={{ marginLeft: 8 }}
        >
          <Feather name="edit-2" size={16} color={theme.primaryColor} />
        </Pressable>
        <Pressable
          onPress={() => { soundManager.play("trash"); onRemove(index); }}
          hitSlop={8}
          style={{ marginLeft: 8 }}
        >
          <Feather name="trash-2" size={16} color={theme.danger} />
        </Pressable>
      </View>

      {isEditing && (
        <View
          style={[
            s.editForm,
            { borderColor: theme.border, backgroundColor: theme.cardBackground },
          ]}
        >
          <TextInput
            style={[s.editInput, { color: theme.textColor, borderColor: theme.border }]}
            value={item.description}
            onChangeText={(v) => onEditField(index, "description", v)}
            placeholder="Descrição"
            placeholderTextColor={theme.secondaryText}
          />
          <View style={s.editRow}>
            <TextInput
              style={[s.editInputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
              value={String(item.quantity)}
              onChangeText={(v) => onEditField(index, "quantity", v)}
              placeholder="Qtd"
              placeholderTextColor={theme.secondaryText}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[s.editInputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
              value={item.unit || ""}
              onChangeText={(v) => onEditField(index, "unit", v)}
              placeholder="UN"
              placeholderTextColor={theme.secondaryText}
              autoCapitalize="characters"
            />
            <TextInput
              style={[s.editInputSmall, { color: theme.textColor, borderColor: theme.border, flex: 2 }]}
              value={String(item.unitPrice)}
              onChangeText={(v) => onEditField(index, "unitPrice", v)}
              placeholder="Preço unit."
              placeholderTextColor={theme.secondaryText}
              keyboardType="decimal-pad"
            />
          </View>
          <TextInput
            style={[s.editInput, { color: theme.textColor, borderColor: theme.border }]}
            value={item.ean || ""}
            onChangeText={(v) => onEditField(index, "ean", v)}
            placeholder="EAN / codigo de barras (opcional)"
            placeholderTextColor={theme.secondaryText}
            keyboardType="number-pad"
          />
          <TextInput
            style={[s.editInput, { color: theme.textColor, borderColor: theme.border }]}
            value={item.ncm || ""}
            onChangeText={(v) => onEditField(index, "ncm", v)}
            placeholder="NCM — 8 digitos (opcional)"
            placeholderTextColor={theme.secondaryText}
            keyboardType="number-pad"
            maxLength={8}
          />
          <Text style={[s.editSectionLabel, { color: theme.secondaryText }]}>
            Categoria do gasto
          </Text>
          <CategoryChipScroll
            categories={CATEGORY_OPTIONS}
            selectedId={item.categoryId ?? ""}
            theme={theme}
            onSelect={(id) => onEditField(index, "categoryId", id)}
          />
          <Pressable
            style={{ alignSelf: "flex-end", marginTop: 6 }}
            onPress={() => onToggleEdit(null)}
          >
            <Text style={{ color: theme.primaryColor, fontWeight: "600" }}>Fechar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  itemInfo: { flex: 1, flexShrink: 1 },
  itemDescription: { fontSize: 15, fontWeight: "500", marginBottom: 3 },
  itemSub: { fontSize: 13 },
  itemMeta: { fontSize: 11, marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: "600", flexShrink: 0 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryChipText: { fontSize: 10, fontWeight: "600" },
  editForm: { padding: 12, borderTopWidth: 1, marginBottom: 4, gap: 8 },
  editRow: { flexDirection: "row", gap: 8 },
  editInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  editInputSmall: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  editSectionLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
});
