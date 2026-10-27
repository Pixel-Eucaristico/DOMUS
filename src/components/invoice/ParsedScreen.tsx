import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { DatePickerField } from "@/src/components/shared/DatePickerField";
import { KeyboardStickyView, useKeyboardState } from "react-native-keyboard-controller";
import {
  KeyboardAwareScrollViewCompat,
  SCROLL_BOTTOM_PADDING,
} from "@/components/KeyboardAwareScrollViewCompat";
import { computeParsedFooterLayout, hasPendingNewItem } from "./parsedFooterLayout";
import { appConfirm } from "@/src/services/appAlert";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { EdgeInsets } from "react-native-safe-area-context";
import { AccountPayload } from "@packages/events/src/types";
import { InvoiceImportedPayload } from "@packages/parsers";
import { EditableItem } from "@/src/hooks/useEditableItems";
import { AccountPicker } from "@/src/components/shared/AccountPicker";
import { AddItemForm } from "./AddItemForm";
import { EditableItemRow } from "./EditableItemRow";
import { soundManager } from "@/src/services/SoundManager";
import { TButton } from "@/src/components/tamagui";

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
  // Com o teclado aberto o rodapé sobe e cobre a faixa logo acima do teclado:
  // o campo focado precisa parar acima dele, e em janela baixa o rodapé deixa
  // de subir (cálculo em parsedFooterLayout.ts).
  const [footerHeight, setFooterHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardState((state) => state.height);
  const footerLayout = computeParsedFooterLayout({
    windowHeight,
    keyboardHeight,
    scrollTop,
    footerHeight,
    insetBottom: insets.bottom,
  });

  const handleConfirm = async () => {
    if (editableItems.length === 0) {
      soundManager.play("error");
      return;
    }
    const pending = hasPendingNewItem({
      isAddingItem,
      desc: newItemDesc,
      unitPrice: newItemUnitPrice,
      ean: newItemEan,
      ncm: newItemNcm,
    });
    if (pending) {
      const ok = await appConfirm({
        title: "Importar sem o item em edição?",
        message: "O item em edição não foi adicionado. Se importar agora, ele fica de fora da nota.",
        confirmLabel: "Importar mesmo assim",
        cancelLabel: "Voltar",
      });
      if (!ok) return;
    }
    soundManager.play("success");
    onConfirm();
  };

  return (
    <View
      ref={containerRef}
      style={s.container}
      onLayout={() => containerRef.current?.measureInWindow((_x, y) => setScrollTop(y))}
    >
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={s.scroll}
        bottomOffset={footerLayout.bottomOffset}
      >
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
                soundManager.play("pop");
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
                onPress={() => { soundManager.play("pop"); onIsAddingItemChange(true); }}
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
      </KeyboardAwareScrollViewCompat>

      {/* Footer: total + ações. KeyboardStickyView sobe junto com o teclado
          (edge-to-edge não redimensiona a janela; Story 13.2, D-1). A altura do
          teclado já inclui a barra de navegação, então `opened` desconta o
          paddingBottom (nunca mais que o próprio teclado). Em janela baixa o
          rodapé não sobe (`enabled` falso). */}
      <KeyboardStickyView
        style={[
          s.footer,
          { backgroundColor: theme.cardBackground, paddingBottom: insets.bottom + 20 },
        ]}
        enabled={footerLayout.stickyEnabled}
        offset={{ closed: 0, opened: footerLayout.openedOffset }}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        <View style={s.totalRow}>
          <Text style={[s.totalLabel, { color: theme.secondaryText }]}>Total da Nota</Text>
          <Text style={[s.totalAmount, { color: theme.primaryColor }]}>
            R${" "}
            {(editableItems.length > 0 ? computedTotal : importedData.totalAmount).toFixed(2)}
          </Text>
        </View>
        <View style={s.actionRow}>
          <TButton variant="outline" borderColor={theme.border} color={theme.textColor} onPress={() => { soundManager.play("tap"); onCancel(); }} flex={1}>
            Cancelar
          </TButton>
          <TButton
            variant="primary"
            flex={2}
            backgroundColor={theme.primaryColor}
            opacity={editableItems.length === 0 ? 0.5 : 1}
            onPress={() => { void handleConfirm(); }}
          >
            Confirmar Importação
          </TButton>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: SCROLL_BOTTOM_PADDING },
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
});
