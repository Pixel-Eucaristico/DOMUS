import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { SavingsGoalConfig } from "@packages/wishlist";
import type { AccountPayload } from "@packages/events";
import { soundManager } from "@/src/services/SoundManager";

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  checking: "credit-card",
  savings: "dollar-sign",
  wallet: "pocket",
};

interface Props {
  savingsGoal: SavingsGoalConfig;
  accounts: AccountPayload[];
  theme: ThemeColors;
  onChange: (config: SavingsGoalConfig) => void;
}

export function SavingsGoalSection({ savingsGoal, accounts, theme, onChange }: Props) {
  const savingsAccounts = accounts.filter((a) => a.type !== "credit_card");

  const update = (partial: Partial<SavingsGoalConfig>) =>
    onChange({ ...savingsGoal, ...partial });

  return (
    <View style={styles.container}>
      {/* Toggle header */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => { soundManager.play("tap"); update({ enabled: !savingsGoal.enabled }); }}
        activeOpacity={0.7}
      >
        <View style={styles.toggleLeft}>
          <View style={[styles.goalIcon, { backgroundColor: "#16A34A20" }]}>
            <Feather name="target" size={15} color="#16A34A" />
          </View>
          <View>
            <Text style={[styles.toggleTitle, { color: theme.textColor }]}>
              Objetivo de Poupança
            </Text>
            <Text style={[styles.toggleSub, { color: theme.secondaryText }]}>
              Vincule uma conta e acompanhe o progresso
            </Text>
          </View>
        </View>
        <Switch
          value={savingsGoal.enabled}
          onValueChange={(v) => update({ enabled: v })}
          trackColor={{ false: theme.cardBackground, true: "#16A34A60" }}
          thumbColor={savingsGoal.enabled ? "#16A34A" : theme.secondaryText}
        />
      </TouchableOpacity>

      {savingsGoal.enabled && (
        <View style={[styles.content, { backgroundColor: theme.cardBackground }]}>
          {/* Conta vinculada */}
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            Conta vinculada
          </Text>
          {savingsAccounts.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              Nenhuma conta disponível. Crie uma conta poupança no app.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.accountScroll}
              contentContainerStyle={styles.accountRow}
            >
              {savingsAccounts.map((acc) => {
                const selected = savingsGoal.linkedAccountId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountChip,
                      {
                        backgroundColor: selected
                          ? (acc.color ?? theme.primaryColor) + "25"
                          : theme.background,
                        borderColor: selected
                          ? (acc.color ?? theme.primaryColor)
                          : theme.cardBackground,
                      },
                    ]}
                    onPress={() => { soundManager.play("tap"); update({ linkedAccountId: acc.id }); }}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={(ACCOUNT_TYPE_ICONS[acc.type] ?? "credit-card") as any}
                      size={12}
                      color={selected ? (acc.color ?? theme.primaryColor) : theme.secondaryText}
                    />
                    <Text
                      style={[
                        styles.accountChipText,
                        {
                          color: selected
                            ? (acc.color ?? theme.primaryColor)
                            : theme.textColor,
                          fontFamily: selected ? "DMSans_700Bold" : "DMSans_400Regular",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {acc.name}
                    </Text>
                    {selected && (
                      <Text style={[styles.accountBalance, { color: acc.color ?? theme.primaryColor }]}>
                        R${" "}
                        {acc.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  goalIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleTitle: { fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  toggleSub: { fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 1 },
  content: {
    borderRadius: 12,
    padding: 12,
    gap: 2,
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: { fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 },
  accountScroll: { marginBottom: 4 },
  accountRow: { gap: 6, paddingBottom: 2 },
  accountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accountChipText: { fontSize: 12, maxWidth: 110 },
  accountBalance: { fontSize: 11, fontFamily: "DMSans_700Bold" },
});
