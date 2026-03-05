import React, { useState, useCallback } from "react";
import { View, Text, Pressable, Modal, Platform, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { updateTransactionEvent, createTransactionEvent } from "@packages/domain/src/transactions";
import { soundManager } from "@/src/services/SoundManager";
import { formatCurrency } from "@/src/utils/formatCurrency";
import type { DomainEvent } from "@packages/events/src/types";

function pendingDateLabel(dateStr: string): { label: string; overdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const txDate = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((txDate.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0)
    return { label: `Venceu há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? "s" : ""}`, overdue: true };
  if (diffDays === 0) return { label: "Hoje", overdue: false };
  if (diffDays === 1) return { label: "Amanhã", overdue: false };
  if (diffDays <= 7) return { label: `Em ${diffDays} dias`, overdue: false };
  return {
    label: txDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    overdue: false,
  };
}

interface PendingTransactionsListProps {
  pendingTxs: any[];
  transactions: Record<string, any>;
  accounts: Record<string, any>;
  categories: Record<string, any>;
  deviceId: string | null;
  theme: any;
  dispatchDomainEvent: (event: DomainEvent) => void;
}

export function PendingTransactionsList({
  pendingTxs,
  transactions,
  accounts,
  categories,
  deviceId,
  theme,
  dispatchDomainEvent,
}: PendingTransactionsListProps) {
  const router = useRouter();
  const [confirmingTx, setConfirmingTx] = useState<any>(null);
  const [transferSourceId, setTransferSourceId] = useState<string>("");

  const handleConfirmTx = useCallback(
    (txId: string) => {
      const tx = transactions[txId];
      if (tx?.type === "income" && tx.description?.startsWith("Aporte poupança:")) {
        const nonSavingsAccounts = Object.values(accounts).filter(
          (a: any) => a.type !== "savings",
        );
        setTransferSourceId((nonSavingsAccounts[0] as any)?.id ?? "");
        setConfirmingTx(tx);
        return;
      }
      const event = updateTransactionEvent(txId, { status: "confirmed" }, deviceId ?? undefined);
      dispatchDomainEvent(event);
      soundManager.play("success");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [dispatchDomainEvent, deviceId, transactions, accounts],
  );

  const handleConfirmTransfer = useCallback(() => {
    if (!confirmingTx) return;
    const did = deviceId ?? "local";

    dispatchDomainEvent(updateTransactionEvent(confirmingTx.id, { status: "confirmed" }, did));

    if (transferSourceId) {
      const [expenseEvent] = createTransactionEvent(
        {
          accountId: transferSourceId,
          type: "expense",
          amount: confirmingTx.amount,
          categoryId: confirmingTx.categoryId ?? "outros",
          date: confirmingTx.date,
          description: `Transferência: ${confirmingTx.description}`,
          status: "confirmed",
        },
        did,
      );
      dispatchDomainEvent(expenseEvent);
    }

    soundManager.play("success");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConfirmingTx(null);
  }, [confirmingTx, transferSourceId, deviceId, dispatchDomainEvent]);

  if (pendingTxs.length === 0) return null;

  return (
    <>
      <View style={[s.pendingCard, { backgroundColor: theme.cardBackground }]}>
        <View style={s.pendingHeader}>
          <View style={s.pendingTitleRow}>
            <Feather name="clock" size={16} color="#D97706" />
            <Text style={[s.pendingTitle, { color: theme.textColor }]}>
              Cobranças pendentes
            </Text>
          </View>
          <Pressable
            style={s.pendingSeeAll}
            onPress={() => {
              soundManager.play("tap");
              router.push({ pathname: "/transactions", params: { filter: "pending" } });
            }}
            hitSlop={8}
          >
            <Text style={[s.pendingSeeAllText, { color: theme.primaryColor }]}>Ver todas</Text>
            <Feather name="chevron-right" size={13} color={theme.primaryColor} />
          </Pressable>
        </View>
        {pendingTxs.map((tx) => {
          const cat = categories[tx.categoryId];
          const account = accounts[tx.accountId];
          const isExpense = tx.type === "expense";
          const isIncome = tx.type === "income";
          const iconColor = isExpense ? theme.danger : isIncome ? theme.success : theme.secondaryText;
          const iconName = isExpense ? "arrow-down-left" : isIncome ? "arrow-up-right" : "repeat";
          const { label: dateLabel, overdue } = pendingDateLabel(tx.date);
          return (
            <Pressable
              key={tx.id}
              style={({ pressed }) => [
                s.pendingRow,
                { borderTopColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => {
                soundManager.play("tap");
                router.push({ pathname: "/add-transaction", params: { txId: tx.id } });
              }}
            >
              <View style={[s.pendingIcon, { backgroundColor: `${iconColor}15` }]}>
                <Feather name={iconName as any} size={15} color={iconColor} />
              </View>
              <View style={s.pendingInfo}>
                <Text style={[s.pendingDesc, { color: theme.textColor }]} numberOfLines={1}>
                  {tx.description || cat?.name || tx.type}
                </Text>
                <View style={s.pendingMeta}>
                  <Text
                    style={[s.pendingDate, { color: overdue ? theme.danger : theme.secondaryText }]}
                  >
                    {dateLabel}
                  </Text>
                  {account && (
                    <>
                      <Text style={[s.pendingDot, { color: theme.secondaryText }]}>·</Text>
                      <Text style={[s.pendingAccount, { color: theme.secondaryText }]} numberOfLines={1}>
                        {account.name}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={[s.pendingAmount, { color: isExpense ? theme.danger : theme.success }]}>
                {isExpense ? "-" : "+"}{formatCurrency(tx.amount)}
              </Text>
              <Pressable
                style={({ pressed }) => [s.confirmBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleConfirmTx(tx.id)}
                hitSlop={8}
              >
                <Feather name="check" size={16} color="#16A34A" />
              </Pressable>
            </Pressable>
          );
        })}
      </View>

      {/* Transfer Source Modal */}
      <Modal
        visible={!!confirmingTx}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingTx(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setConfirmingTx(null)}>
          <Pressable style={[s.transferModal, { backgroundColor: theme.cardBackground }]} onPress={() => {}}>
            <View style={s.transferModalHeader}>
              <Feather name="arrow-right-circle" size={20} color="#10B981" />
              <Text style={[s.transferModalTitle, { color: theme.textColor }]}>
                Efetivar aporte
              </Text>
            </View>
            <Text style={[s.transferModalSub, { color: theme.secondaryText }]}>
              {confirmingTx?.description}
              {" · "}
              <Text style={{ color: "#10B981", fontFamily: "DMSans_600SemiBold" }}>
                {formatCurrency(confirmingTx?.amount ?? 0)}
              </Text>
            </Text>

            <Text style={[s.transferModalLabel, { color: theme.secondaryText }]}>
              De qual conta sai o dinheiro?
            </Text>
            {Object.values(accounts)
              .filter((a: any) => a.type !== "savings")
              .map((acc: any) => (
                <Pressable
                  key={acc.id}
                  style={[
                    s.transferAccountRow,
                    { borderColor: transferSourceId === acc.id ? "#10B981" : theme.border },
                    transferSourceId === acc.id && { backgroundColor: "#10B98112" },
                  ]}
                  onPress={() => {
                    soundManager.play("tap");
                    setTransferSourceId(acc.id);
                  }}
                >
                  <View style={[s.transferAccountDot, { backgroundColor: transferSourceId === acc.id ? "#10B981" : theme.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.transferAccountName, { color: theme.textColor }]}>{acc.name}</Text>
                    <Text style={[s.transferAccountBal, { color: theme.secondaryText }]}>
                      {formatCurrency(acc.balance ?? 0)}
                    </Text>
                  </View>
                  {transferSourceId === acc.id && (
                    <Feather name="check-circle" size={18} color="#10B981" />
                  )}
                </Pressable>
              ))}

            {Object.values(accounts).filter((a: any) => a.type !== "savings").length === 0 && (
              <Text style={[s.transferModalSub, { color: theme.secondaryText, marginBottom: 8 }]}>
                Nenhuma outra conta disponvel. O aporte ser efetivado diretamente.
              </Text>
            )}

            <View style={s.transferModalActions}>
              <Pressable
                style={[s.transferCancelBtn, { borderColor: theme.border }]}
                onPress={() => {
                  soundManager.play("tap");
                  setConfirmingTx(null);
                }}
              >
                <Text style={[s.transferCancelText, { color: theme.secondaryText }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.transferConfirmBtn} onPress={handleConfirmTransfer}>
                <Feather name="check" size={16} color="#FFF" />
                <Text style={s.transferConfirmText}>Efetivar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  pendingCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pendingTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pendingTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  pendingSeeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  pendingSeeAllText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  pendingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingInfo: { flex: 1, minWidth: 0 },
  pendingDesc: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  pendingMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  pendingDate: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  pendingDot: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  pendingAccount: { fontFamily: "DMSans_400Regular", fontSize: 11, flex: 1 },
  pendingAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  confirmBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  transferModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 8,
  },
  transferModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  transferModalTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
  },
  transferModalSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  transferModalLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  transferAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  transferAccountDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  transferAccountName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  transferAccountBal: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  transferModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  transferCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  transferCancelText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  transferConfirmBtn: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#10B981",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  transferConfirmText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFF",
  },
});
