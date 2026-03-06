import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { DatePickerField } from "@/src/components/shared/DatePickerField";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { AccountPayload } from "@packages/events/src/types";
import { InvoiceImportedPayload } from "@packages/parsers";
import { EditableItem } from "@/src/hooks/useEditableItems";
import { AccountPicker } from "@/src/components/shared/AccountPicker";
import { AddItemForm } from "./AddItemForm";
import { EditableItemRow } from "./EditableItemRow";

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
            <AddItemForm
              theme={theme}
              desc={newItemDesc}
              qty={newItemQty}
              unit={newItemUnit}
              unitPrice={newItemUnitPrice}
              ean={newItemEan}
              ncm={newItemNcm}
              onDescChange={onNewItemDescChange}
              onQtyChange={onNewItemQtyChange}
              onUnitChange={onNewItemUnitChange}
              onUnitPriceChange={onNewItemUnitPriceChange}
              onEanChange={onNewItemEanChange}
              onNcmChange={onNewItemNcmChange}
              onConfirm={onAddItem}
            />
          )}

          {editableItems.map((item, index) => (
            <EditableItemRow
              key={item._id}
              item={item}
              index={index}
              isEditing={editingIdx === index}
              theme={theme}
              onToggleEdit={onEditingIdxChange}
              onEditField={onEditField}
              onRemove={onRemoveItem}
            />
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
            <Text style={s.confirmBtnText}>Confirmar Importacao</Text>
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
