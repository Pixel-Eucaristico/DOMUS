import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { DatePickerField } from "@/src/components/shared/DatePickerField";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { AccountPayload } from "@packages/events/src/types";
import { InvoiceImportedPayload } from "@packages/parsers";
import { EditableItem } from "@/src/hooks/useEditableItems";
import { CATEGORY_OPTIONS, GROUP_COLORS } from "@/src/constants/invoiceCategories";
import { AccountPicker } from "@/src/components/shared/AccountPicker";
import { CategoryChipScroll } from "@/src/components/shared/CategoryChipScroll";

interface Props {
  theme: ThemeColors;
  insets: EdgeInsets;
  importedData: InvoiceImportedPayload;
  editableItems: EditableItem[];
  editingIdx: number | null;
  isAddingItem: boolean;
  invoiceDateDisplay: string;
  computedTotal: number;
  selectedAccountId: string;
  accounts: AccountPayload[];
  newItemDesc: string;
  newItemQty: string;
  newItemUnit: string;
  newItemUnitPrice: string;
  newItemEan: string;
  newItemNcm: string;
  onEditingIdxChange: (idx: number | null) => void;
  onIsAddingItemChange: (v: boolean) => void;
  onInvoiceDateChange: (v: string) => void;
  onAccountSelect: (id: string) => void;
  onNewItemDescChange: (v: string) => void;
  onNewItemQtyChange: (v: string) => void;
  onNewItemUnitChange: (v: string) => void;
  onNewItemUnitPriceChange: (v: string) => void;
  onNewItemEanChange: (v: string) => void;
  onNewItemNcmChange: (v: string) => void;
  onEditField: (idx: number, field: any, value: string) => void;
  onRemoveItem: (idx: number) => void;
  onAddItem: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ParsedScreen({
  theme,
  insets,
  importedData,
  editableItems,
  editingIdx,
  isAddingItem,
  invoiceDateDisplay,
  computedTotal,
  selectedAccountId,
  accounts,
  newItemDesc,
  newItemQty,
  newItemUnit,
  newItemUnitPrice,
  newItemEan,
  newItemNcm,
  onEditingIdxChange,
  onIsAddingItemChange,
  onInvoiceDateChange,
  onAccountSelect,
  onNewItemDescChange,
  onNewItemQtyChange,
  onNewItemUnitChange,
  onNewItemUnitPriceChange,
  onNewItemEanChange,
  onNewItemNcmChange,
  onEditField,
  onRemoveItem,
  onAddItem,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Emitter card */}
        <View style={[s.emitterCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[s.emitterLabel, { color: theme.secondaryText }]}>Estabelecimento</Text>
          <Text style={[s.emitterName, { color: theme.textColor }]}>{importedData.emitter.name}</Text>
          <Text style={[s.emitterCnpj, { color: theme.secondaryText }]}>
            CNPJ: {importedData.emitter.cnpj}
          </Text>
          <View style={s.dateRow}>
            <DatePickerField
              label="Data da Nota"
              value={(() => {
                const m = invoiceDateDisplay.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (m) return `${m[3]}-${m[2]}-${m[1]}`;
                if (/^\d{4}-\d{2}-\d{2}$/.test(invoiceDateDisplay)) return invoiceDateDisplay;
                return new Date().toISOString().split("T")[0]!;
              })()}
              onChange={(iso) => {
                const [y, m, d] = iso.split("-");
                onInvoiceDateChange(`${d}/${m}/${y}`);
              }}
              theme={theme}
            />
          </View>
        </View>

        {/* Account picker */}
        <View style={s.accountSection}>
          <AccountPicker
            accounts={accounts}
            selectedId={selectedAccountId}
            theme={theme}
            label="Selecionar Conta"
            onSelect={onAccountSelect}
          />
        </View>

        {/* Items section */}
        <View style={s.itemsSection}>
          <View style={s.itemsSectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.textColor }]}>
              Produtos ({editableItems.length})
            </Text>
            <Pressable
              style={[
                s.addItemBtn,
                { borderColor: theme.primaryColor, backgroundColor: `${theme.primaryColor}15` },
              ]}
              onPress={() => {
                onIsAddingItemChange(!isAddingItem);
                onEditingIdxChange(null);
              }}
            >
              <Feather name={isAddingItem ? "minus" : "plus"} size={14} color={theme.primaryColor} />
              <Text style={[s.addItemBtnText, { color: theme.primaryColor }]}>
                {isAddingItem ? "Cancelar" : "Adicionar"}
              </Text>
            </Pressable>
          </View>

          {editableItems.length === 0 && !isAddingItem && (
            <View style={[s.emptyItems, { borderColor: theme.border }]}>
              <Feather name="package" size={32} color={theme.secondaryText} />
              <Text style={[s.emptyItemsText, { color: theme.secondaryText }]}>
                Nenhum produto encontrado.{"\n"}Adicione os produtos manualmente.
              </Text>
              <Pressable
                style={[
                  s.addItemBtn,
                  {
                    borderColor: theme.primaryColor,
                    backgroundColor: `${theme.primaryColor}15`,
                    alignSelf: "center",
                    marginTop: 8,
                  },
                ]}
                onPress={() => onIsAddingItemChange(true)}
              >
                <Feather name="plus" size={14} color={theme.primaryColor} />
                <Text style={[s.addItemBtnText, { color: theme.primaryColor }]}>
                  Adicionar Produto
                </Text>
              </Pressable>
            </View>
          )}

          {isAddingItem && (
            <View style={[s.addItemForm, { borderColor: theme.border }]}>
              <TextInput
                style={[s.editInput, { color: theme.textColor, borderColor: theme.border }]}
                value={newItemDesc}
                onChangeText={onNewItemDescChange}
                placeholder="Descrição do produto"
                placeholderTextColor={theme.secondaryText}
              />
              <View style={s.addItemRow}>
                <TextInput
                  style={[
                    s.editInputSmall,
                    { color: theme.textColor, borderColor: theme.border, flex: 1 },
                  ]}
                  value={newItemQty}
                  onChangeText={onNewItemQtyChange}
                  placeholder="Qtd"
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[
                    s.editInputSmall,
                    { color: theme.textColor, borderColor: theme.border, flex: 1 },
                  ]}
                  value={newItemUnit}
                  onChangeText={onNewItemUnitChange}
                  placeholder="UN"
                  placeholderTextColor={theme.secondaryText}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={[
                    s.editInputSmall,
                    { color: theme.textColor, borderColor: theme.border, flex: 2 },
                  ]}
                  value={newItemUnitPrice}
                  onChangeText={onNewItemUnitPriceChange}
                  placeholder="Preço unit."
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={s.addItemRow}>
                <TextInput
                  style={[
                    s.editInputSmall,
                    { color: theme.textColor, borderColor: theme.border, flex: 1 },
                  ]}
                  value={newItemEan}
                  onChangeText={onNewItemEanChange}
                  placeholder="EAN (opcional)"
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="number-pad"
                  maxLength={14}
                />
                <TextInput
                  style={[
                    s.editInputSmall,
                    { color: theme.textColor, borderColor: theme.border, flex: 1 },
                  ]}
                  value={newItemNcm}
                  onChangeText={onNewItemNcmChange}
                  placeholder="NCM (opcional)"
                  placeholderTextColor={theme.secondaryText}
                  keyboardType="number-pad"
                  maxLength={8}
                />
              </View>
              <Pressable
                style={[s.confirmItemBtn, { backgroundColor: theme.primaryColor }]}
                onPress={onAddItem}
              >
                <Feather name="check" size={16} color="#FFF" />
                <Text style={s.confirmItemBtnText}>Confirmar</Text>
              </Pressable>
            </View>
          )}

          {editableItems.map((item, index) => (
            <View key={item._id}>
              <View style={[s.itemRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.itemDescription, { color: theme.textColor }]}>
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
                      Cód: {item.productCode}
                    </Text>
                  ) : null}
                  {(() => {
                    const cat = CATEGORY_OPTIONS.find((c) => c.id === item.categoryId);
                    if (!cat) return null;
                    const color = GROUP_COLORS[cat.group];
                    return (
                      <View style={[s.categoryChip, { backgroundColor: color + "22" }]}>
                        <View style={[s.categoryDot, { backgroundColor: color }]} />
                        <Text style={[s.categoryChipText, { color }]}>{cat.name}</Text>
                      </View>
                    );
                  })()}
                </View>
                <Text style={[s.itemPrice, { color: theme.textColor }]}>
                  R$ {item.totalPrice.toFixed(2)}
                </Text>
                <Pressable
                  onPress={() => onEditingIdxChange(editingIdx === index ? null : index)}
                  hitSlop={8}
                  style={{ marginLeft: 8 }}
                >
                  <Feather name="edit-2" size={16} color={theme.primaryColor} />
                </Pressable>
                <Pressable
                  onPress={() => onRemoveItem(index)}
                  hitSlop={8}
                  style={{ marginLeft: 8 }}
                >
                  <Feather name="trash-2" size={16} color={theme.danger} />
                </Pressable>
              </View>

              {editingIdx === index && (
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
                  <View style={s.addItemRow}>
                    <TextInput
                      style={[
                        s.editInputSmall,
                        { color: theme.textColor, borderColor: theme.border, flex: 1 },
                      ]}
                      value={String(item.quantity)}
                      onChangeText={(v) => onEditField(index, "quantity", v)}
                      placeholder="Qtd"
                      placeholderTextColor={theme.secondaryText}
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[
                        s.editInputSmall,
                        { color: theme.textColor, borderColor: theme.border, flex: 1 },
                      ]}
                      value={item.unit || ""}
                      onChangeText={(v) => onEditField(index, "unit", v)}
                      placeholder="UN"
                      placeholderTextColor={theme.secondaryText}
                      autoCapitalize="characters"
                    />
                    <TextInput
                      style={[
                        s.editInputSmall,
                        { color: theme.textColor, borderColor: theme.border, flex: 2 },
                      ]}
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
                    placeholder="EAN / código de barras (opcional)"
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[s.editInput, { color: theme.textColor, borderColor: theme.border }]}
                    value={item.ncm || ""}
                    onChangeText={(v) => onEditField(index, "ncm", v)}
                    placeholder="NCM — 8 dígitos (opcional)"
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
                    onPress={() => onEditingIdxChange(null)}
                  >
                    <Text style={{ color: theme.primaryColor, fontWeight: "600" }}>Fechar</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          s.footer,
          { backgroundColor: theme.cardBackground, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={s.totalRow}>
          <Text style={[s.totalLabel, { color: theme.secondaryText }]}>Total da Nota</Text>
          <Text style={[s.totalAmount, { color: theme.primaryColor }]}>
            R${" "}
            {(editableItems.length > 0 ? computedTotal : importedData.totalAmount).toFixed(2)}
          </Text>
        </View>
        <View style={s.actionRow}>
          <Pressable style={[s.cancelBtn, { borderColor: theme.border }]} onPress={onCancel}>
            <Text style={[s.cancelBtnText, { color: theme.textColor }]}>Cancelar</Text>
          </Pressable>
          <Pressable style={[s.confirmBtn, { backgroundColor: theme.primaryColor }]} onPress={onConfirm}>
            <Text style={s.confirmBtnText}>Confirmar Importação</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 140 },
  emitterCard: { margin: 20, padding: 20, borderRadius: 16 },
  emitterLabel: { fontSize: 12, textTransform: "uppercase", marginBottom: 4 },
  emitterName: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  emitterCnpj: { fontSize: 13 },
  dateRow: { marginTop: 12 },
  dateInput: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
  },
  accountSection: { paddingHorizontal: 20, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  itemsSection: { paddingHorizontal: 20 },
  itemsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  addItemBtnText: { fontSize: 12, fontWeight: "500" },
  emptyItems: {
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    marginBottom: 12,
    gap: 8,
  },
  emptyItemsText: { textAlign: "center", fontSize: 14, lineHeight: 20 },
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemDescription: { fontSize: 15, fontWeight: "500", marginBottom: 3 },
  itemSub: { fontSize: 13 },
  itemMeta: { fontSize: 11, marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: "600" },
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
  editSectionLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  footer: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: { fontSize: 16, fontWeight: "500" },
  totalAmount: { fontSize: 26, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  confirmBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  confirmBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
