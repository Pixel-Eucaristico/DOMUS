import React from "react";
import {
  View,
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
import { TText } from "@/src/components/tamagui";

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
    <View style={s.container}>
      {/* Toggle header */}
      <TouchableOpacity
        style={s.toggleRow}
        onPress={() => { soundManager.play("tap"); update({ enabled: !savingsGoal.enabled }); }}
        activeOpacity={0.7}
      >
        <View style={s.toggleLeft}>
          <View style={[s.goalIcon, { backgroundColor: "#16A34A20" }]}>
            <Feather name="target" size={15} color="#16A34A" />
          </View>
          <View>
            <TText variant="body" fontWeight="600" color={theme.textColor}>
              Objetivo de Poupanca
            </TText>
            <TText variant="caption" color={theme.secondaryText} fontSize={11} marginTop={1}>
              Vincule uma conta e acompanhe o progresso
            </TText>
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
        <View style={[s.content, { backgroundColor: theme.cardBackground }]}>
          {/* Conta vinculada */}
          <TText
            variant="caption"
            fontWeight="500"
            color={theme.secondaryText}
            textTransform="uppercase"
            letterSpacing={0.5}
            marginTop={10}
            marginBottom={4}
            fontSize={11}
          >
            Conta vinculada
          </TText>
          {savingsAccounts.length === 0 ? (
            <TText variant="caption" color={theme.secondaryText} marginBottom={4}>
              Nenhuma conta disponivel. Crie uma conta poupanca no app.
            </TText>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.accountScroll}
              contentContainerStyle={s.accountRow}
            >
              {savingsAccounts.map((acc) => {
                const selected = savingsGoal.linkedAccountId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      s.accountChip,
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
                    <TText
                      variant="caption"
                      color={selected ? (acc.color ?? theme.primaryColor) : theme.textColor}
                      fontWeight={selected ? "700" : "400"}
                      numberOfLines={1}
                      maxWidth={110}
                    >
                      {acc.name}
                    </TText>
                    {selected && (
                      <TText variant="caption" bold color={acc.color ?? theme.primaryColor} fontSize={11}>
                        R${" "}
                        {acc.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TText>
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

const s = StyleSheet.create({
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
  content: {
    borderRadius: 12,
    padding: 12,
    gap: 2,
    marginTop: 4,
  },
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
});
