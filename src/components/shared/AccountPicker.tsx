import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { AccountPayload, AccountType } from "@packages/events/src/types";

const TYPE_CONFIG: Record<
  AccountType,
  { label: string; icon: string; color: string }
> = {
  checking:    { label: "Conta Corrente",  icon: "credit-card",  color: "#3B82F6" },
  savings:     { label: "Poupança",        icon: "trending-up",  color: "#10B981" },
  wallet:      { label: "Carteira",        icon: "briefcase",    color: "#F59E0B" },
  credit_card: { label: "Cartão de Crédito", icon: "zap",        color: "#8B5CF6" },
};

function formatBalance(acc: AccountPayload): string {
  const v = acc.balance ?? 0;
  const abs = Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  return v < 0 ? `−R$ ${abs}` : `R$ ${abs}`;
}

interface AccountPickerProps {
  accounts: AccountPayload[];
  selectedId: string;
  theme: ThemeColors;
  label?: string;
  onSelect: (id: string) => void;
}

export function AccountPicker({
  accounts,
  selectedId,
  theme,
  label = "Conta",
  onSelect,
}: AccountPickerProps) {
  if (accounts.length === 0) return null;

  return (
    <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
      <Text style={[s.label, { color: theme.secondaryText }]}>{label}</Text>
      <View style={s.list}>
        {accounts.map((a) => {
          const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.checking;
          const active = selectedId === a.id;
          const color = cfg.color;

          return (
            <Pressable
              key={a.id}
              style={({ pressed }) => [
                s.row,
                {
                  backgroundColor: active
                    ? `${color}12`
                    : theme.background,
                  borderColor: active ? color : theme.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => onSelect(a.id)}
            >
              {/* Colored icon */}
              <View style={[s.iconBox, { backgroundColor: `${color}18` }]}>
                <Feather name={cfg.icon as any} size={18} color={color} />
              </View>

              {/* Name + type */}
              <View style={s.info}>
                <Text
                  style={[s.accountName, { color: theme.textColor }]}
                  numberOfLines={1}
                >
                  {a.name}
                </Text>
                <Text style={[s.accountType, { color }]}>{cfg.label}</Text>
              </View>

              {/* Balance */}
              <View style={s.balanceBox}>
                <Text
                  style={[
                    s.balance,
                    {
                      color:
                        (a.balance ?? 0) < 0
                          ? theme.danger
                          : theme.secondaryText,
                    },
                  ]}
                >
                  {formatBalance(a)}
                </Text>
                {active && (
                  <View style={[s.checkCircle, { backgroundColor: color }]}>
                    <Feather name="check" size={10} color="#FFF" />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 20, padding: 20 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 10 },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  accountName: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  accountType: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  balanceBox: { alignItems: "flex-end", gap: 4 },
  balance: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
