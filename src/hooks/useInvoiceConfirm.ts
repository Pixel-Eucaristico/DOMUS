import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  InvoiceImportedPayload,
  createInvoiceImportedEvent,
  createInvoiceConfirmedEvent,
} from "@packages/parsers";
import { createTransactionEvent } from "@packages/domain/src/transactions";
import { createEvent } from "@packages/events/src/factory";
import { EVENT_TYPES, type CategoryCreatedEvent } from "@packages/events/src/types";
import { useAppState } from "@/src/context/AppStateProvider";
import { CATEGORY_OPTIONS } from "@/src/constants/invoiceCategories";
import { EditableItem } from "./useEditableItems";

export function useInvoiceConfirm(
  importedData: InvoiceImportedPayload | null,
  editableItems: EditableItem[],
  computedTotal: number,
  invoiceDateDisplay: string,
  selectedAccountId: string,
) {
  const router = useRouter();
  const { domain, dispatch, dispatchDomainEvent } = useAppState();

  const confirmImport = useCallback(() => {
    if (!importedData || !selectedAccountId) {
      Alert.alert("Erro", "Selecione uma conta para importar.");
      return;
    }

    const importEvent = createInvoiceImportedEvent(importedData);

    const itemsToProcess = editableItems.length > 0 ? editableItems : importedData.items;
    const totalToUse =
      editableItems.length > 0
        ? Math.round(computedTotal * 100) / 100
        : importedData.totalAmount;

    const transactionItems = itemsToProcess.map((item) => {
      const editable = item as EditableItem;
      return {
        description: item.description,
        amount: item.totalPrice,
        categoryId: editable.categoryId || "outros",
        subcategoryId: editable.subcategoryId || undefined,
        groupOverride: editable.groupOverride || undefined,
        ean: item.ean || undefined,
        ncm: item.ncm || undefined,
      };
    });

    // Calcular categoria predominante (excluindo frete/desconto/entrega)
    const categoryTotals: Record<string, number> = {};
    transactionItems.forEach((item) => {
      const desc = item.description.toLowerCase();
      if (!desc.includes("frete") && !desc.includes("entrega") && !desc.includes("desconto")) {
        categoryTotals[item.categoryId] = (categoryTotals[item.categoryId] || 0) + item.amount;
      }
    });
    const predominantCategoryId = Object.keys(categoryTotals).sort(
      (a, b) => categoryTotals[b]! - categoryTotals[a]!,
    )[0];

    // Reclassificar frete/desconto para a categoria predominante
    if (predominantCategoryId) {
      transactionItems.forEach((item) => {
        const desc = item.description.toLowerCase();
        if (desc.includes("frete") || desc.includes("entrega") || desc.includes("desconto")) {
          item.categoryId = predominantCategoryId;
        }
      });
    }

    const uniqueCategories = new Set(transactionItems.map((i) => i.categoryId));
    const categoryId =
      uniqueCategories.size > 1
        ? "compras_diversas"
        : transactionItems[0]?.categoryId || "outros";

    // Garante que as categorias constantes referenciadas existam no domínio —
    // sem o CATEGORY_CREATED, o cálculo 50/30/20 não conhece o grupo delas.
    for (const catId of new Set([categoryId, ...transactionItems.map((i) => i.categoryId)])) {
      if (domain.categories[catId]) continue;
      const option = CATEGORY_OPTIONS.find((c) => c.id === catId);
      if (!option) continue;
      dispatch(
        createEvent<CategoryCreatedEvent>(EVENT_TYPES.CATEGORY_CREATED, {
          id: option.id,
          name: option.name,
          group: option.group,
        }),
      );
    }

    // Converter DD/MM/AAAA → YYYY-MM-DD
    const parseDateDisplay = (s: string) => {
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      return importedData!.date.split("T")[0]!;
    };

    const transactionPayload = {
      accountId: selectedAccountId,
      type: "expense" as const,
      amount: totalToUse,
      categoryId,
      date: parseDateDisplay(invoiceDateDisplay),
      description: importedData.emitter.name,
      items: transactionItems,
    };

    const transactionEvents = createTransactionEvent(transactionPayload);
    const isManual = importedData.emitter.name === "Lançamento manual";

    if (!isManual) {
      dispatchDomainEvent(importEvent as any);
    }
    for (const evt of transactionEvents) {
      dispatchDomainEvent(evt);
    }
    if (!isManual) {
      const confirmEvent = createInvoiceConfirmedEvent({
        invoiceId: importedData.invoiceId,
        date: importedData.date,
        totalAmount: importedData.totalAmount,
      });
      dispatchDomainEvent(confirmEvent as any);
    }

    Alert.alert(
      "Sucesso",
      isManual ? "Lançamento salvo com sucesso!" : "Nota fiscal importada com sucesso!",
    );
    router.back();
  }, [importedData, editableItems, computedTotal, invoiceDateDisplay, selectedAccountId, domain.categories, dispatch, dispatchDomainEvent, router]);

  return { confirmImport };
}
