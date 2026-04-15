import React from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getCreditUsage } from "@packages/domain/src/accounts";
import { soundManager } from "@/src/services/SoundManager";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { TText } from "@/src/components/tamagui";
import { TCard } from "@/src/components/tamagui";

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
      style={[s.accountsScroll, { flexGrow: 1, width: "100%" }]}
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
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            onPress={() => {
              soundManager.play("tap");
              router.push("/(tabs)/accounts");
            }}
          >
            <TCard
              compact
              elevated
              width={120}
              gap="$xs"
              backgroundColor={theme.cardBackground}
              borderColor={theme.border}
            >
              <View style={[s.accountChipIcon, { backgroundColor: `${chipColor}20` }]}>
                <Feather name={typeIcon as any} size={14} color={chipColor} />
              </View>
              <TText variant="caption" color={theme.textColor} numberOfLines={1}>
                {acc.name}
              </TText>
              <TText
                variant="label"
                bold
                color={isCC ? (usagePct > 80 ? theme.danger : theme.secondaryText) : theme.success}
              >
                {formatCurrency(acc.balance)}
              </TText>
              {isCC && acc.creditLimit ? (
                <View style={[s.accountChipBar, { backgroundColor: theme.border }]}>
                  <View style={[s.accountChipBarFill, { width: `${usagePct}%`, backgroundColor: barColor }]} />
                </View>
              ) : null}
            </TCard>
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
  accountChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
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
