import { useMemo } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  getInstallmentSiblings,
  splitInstallmentSiblings,
  updateTransactionEvent,
  deleteTransactionEvent,
} from "@packages/domain/src/transactions";
import type { TransactionPayload } from "@packages/events/src/types";
import type {
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
} from "@packages/events/src/types";

type UpdateChanges = Partial<Omit<TransactionPayload, "id">>;

export interface UseInstallmentGroupResult {
  isInstallment: boolean;
  siblings: TransactionPayload[];
  current: TransactionPayload | null;
  past: TransactionPayload[];
  future: TransactionPayload[];
  deleteOne: () => TransactionDeletedEvent[];
  deleteFuture: () => TransactionDeletedEvent[];
  deleteAll: () => TransactionDeletedEvent[];
  updateOne: (changes: UpdateChanges) => TransactionUpdatedEvent[];
  updateFuture: (changes: UpdateChanges) => TransactionUpdatedEvent[];
  updateAll: (changes: UpdateChanges) => TransactionUpdatedEvent[];
}

const EMPTY: TransactionPayload[] = [];

export function useInstallmentGroup(txId: string | undefined): UseInstallmentGroupResult {
  const { domain } = useAppState();
  const transactions = domain.transactions;

  const tx = txId ? (transactions[txId] ?? null) : null;
  const isInstallment = !!tx?.installmentInfo;

  const siblings = useMemo(
    () => (txId && isInstallment ? getInstallmentSiblings(transactions, txId) : EMPTY),
    [transactions, txId, isInstallment],
  );

  const split = useMemo(
    () =>
      txId && isInstallment
        ? splitInstallmentSiblings(transactions, txId)
        : { current: null, past: EMPTY, future: EMPTY },
    [transactions, txId, isInstallment],
  );

  const deleteOne = (): TransactionDeletedEvent[] => {
    if (!txId) return [];
    return [deleteTransactionEvent(txId)];
  };

  const deleteFuture = (): TransactionDeletedEvent[] => {
    if (!txId || !split.current) return [];
    return [split.current, ...split.future].map((s) => deleteTransactionEvent(s.id));
  };

  const deleteAll = (): TransactionDeletedEvent[] => {
    return siblings.map((s) => deleteTransactionEvent(s.id));
  };

  const updateOne = (changes: UpdateChanges): TransactionUpdatedEvent[] => {
    if (!txId) return [];
    return [updateTransactionEvent(txId, changes)];
  };

  const updateFuture = (changes: UpdateChanges): TransactionUpdatedEvent[] => {
    if (!txId || !split.current) return [];
    return [split.current, ...split.future].map((s) => updateTransactionEvent(s.id, changes));
  };

  const updateAll = (changes: UpdateChanges): TransactionUpdatedEvent[] => {
    return siblings.map((s) => updateTransactionEvent(s.id, changes));
  };

  return {
    isInstallment,
    siblings,
    current: split.current,
    past: split.past,
    future: split.future,
    deleteOne,
    deleteFuture,
    deleteAll,
    updateOne,
    updateFuture,
    updateAll,
  };
}
