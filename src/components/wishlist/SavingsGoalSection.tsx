import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { SavingsGoalConfig, SavingsFrequency } from "@packages/wishlist";
import type { AccountPayload } from "@packages/events";

const FREQ_LABELS: Record<SavingsFrequency, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  auto: "Automático",
};

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
        onPress={() => update({ enabled: !savingsGoal.enabled })}
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
                    onPress={() => update({ linkedAccountId: acc.id })}
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

          {/* Valor do aporte */}
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            Valor do aporte (R$)
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: theme.textColor, backgroundColor: theme.background, borderColor: theme.background },
            ]}
            placeholder="0,00"
            placeholderTextColor={theme.secondaryText}
            value={
              savingsGoal.contributionAmount !== undefined
                ? savingsGoal.contributionAmount.toFixed(2).replace(".", ",")
                : ""
            }
            onChangeText={(v) => {
              const num = parseFloat(v.replace(",", "."));
              update({ contributionAmount: isNaN(num) ? undefined : num });
            }}
            keyboardType="decimal-pad"
          />

          {/* Frequência */}
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            Frequência
          </Text>
          <View style={styles.freqRow}>
            {(["weekly", "biweekly", "monthly", "auto"] as SavingsFrequency[]).map((f) => {
              const selected = savingsGoal.frequency === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.freqChip,
                    {
                      backgroundColor: selected ? "#16A34A" : theme.background,
                      borderColor: selected ? "#16A34A" : theme.cardBackground,
                    },
                  ]}
                  onPress={() => update({ frequency: f })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.freqText,
                      { color: selected ? "#fff" : theme.secondaryText },
                    ]}
                  >
                    {FREQ_LABELS[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {savingsGoal.frequency === "auto" && (
            <View style={styles.autoNote}>
              <Feather name="info" size={11} color={theme.secondaryText} />
              <Text style={[styles.autoNoteText, { color: theme.secondaryText }]}>
                Automático: você deposita quando quiser. O app mostra o progresso baseado no saldo da conta.
              </Text>
            </View>
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
  input: {
    height: 40,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
  },
  freqRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  freqChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  freqText: { fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  autoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 4,
  },
  autoNoteText: { fontSize: 11, fontFamily: "DMSans_400Regular", flex: 1, lineHeight: 15 },
});
