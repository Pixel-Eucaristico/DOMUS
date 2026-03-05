import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getCreditUsage } from "@packages/domain/src/accounts";
import { soundManager } from "@/src/services/SoundManager";
import { formatCurrency } from "@/src/utils/formatCurrency";

interface AccountsStripProps {
  accounts: any[];
  transactions: any[];
  theme: any;
}

export function AccountsStrip({ accounts, transactions, theme }: AccountsStripProps) {
  const router = useRouter();

  if (accounts.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.accountsScrollContent}
      style={s.accountsScroll}
    >
      {accounts.map((acc) => {
        const isCC = acc.type === "credit_card";
        const usage = isCC ? getCreditUsage(acc, transactions) : 0;
        const usagePct = isCC && acc.creditLimit ? Math.min((usage / acc.creditLimit) * 100, 100) : 0;
        const barColor = usagePct > 80 ? theme.danger : usagePct > 50 ? "#F59E0B" : theme.success;
        const typeIcon =
          acc.type === "savings" ? "dollar-sign" :
          acc.type === "wallet" ? "pocket" :
          acc.type === "credit_card" ? "credit-card" : "briefcase";
        const chipColor = acc.color ?? theme.primaryColor;
        return (
          <Pressable
            key={acc.id}
            style={({ pressed }) => [
              s.accountChip,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              soundManager.play("tap");
              router.push("/(tabs)/accounts");
            }}
          >
            <View style={[s.accountChipIcon, { backgroundColor: `${chipColor}20` }]}>
              <Feather name={typeIcon as any} size={14} color={chipColor} />
            </View>
            <Text style={[s.accountChipName, { color: theme.textColor }]} numberOfLines={1}>
              {acc.name}
            </Text>
            <Text
              style={[
                s.accountChipBalance,
                { color: isCC ? (usagePct > 80 ? theme.danger : theme.secondaryText) : theme.success },
              ]}
            >
              {formatCurrency(acc.balance)}
            </Text>
            {isCC && acc.creditLimit ? (
              <View style={[s.accountChipBar, { backgroundColor: theme.border }]}>
                <View style={[s.accountChipBarFill, { width: `${usagePct}%` as any, backgroundColor: barColor }]} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  accountsScroll: { marginHorizontal: 0 },
  accountsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  accountChip: {
    width: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accountChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  accountChipName: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  accountChipBalance: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  accountChipBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  accountChipBarFill: {
    height: 4,
    borderRadius: 2,
    minWidth: 2,
  },
});
