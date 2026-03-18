import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import {
  TRANSACTION_CATEGORIES,
  EXPENSE_CATEGORIES,
  ManualItem,
  itemTotal,
} from "@/src/constants/transactionCategories";
import { GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { CategoryPickerModal } from "@/src/components/shared/CategoryPickerModal";
import { soundManager } from "@/src/services/SoundManager";
import { NCM_SUBCATEGORIES } from "@packages/parsers/src/classifier/ncmCategories";

const DEFAULT_CATEGORY_ID = EXPENSE_CATEGORIES[0]!.id;

interface ItemsSectionProps {
  items: ManualItem[];
  theme: ThemeColors;
  onAddItem: (item: Omit<ManualItem, "id">) => void;
  onRemoveItem: (id: string) => void;
  onEditItemField: (id: string, field: keyof ManualItem, value: string) => void;
}

/** Get display name for a category + optional subcategory */
function getCategoryDisplayName(categoryId: string, subcategoryId?: string): string {
  if (subcategoryId) {
    const sub = NCM_SUBCATEGORIES.find((s) => s.id === subcategoryId);
    if (sub) return sub.name;
  }
  const cat = TRANSACTION_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.name ?? "Outros";
}

export function ItemsSection({
  items,
  theme,
  onAddItem,
  onRemoveItem,
  onEditItemField,
}: ItemsSectionProps) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("UN");
  const [newItemUnitPrice, setNewItemUnitPrice] = useState("");
  const [newItemCatId, setNewItemCatId] = useState(DEFAULT_CATEGORY_ID);
  const [newItemSubCatId, setNewItemSubCatId] = useState<string | undefined>();
  const [newItemEan, setNewItemEan] = useState("");
  const [newItemNcm, setNewItemNcm] = useState("");

  // Category picker modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"add" | string>("add"); // "add" or item.id

  const total = items.reduce((s, i) => s + itemTotal(i), 0);

  const handleConfirmAdd = () => {
    const qtyNum = parseFloat(newItemQty.replace(",", "."));
    const priceNum = parseFloat(newItemUnitPrice.replace(",", "."));
    if (!newItemDesc.trim() || isNaN(qtyNum) || qtyNum <= 0 || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Item invalido", "Informe descricao, quantidade e preco unitario.");
      return;
    }
    soundManager.play("success");
    onAddItem({
      description: newItemDesc.trim(),
      quantity: newItemQty,
      unit: newItemUnit || "UN",
      unitPrice: newItemUnitPrice,
      categoryId: newItemCatId,
      subcategoryId: newItemSubCatId,
      ean: newItemEan.trim() || undefined,
      ncm: newItemNcm.trim() || undefined,
    });
    setNewItemDesc("");
    setNewItemQty("1");
    setNewItemUnit("UN");
    setNewItemUnitPrice("");
    setNewItemCatId(DEFAULT_CATEGORY_ID);
    setNewItemSubCatId(undefined);
    setNewItemEan("");
    setNewItemNcm("");
    setShowAddItem(false);
  };

  const openPickerForAdd = () => {
    setPickerTarget("add");
    setPickerVisible(true);
  };

  const openPickerForEdit = (itemId: string) => {
    setPickerTarget(itemId);
    setPickerVisible(true);
  };

  const handlePickerSelect = (categoryId: string, subcategoryId?: string) => {
    if (pickerTarget === "add") {
      setNewItemCatId(categoryId);
      setNewItemSubCatId(subcategoryId);
    } else {
      // Editing existing item
      onEditItemField(pickerTarget, "categoryId", categoryId);
      if (subcategoryId) {
        onEditItemField(pickerTarget, "subcategoryId" as keyof ManualItem, subcategoryId);
      }
    }
  };

  const getColor = (catId: string) => {
    const cat = TRANSACTION_CATEGORIES.find((c) => c.id === catId);
    return GROUP_COLORS[cat?.group ?? "wants"] ?? theme.primaryColor;
  };

  return (
    <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.label, { color: theme.secondaryText, marginBottom: 0 }]}>
          Produtos ({items.length})
        </Text>
        <Pressable
          onPress={() => {
            soundManager.play("pop");
            setShowAddItem((v) => !v);
            setEditingItemId(null);
          }}
          style={[
            s.addBtn,
            { backgroundColor: `${theme.primaryColor}15`, borderColor: theme.primaryColor },
          ]}
        >
          <Feather name={showAddItem ? "minus" : "plus"} size={14} color={theme.primaryColor} />
          <Text style={[s.addBtnText, { color: theme.primaryColor }]}>
            {showAddItem ? "Cancelar" : "Adicionar"}
          </Text>
        </Pressable>
      </View>

      {/* Add form */}
      {showAddItem && (
        <View style={[s.addForm, { borderColor: theme.border }]}>
          <TextInput
            style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
            value={newItemDesc}
            onChangeText={setNewItemDesc}
            placeholder="Descricao do produto"
            placeholderTextColor={theme.secondaryText}
          />
          <View style={s.fieldRow}>
            <TextInput
              style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
              value={newItemQty}
              onChangeText={setNewItemQty}
              placeholder="Qtd"
              placeholderTextColor={theme.secondaryText}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
              value={newItemUnit}
              onChangeText={setNewItemUnit}
              placeholder="UN"
              placeholderTextColor={theme.secondaryText}
              autoCapitalize="characters"
            />
            <TextInput
              style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 2 }]}
              value={newItemUnitPrice}
              onChangeText={setNewItemUnitPrice}
              placeholder="Preco unit."
              placeholderTextColor={theme.secondaryText}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Category picker button */}
          <Pressable
            onPress={openPickerForAdd}
            style={[s.catPickerBtn, { borderColor: getColor(newItemCatId), backgroundColor: `${getColor(newItemCatId)}10` }]}
          >
            <View style={[s.dot, { backgroundColor: getColor(newItemCatId) }]} />
            <Text style={[s.catPickerText, { color: theme.textColor }]}>
              {getCategoryDisplayName(newItemCatId, newItemSubCatId)}
            </Text>
            <Feather name="chevron-right" size={14} color={theme.secondaryText} />
          </Pressable>

          {/* EAN / NCM */}
          <View style={s.fieldRow}>
            <TextInput
              style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
              value={newItemEan}
              onChangeText={setNewItemEan}
              placeholder="EAN (opcional)"
              placeholderTextColor={theme.secondaryText}
              keyboardType="number-pad"
              maxLength={14}
            />
            <TextInput
              style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
              value={newItemNcm}
              onChangeText={setNewItemNcm}
              placeholder="NCM (opcional)"
              placeholderTextColor={theme.secondaryText}
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>
          <Pressable
            style={[s.confirmBtn, { backgroundColor: theme.primaryColor }]}
            onPress={handleConfirmAdd}
          >
            <Feather name="check" size={16} color="#FFF" />
            <Text style={s.confirmBtnText}>Confirmar</Text>
          </Pressable>
        </View>
      )}

      {/* Empty state */}
      {items.length === 0 && !showAddItem && (
        <View style={[s.empty, { borderColor: theme.border }]}>
          <Feather name="package" size={28} color={theme.secondaryText} />
          <Text style={[s.emptyText, { color: theme.secondaryText }]}>
            Nenhum produto. Opcional — o total vem do campo Valor acima.
          </Text>
        </View>
      )}

      {/* Item list */}
      {items.map((item) => {
        const color = getColor(item.categoryId);
        const amt = itemTotal(item);
        const isEditing = editingItemId === item.id;
        const displayCatName = getCategoryDisplayName(item.categoryId, item.subcategoryId);

        return (
          <View key={item.id}>
            <View style={[s.itemRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.itemDesc, { color: theme.textColor }]}>{item.description}</Text>
                <Text style={[s.itemSub, { color: theme.secondaryText }]}>
                  {item.quantity} {item.unit} × R${" "}
                  {parseFloat(item.unitPrice.replace(",", ".") || "0").toFixed(2)}
                  {(item.ean || item.ncm) ? `  •  ${[item.ean && `EAN:${item.ean}`, item.ncm && `NCM:${item.ncm}`].filter(Boolean).join("  ")}` : ""}
                </Text>
                {/* Category + Group tags */}
                <View style={s.tagRow}>
                  <Pressable
                    onPress={() => openPickerForEdit(item.id)}
                    style={[s.badge, { backgroundColor: `${color}22` }]}
                  >
                    <View style={[s.dot, { backgroundColor: color }]} />
                    <Text style={[s.badgeText, { color }]}>{displayCatName}</Text>
                    <Feather name="chevron-right" size={10} color={color} />
                  </Pressable>
                  {(() => {
                    const cat = TRANSACTION_CATEGORIES.find((c) => c.id === item.categoryId);
                    const group = item.groupOverride ?? cat?.group ?? "wants";
                    const gc = group === "needs" ? "#4CAF50" : group === "savings" ? "#2196F3" : "#FF9800";
                    const gl = group === "needs" ? "Necessidade" : group === "savings" ? "Poupanca" : "Desejo";
                    return (
                      <View style={[s.groupBadge, { backgroundColor: gc + "18" }]}>
                        <Text style={[s.groupBadgeText, { color: gc }]}>{gl}</Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
              <Text style={[s.itemAmt, { color: theme.textColor }]}>R$ {amt.toFixed(2)}</Text>
              <Pressable
                onPress={() => { soundManager.play("tap"); setEditingItemId(isEditing ? null : item.id); }}
                hitSlop={8}
                style={{ marginLeft: 8 }}
              >
                <Feather name="edit-2" size={16} color={theme.primaryColor} />
              </Pressable>
              <Pressable onPress={() => { soundManager.play("trash"); onRemoveItem(item.id); }} hitSlop={8} style={{ marginLeft: 8 }}>
                <Feather name="trash-2" size={16} color={theme.danger} />
              </Pressable>
            </View>

            {/* Inline edit form */}
            {isEditing && (
              <View
                style={[
                  s.editForm,
                  { borderColor: theme.border, backgroundColor: theme.cardBackground },
                ]}
              >
                <TextInput
                  style={[s.input, { color: theme.textColor, borderColor: theme.border }]}
                  value={item.description}
                  onChangeText={(v) => onEditItemField(item.id, "description", v)}
                  placeholder="Descricao"
                  placeholderTextColor={theme.secondaryText}
                />
                <View style={s.fieldRow}>
                  <TextInput
                    style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
                    value={item.quantity}
                    onChangeText={(v) => onEditItemField(item.id, "quantity", v)}
                    placeholder="Qtd"
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
                    value={item.unit}
                    onChangeText={(v) => onEditItemField(item.id, "unit", v)}
                    placeholder="UN"
                    placeholderTextColor={theme.secondaryText}
                    autoCapitalize="characters"
                  />
                  <TextInput
                    style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 2 }]}
                    value={item.unitPrice}
                    onChangeText={(v) => onEditItemField(item.id, "unitPrice", v)}
                    placeholder="Preco unit."
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Category picker button */}
                <Pressable
                  onPress={() => openPickerForEdit(item.id)}
                  style={[s.catPickerBtn, { borderColor: color, backgroundColor: `${color}10` }]}
                >
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={[s.catPickerText, { color: theme.textColor }]}>
                    {displayCatName}
                  </Text>
                  <Feather name="chevron-right" size={14} color={theme.secondaryText} />
                </Pressable>

                <Text style={[s.sectionLabel, { color: theme.secondaryText, marginTop: 4 }]}>
                  Dados fiscais (opcional)
                </Text>
                <View style={s.fieldRow}>
                  <TextInput
                    style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
                    value={item.ean ?? ""}
                    onChangeText={(v) => onEditItemField(item.id, "ean", v)}
                    placeholder="EAN"
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="number-pad"
                    maxLength={14}
                  />
                  <TextInput
                    style={[s.inputSmall, { color: theme.textColor, borderColor: theme.border, flex: 1 }]}
                    value={item.ncm ?? ""}
                    onChangeText={(v) => onEditItemField(item.id, "ncm", v)}
                    placeholder="NCM"
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="number-pad"
                    maxLength={8}
                  />
                </View>
                <Pressable
                  style={{ alignSelf: "flex-end", marginTop: 6 }}
                  onPress={() => setEditingItemId(null)}
                >
                  <Text style={{ color: theme.primaryColor, fontWeight: "600" }}>Fechar</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      {/* Total row */}
      {items.length > 0 && (
        <View style={[s.totalRow, { borderTopColor: theme.border }]}>
          <Text style={[s.totalLabel, { color: theme.secondaryText }]}>Total</Text>
          <Text style={[s.totalValue, { color: theme.primaryColor }]}>
            R$ {total.toFixed(2).replace(".", ",")}
          </Text>
        </View>
      )}

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickerSelect}
        theme={theme}
        selectedId={pickerTarget === "add" ? newItemCatId : pickerTarget}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 20, padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 10 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBtnText: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  addForm: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  fieldRow: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  inputSmall: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmBtnText: { color: "#FFF", fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  catPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  catPickerText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  empty: {
    alignItems: "center",
    padding: 20,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    marginBottom: 4,
    gap: 8,
  },
  emptyText: { textAlign: "center", fontSize: 13, lineHeight: 19 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemDesc: { fontFamily: "DMSans_500Medium", fontSize: 14, marginBottom: 2 },
  itemSub: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  itemAmt: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  editForm: { padding: 12, borderTopWidth: 1, marginBottom: 4, gap: 8 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  totalLabel: { fontFamily: "DMSans_500Medium", fontSize: 14 },
  totalValue: { fontFamily: "DMSans_700Bold", fontSize: 16 },
});
