import { useState } from "react";
import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import {
  createTransactionEvent,
  updateTransactionEvent,
  deleteTransactionEvent,
} from "@packages/domain/src/transactions";
import type {
  TransactionItem,
  TransactionPayload,
  TransactionType,
  TransactionStatus,
  RecurrenceType,
  CategoryCreatedEvent,
} from "@packages/events/src/types";
import { createEvent, generateId } from "@packages/events/src/factory";
import { EVENT_TYPES } from "@packages/events/src/types";
import {
  getCategoriesForType,
  TRANSACTION_CATEGORIES,
  ManualItem,
  itemTotal,
} from "@/src/constants/transactionCategories";

export interface UseTransactionFormResult {
  editingTx: TransactionPayload | null;
  txType: TransactionType;
  setTxType: (v: TransactionType) => void;
  amount: string;
  setAmount: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  selectedCategory: number;
  setSelectedCategory: (v: number) => void;
  installments: string;
  setInstallments: (v: string) => void;
  selectedAccountId: string;
  setSelectedAccountId: (v: string) => void;
  targetAccountId: string;
  setTargetAccountId: (v: string) => void;
  status: TransactionStatus;
  setStatus: (v: TransactionStatus) => void;
  recurrence: RecurrenceType;
  setRecurrence: (v: RecurrenceType) => void;
  recurrenceDays: string;
  setRecurrenceDays: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  manualItems: ManualItem[];
  itemsTotal: number;
  handleAddItem: (item: Omit<ManualItem, "id">) => void;
  handleRemoveItem: (id: string) => void;
  handleEditItemField: (id: string, field: keyof ManualItem, value: string | number) => void;
  handleSave: () => void;
  handleDelete: () => void;
  handleConfirm: () => void;
}

export function useTransactionForm(txId?: string, onSuccess?: () => void): UseTransactionFormResult {
  const router = useRouter();
  const { domain, dispatchDomainEvent, dispatch } = useAppState();

  const editingTx = txId ? (domain.transactions[txId] ?? null) : null;

  const [txType, setTxTypeRaw] = useState<TransactionType>(editingTx?.type ?? "expense");
  const [amount, setAmount] = useState(editingTx?.amount.toString() ?? "");
  const [description, setDescription] = useState(editingTx?.description ?? "");
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (editingTx) {
      const cat = domain.categories[editingTx.categoryId];
      const typeCats = getCategoriesForType(editingTx.type);
      const idx = typeCats.findIndex((o) => o.name === cat?.name);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });
  const [installments, setInstallments] = useState(editingTx?.installments?.toString() ?? "1");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(editingTx?.accountId ?? "");
  const [targetAccountId, setTargetAccountId] = useState<string>(editingTx?.targetAccountId ?? "");
  const [status, setStatus] = useState<TransactionStatus>(editingTx?.status ?? "confirmed");
  const [recurrence, setRecurrence] = useState<RecurrenceType>(editingTx?.recurrence ?? "once");
  const [recurrenceDays, setRecurrenceDays] = useState<string>(
    editingTx?.recurrenceDays?.toString() ?? ""
  );
  const [date, setDate] = useState<string>(
    editingTx?.date ?? new Date().toISOString().split("T")[0]!
  );
  const [manualItems, setManualItems] = useState<ManualItem[]>(() => {
    if (!editingTx?.items || editingTx.items.length === 0) return [];
    return editingTx.items.map((item) => {
      const cat = Object.values(domain.categories).find((c) => c.id === item.categoryId);
      const localCat = TRANSACTION_CATEGORIES.find((c) => c.name === cat?.name);
      return {
        id: generateId(),
        description: item.description,
        quantity: "1",
        unit: "UN",
        unitPrice: item.amount.toString(),
        categoryId: localCat?.id ?? TRANSACTION_CATEGORIES[0]!.id,
        ean: item.ean,
        ncm: item.ncm,
      };
    });
  });

  // Reset category index when type changes so stale index doesn't point to wrong list
  const setTxType = (v: TransactionType) => {
    setTxTypeRaw(v);
    setSelectedCategory(0);
  };

  const accounts = Object.values(domain.accounts);
  const defaultAccountId = selectedAccountId || accounts[0]?.id || "";
  const computedItemsTotal = manualItems.reduce((s, i) => s + itemTotal(i), 0);

  const handleAddItem = (item: Omit<ManualItem, "id">) => {
    setManualItems((prev) => [...prev, { ...item, id: generateId() }]);
  };

  const handleRemoveItem = (id: string) => {
    setManualItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleEditItemField = (id: string, field: keyof ManualItem, value: string | number) => {
    setManualItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleDelete = () => {
    if (!txId) return;
    Alert.alert(
      "Excluir transacao",
      "Tem certeza que deseja remover esta transacao?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            const event = deleteTransactionEvent(txId);
            dispatchDomainEvent(event);
            soundManager.play("trash");
            if (onSuccess) onSuccess(); else router.back();
          },
        },
      ],
    );
  };

  /** Efetiva uma transação pendente */
  const handleConfirm = () => {
    if (!txId) return;
    const today = new Date().toISOString().split("T")[0]!;
    const event = updateTransactionEvent(txId, { status: "confirmed", date: today });
    dispatchDomainEvent(event);
    soundManager.play("success");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSave = () => {
    const useItemsTotal = txType === "expense" && manualItems.length > 0;
    const amountNum = useItemsTotal ? computedItemsTotal : parseFloat(amount.replace(",", "."));

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Valor invalido", "Informe um valor maior que zero.");
      return;
    }
    if (!defaultAccountId) {
      Alert.alert("Sem conta", "Crie uma conta primeiro na aba Contas.");
      return;
    }

    const typeCats = getCategoriesForType(txType);
    const cat = typeCats[selectedCategory] ?? typeCats[0]!;

    // Find or create category in domain
    const existingCat = Object.values(domain.categories).find((c) => c.name === cat.name);
    let catId: string;
    if (existingCat) {
      catId = existingCat.id;
    } else {
      catId = generateId();
      const catEvent = createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
        id: catId,
        name: cat.name,
        group: cat.group,
      });
      dispatch(catEvent);
    }

    let txItems: TransactionItem[] | undefined;
    if (useItemsTotal) {
      txItems = manualItems.map((mi) => {
        const itemCat =
          TRANSACTION_CATEGORIES.find((c) => c.id === mi.categoryId) ?? TRANSACTION_CATEGORIES[0]!;
        const existingItemCat = Object.values(domain.categories).find(
          (c) => c.name === itemCat.name,
        );
        let itemCatId: string;
        if (existingItemCat) {
          itemCatId = existingItemCat.id;
        } else {
          itemCatId = generateId();
          const ev = createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
            id: itemCatId,
            name: itemCat.name,
            group: itemCat.group,
          });
          dispatch(ev);
        }
        return {
          description: mi.description,
          amount: itemTotal(mi),
          categoryId: itemCatId,
          ean: mi.ean || undefined,
          ncm: mi.ncm || undefined,
        };
      });
    }

    const recurrenceDaysNum =
      recurrence === "custom" ? parseInt(recurrenceDays, 10) || undefined : undefined;

    if (txId) {
      const event = updateTransactionEvent(txId, {
        accountId: defaultAccountId,
        type: txType,
        amount: amountNum,
        categoryId: catId,
        date,
        description: description || cat.name,
        targetAccountId: txType === "transfer" ? targetAccountId || undefined : undefined,
        items: txItems,
        status,
        recurrence,
        recurrenceDays: recurrenceDaysNum,
      });
      dispatchDomainEvent(event);
    } else {
      const installmentNum = parseInt(installments, 10) || 1;

      const events = createTransactionEvent({
        accountId: defaultAccountId,
        type: txType,
        amount: amountNum,
        categoryId: catId,
        date,
        description: description || cat.name,
        installments: installmentNum,
        targetAccountId: txType === "transfer" ? targetAccountId || undefined : undefined,
        items: txItems,
        status,
        recurrence,
        recurrenceDays: recurrenceDaysNum,
      });

      for (const evt of events) {
        dispatchDomainEvent(evt);
      }
    }

    soundManager.play("success");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (onSuccess) onSuccess(); else router.back();
  };

  return {
    editingTx,
    txType,
    setTxType,
    amount,
    setAmount,
    description,
    setDescription,
    selectedCategory,
    setSelectedCategory,
    installments,
    setInstallments,
    selectedAccountId,
    setSelectedAccountId,
    targetAccountId,
    setTargetAccountId,
    status,
    setStatus,
    recurrence,
    setRecurrence,
    recurrenceDays,
    setRecurrenceDays,
    date,
    setDate,
    manualItems,
    itemsTotal: computedItemsTotal,
    handleAddItem,
    handleRemoveItem,
    handleEditItemField,
    handleSave,
    handleDelete,
    handleConfirm,
  };
}
