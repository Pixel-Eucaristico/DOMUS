import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import {
  EXPENSE_CATEGORIES,
  ManualItem,
  itemTotal,
} from "@/src/constants/transactionCategories";
import { CategoryPickerModal } from "@/src/components/shared/CategoryPickerModal";
import { soundManager } from "@/src/services/SoundManager";
import { TButton, TInput } from "@/src/components/tamagui";
import { getCategoryDisplayName, getCategoryColor, getGroupColor, getGroupLabel, getCategoryGroup } from "@/src/utils/categoryHelpers";

const DEFAULT_CATEGORY_ID = EXPENSE_CATEGORIES[0]!.id;

interface ItemsSectionProps {
  items: ManualItem[];
  theme: ThemeColors;
  onAddItem: (item: Omit<ManualItem, "id">) => void;
  onRemoveItem: (id: string) => void;
  onEditItemField: (id: string, field: keyof ManualItem, value: string) => void;
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
      Alert.alert("Item inválido", "Informe descrição, quantidade e preço unitário.");
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
      // Editing existing item — sempre atualiza a subcategoria (vazio limpa) e
      // reseta o override manual, pois a nova categoria redefine o grupo padrão
      onEditItemField(pickerTarget, "categoryId", categoryId);
      onEditItemField(pickerTarget, "subcategoryId", subcategoryId ?? "");
      onEditItemField(pickerTarget, "groupOverride", "");
    }
  };

  const getColor = (catId: string) => getCategoryColor(catId);

  return (
    <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.label, { color: theme.secondaryText, marginBottom: 0 }]}>
          Produtos ({items.length})
        </Text>
        <TButton
          variant={showAddItem ? "outline" : "ghost"}
          size="$sm"
          borderColor={showAddItem ? theme.border : undefined}
          color={theme.primaryColor}
          icon={<Feather name={showAddItem ? "minus" : "plus"} size={14} color={theme.primaryColor} />}
          onPress={() => {
            soundManager.play("pop");
            setShowAddItem((v) => !v);
            setEditingItemId(null);
          }}
        >
          {showAddItem ? "Cancelar" : "Adicionar"}
        </TButton>
      </View>

      {/* Add form */}
      {showAddItem && (
        <View style={[s.addForm, { borderColor: theme.border }]}>
          <TInput
            value={newItemDesc}
            onChangeText={setNewItemDesc}
            placeholder="Descrição do produto"
            color={theme.textColor}
            backgroundColor={theme.cardBackground}
            borderColor={theme.border}
          />
          <View style={s.fieldRow}>
            <TInput
              flex={1}
              value={newItemQty}
              onChangeText={setNewItemQty}
              placeholder="Qtd"
              keyboardType="decimal-pad"
              height={38}
              fontSize={13}
              paddingHorizontal="$md"
              color={theme.textColor}
              backgroundColor={theme.cardBackground}
              borderColor={theme.border}
            />
            <TInput
              flex={1}
              value={newItemUnit}
              onChangeText={setNewItemUnit}
              placeholder="UN"
              autoCapitalize="characters"
              height={38}
              fontSize={13}
              paddingHorizontal="$md"
              color={theme.textColor}
              backgroundColor={theme.cardBackground}
              borderColor={theme.border}
            />
            <TInput
              flex={2}
              value={newItemUnitPrice}
              onChangeText={setNewItemUnitPrice}
              placeholder="Preco unit."
              keyboardType="decimal-pad"
              height={38}
              fontSize={13}
              paddingHorizontal="$md"
              color={theme.textColor}
              backgroundColor={theme.cardBackground}
              borderColor={theme.border}
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
            <TInput
              flex={1}
              value={newItemEan}
              onChangeText={setNewItemEan}
              placeholder="EAN (opcional)"
              keyboardType="number-pad"
              maxLength={14}
              height={38}
              fontSize={13}
              paddingHorizontal="$md"
              color={theme.textColor}
              backgroundColor={theme.cardBackground}
              borderColor={theme.border}
            />
            <TInput
              flex={1}
              value={newItemNcm}
              onChangeText={setNewItemNcm}
              placeholder="NCM (opcional)"
              keyboardType="number-pad"
              maxLength={8}
              height={38}
              fontSize={13}
              paddingHorizontal="$md"
              color={theme.textColor}
              backgroundColor={theme.cardBackground}
              borderColor={theme.border}
            />
          </View>
          <TButton
            variant="primary"
            backgroundColor={theme.primaryColor}
            icon={<Feather name="check" size={16} color="#FFF" />}
            onPress={handleConfirmAdd}
          >
            Confirmar
          </TButton>
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
                    const group = item.groupOverride ?? getCategoryGroup(item.categoryId, item.subcategoryId);
                    const gc = getGroupColor(group);
                    // Toque alterna Necessidade ↔ Desejo (override manual por produto)
                    const nextGroup = group === "needs" ? "wants" : "needs";
                    return (
                      <Pressable
                        onPress={() => {
                          soundManager.play("tap");
                          onEditItemField(item.id, "groupOverride", nextGroup);
                        }}
                        style={[s.groupBadge, { backgroundColor: `${gc}18` }]}
                      >
                        <Feather name="refresh-cw" size={9} color={gc} />
                        <Text style={[s.groupBadgeText, { color: gc }]}>{getGroupLabel(group)}</Text>
                      </Pressable>
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
                <TInput
                  value={item.description}
                  onChangeText={(v: string) => onEditItemField(item.id, "description", v)}
                  placeholder="Descrição"
                  color={theme.textColor}
                  backgroundColor={theme.cardBackground}
                  borderColor={theme.border}
                />
                <View style={s.fieldRow}>
                  <TInput
                    flex={1}
                    value={item.quantity}
                    onChangeText={(v: string) => onEditItemField(item.id, "quantity", v)}
                    placeholder="Qtd"
                    keyboardType="decimal-pad"
                    height={38}
                    fontSize={13}
                    paddingHorizontal="$md"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                  <TInput
                    flex={1}
                    value={item.unit}
                    onChangeText={(v: string) => onEditItemField(item.id, "unit", v)}
                    placeholder="UN"
                    autoCapitalize="characters"
                    height={38}
                    fontSize={13}
                    paddingHorizontal="$md"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                  <TInput
                    flex={2}
                    value={item.unitPrice}
                    onChangeText={(v: string) => onEditItemField(item.id, "unitPrice", v)}
                    placeholder="Preco unit."
                    keyboardType="decimal-pad"
                    height={38}
                    fontSize={13}
                    paddingHorizontal="$md"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
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
                  <TInput
                    flex={1}
                    value={item.ean ?? ""}
                    onChangeText={(v: string) => onEditItemField(item.id, "ean", v)}
                    placeholder="EAN"
                    keyboardType="number-pad"
                    maxLength={14}
                    height={38}
                    fontSize={13}
                    paddingHorizontal="$md"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                  <TInput
                    flex={1}
                    value={item.ncm ?? ""}
                    onChangeText={(v: string) => onEditItemField(item.id, "ncm", v)}
                    placeholder="NCM"
                    keyboardType="number-pad"
                    maxLength={8}
                    height={38}
                    fontSize={13}
                    paddingHorizontal="$md"
                    color={theme.textColor}
                    backgroundColor={theme.cardBackground}
                    borderColor={theme.border}
                  />
                </View>
                <TButton
                  variant="ghost"
                  size="$sm"
                  color={theme.primaryColor}
                  alignSelf="flex-end"
                  marginTop={6}
                  onPress={() => setEditingItemId(null)}
                >
                  Fechar
                </TButton>
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
  addForm: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  fieldRow: { flexDirection: "row", gap: 8 },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
