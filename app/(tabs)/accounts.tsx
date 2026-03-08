import React, { useState, useMemo, useRef } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import type { AccountPayload } from "@packages/events/src/types";
import { URGENCY_ORDER } from "@packages/wishlist";
import { AccountCard } from "@/src/components/shared/AccountCard";
import { AccountFormModal } from "@/src/components/shared/AccountFormModal";
import { ResponsiveContainer } from "@/src/ui/components/ResponsiveContainer";
import { ResponsiveGrid } from "@/src/ui/components/ResponsiveGrid";
import { useTourTarget } from "@/src/tour/useTourTarget";


export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { domain, theme, wishlist, dispatchDomainEvent } = useAppState();
  const webTopInset = 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPayload | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const { targetRef: accountsAddRef, TourCard: AccountsAddTourCard, activeStyle: accountsAddActive } = useTourTarget("accounts-add", scrollRef);

  const accounts = Object.values(domain.accounts);

  const linkedItemsByAccount = useMemo(() => {
    const allItems = Object.values(wishlist?.items ?? {}) as any[];
    const map = new Map<string, any[]>();
    for (const item of allItems) {
      if (!item.savingsGoal?.enabled || !item.savingsGoal.linkedAccountId) continue;
      const id = item.savingsGoal.linkedAccountId;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(item);
    }
    map.forEach((items) =>
      items.sort(
        (a, b) => URGENCY_ORDER.indexOf(a.urgencyLevel) - URGENCY_ORDER.indexOf(b.urgencyLevel),
      ),
    );
    return map;
  }, [wishlist]);

  const toggleAccountExpand = (id: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setModalVisible(true);
  };

  const openEditModal = (acc: AccountPayload) => {
    setEditingAccount(acc);
    setModalVisible(true);
  };

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          s.content,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
       <ResponsiveContainer>
        <View style={Platform.OS === "web" ? { zIndex: accountsAddActive ? 9999 : 1, position: "relative" } : {}}>
          <View style={[s.header, Platform.OS === "web" && accountsAddActive ? { zIndex: 9998, position: "relative" } : {}]}>
            <Text style={[s.title, { color: theme.textColor }]}>Contas</Text>
            <Pressable
              ref={accountsAddRef as any}
              collapsable={false}
              style={[s.addBtn, { backgroundColor: theme.primaryColor }, accountsAddActive]}
              onPress={() => {
                soundManager.play("pop");
                openCreateModal();
              }}
            >
              <Feather name="plus" size={20} color="#FFF" />
            </Pressable>
          </View>
          <AccountsAddTourCard />
        </View>

        {accounts.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: theme.cardBackground }]}>
            <Feather name="layers" size={40} color={theme.secondaryText} />
            <Text style={[s.emptyTitle, { color: theme.textColor }]}>Nenhuma conta ainda</Text>
            <Text style={[s.emptySubtext, { color: theme.secondaryText }]}>
              Toque no + para criar sua primeira conta
            </Text>
          </View>
        ) : (
          <ResponsiveGrid gap={10}>
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                acc={acc}
                theme={theme}
                linkedItems={acc.type === "savings" ? (linkedItemsByAccount.get(acc.id) ?? []) : []}
                isExpanded={expandedAccounts.has(acc.id)}
                onPress={() => {
                  soundManager.play("tap");
                  router.push({ pathname: "/transactions", params: { accountId: acc.id } });
                }}
                onEdit={() => openEditModal(acc)}
                onToggleExpand={() => toggleAccountExpand(acc.id)}
                onGoalPress={(item) => router.push(`/wishlist/${item.listId}` as any)}
              />
            ))}
          </ResponsiveGrid>
        )}
       </ResponsiveContainer>
      </ScrollView>

      <AccountFormModal
        visible={modalVisible}
        editingAccount={editingAccount}
        theme={theme}
        domain={domain}
        wishlist={wishlist}
        dispatchDomainEvent={dispatchDomainEvent}
        onClose={() => {
          setModalVisible(false);
          setEditingAccount(null);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: "center", gap: 10 },
  emptyTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 16, marginTop: 8 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 14 },
  accountList: { gap: 10 },
});
