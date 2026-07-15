import { useState, useEffect } from "react";
import {
  InvoiceItem,
  InvoiceImportedPayload,
  classifyItemFull,
} from "@packages/parsers";
import type { ClassifyItemOptions } from "@packages/parsers";
import type { CategoryGroup } from "@packages/events/src/types";

export type EditableItem = InvoiceItem & {
  _id: string;
  categoryId: string;
  subcategoryId?: string;
  groupOverride?: CategoryGroup;
};

export interface UseEditableItemsResult {
  editableItems: EditableItem[];
  editingIdx: number | null;
  setEditingIdx: (idx: number | null) => void;
  isAddingItem: boolean;
  setIsAddingItem: (v: boolean) => void;
  newItemDesc: string;
  setNewItemDesc: (v: string) => void;
  newItemQty: string;
  setNewItemQty: (v: string) => void;
  newItemUnit: string;
  setNewItemUnit: (v: string) => void;
  newItemUnitPrice: string;
  setNewItemUnitPrice: (v: string) => void;
  newItemEan: string;
  setNewItemEan: (v: string) => void;
  newItemNcm: string;
  setNewItemNcm: (v: string) => void;
  invoiceDateDisplay: string;
  setInvoiceDateDisplay: (v: string) => void;
  computedTotal: number;
  handleRemoveEditableItem: (idx: number) => void;
  handleEditField: (idx: number, field: keyof InvoiceItem | "categoryId" | "subcategoryId" | "groupOverride", value: string) => void;
  handleAddEditableItem: () => void;
}

export function useEditableItems(
  importedData: InvoiceImportedPayload | null,
  classifyOptions?: ClassifyItemOptions,
): UseEditableItemsResult {
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [invoiceDateDisplay, setInvoiceDateDisplay] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("UN");
  const [newItemUnitPrice, setNewItemUnitPrice] = useState("");
  const [newItemEan, setNewItemEan] = useState("");
  const [newItemNcm, setNewItemNcm] = useState("");

  // Ao receber dados importados, inicializa data e classifica itens
  useEffect(() => {
    if (!importedData) return;

    const iso = importedData.date.split("T")[0] ?? new Date().toISOString().split("T")[0]!;
    const [y, m, d] = iso.split("-");
    setInvoiceDateDisplay(`${d}/${m}/${y}`);

    Promise.all(
      importedData.items.map(async (item, i) => {
        // Pipeline completo: NCM → EAN → IA → keyword
        const result = await classifyItemFull(
          { name: item.description, ncm: item.ncm, ean: item.ean },
          classifyOptions ?? {},
        );
        return {
          ...item,
          _id: String(i),
          categoryId: result.categoryId,
          subcategoryId: result.subcategoryId,
          // O classificador nunca define override — é sempre correção manual do usuário
          groupOverride: undefined,
        };
      }),
    ).then(setEditableItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- classificação deve rodar uma vez por importedData; classifyOptions é recriado pelo chamador e reexecutar refaria chamadas de IA
  }, [importedData]);

  const computedTotal = editableItems.reduce((s, i) => s + i.totalPrice, 0);

  const handleRemoveEditableItem = (idx: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const handleEditField = (idx: number, field: keyof InvoiceItem | "categoryId" | "subcategoryId" | "groupOverride", value: string) => {
    setEditableItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item };
        if (field === "description") {
          updated.description = value;
        } else if (field === "quantity") {
          const q = parseFloat(value.replace(",", ".")) || 0;
          updated.quantity = q;
          updated.totalPrice = Math.round(q * item.unitPrice * 100) / 100;
        } else if (field === "unitPrice") {
          const p = parseFloat(value.replace(",", ".")) || 0;
          updated.unitPrice = p;
          updated.totalPrice = Math.round(item.quantity * p * 100) / 100;
        } else if (field === "unit") {
          updated.unit = value || undefined;
        } else if (field === "ean") {
          updated.ean = value.replace(/\D/g, "") || undefined;
        } else if (field === "ncm") {
          updated.ncm = value.replace(/\D/g, "").substring(0, 8) || undefined;
        } else if (field === "categoryId") {
          (updated as EditableItem).categoryId = value;
        } else if (field === "subcategoryId") {
          (updated as EditableItem).subcategoryId = value || undefined;
        } else if (field === "groupOverride") {
          // String vazia limpa o override (volta ao grupo automático)
          (updated as EditableItem).groupOverride = (value || undefined) as CategoryGroup | undefined;
        }
        return updated;
      }),
    );
  };

  const handleAddEditableItem = () => {
    const qty = parseFloat(newItemQty.replace(",", ".")) || 1;
    const price = parseFloat(newItemUnitPrice.replace(",", ".")) || 0;
    if (!newItemDesc.trim()) return;
    const newItem: EditableItem = {
      _id: Date.now().toString(),
      description: newItemDesc.trim(),
      quantity: qty,
      unit: newItemUnit.trim() || "UN",
      unitPrice: price,
      totalPrice: Math.round(qty * price * 100) / 100,
      ean: newItemEan.replace(/\D/g, "") || undefined,
      ncm: newItemNcm.replace(/\D/g, "").substring(0, 8) || undefined,
      categoryId: "outros",
    };
    setEditableItems((prev) => [...prev, newItem]);
    setNewItemDesc("");
    setNewItemQty("1");
    setNewItemUnit("UN");
    setNewItemUnitPrice("");
    setNewItemEan("");
    setNewItemNcm("");
    setIsAddingItem(false);
  };

  return {
    editableItems,
    editingIdx,
    setEditingIdx,
    isAddingItem,
    setIsAddingItem,
    newItemDesc,
    setNewItemDesc,
    newItemQty,
    setNewItemQty,
    newItemUnit,
    setNewItemUnit,
    newItemUnitPrice,
    setNewItemUnitPrice,
    newItemEan,
    setNewItemEan,
    newItemNcm,
    setNewItemNcm,
    invoiceDateDisplay,
    setInvoiceDateDisplay,
    computedTotal,
    handleRemoveEditableItem,
    handleEditField,
    handleAddEditableItem,
  };
}
