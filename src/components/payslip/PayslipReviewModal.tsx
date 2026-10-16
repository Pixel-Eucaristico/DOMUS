import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import type { AccountPayload } from "@packages/events/src/types";
import { normalizePayslipPeriod, parseBRL, type PayslipParseResult } from "@packages/parsers";
import { formatCurrency } from "@/src/utils/formatCurrency";

export interface PayslipReviewValues {
  company: string;
  period: string;
  grossSalary: number;
  netSalary: number;
  deductions: { name: string; value: number }[];
  /** Conta onde lançar a receita do líquido (undefined = não lançar) */
  incomeAccountId?: string;
}

interface PayslipReviewModalProps {
  visible: boolean;
  initial: PayslipParseResult | null;
  accounts: AccountPayload[];
  theme: ThemeColors;
  onCancel: () => void;
  onSave: (values: PayslipReviewValues) => void;
}

function toInput(n: number): string {
  return n > 0 ? n.toFixed(2).replace(".", ",") : "";
}

function toPeriodInput(period: string | null): string {
  if (!period) return "";
  const [y, m] = period.split("-");
  return `${m}/${y}`;
}

export function PayslipReviewModal({ visible, initial, accounts, theme, onCancel, onSave }: PayslipReviewModalProps) {
  const insets = useSafeAreaInsets();
  const incomeAccounts = useMemo(() => accounts.filter((a) => a.type !== "credit_card"), [accounts]);
  // Lido só ao abrir o modal — mudanças na lista de contas não reiniciam o formulário
  const incomeAccountsRef = useRef(incomeAccounts);
  incomeAccountsRef.current = incomeAccounts;

  const [company, setCompany] = useState("");
  const [period, setPeriod] = useState("");
  const [gross, setGross] = useState("");
  const [net, setNet] = useState("");
  const [launchIncome, setLaunchIncome] = useState(true);
  const [accountId, setAccountId] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setCompany(initial?.company ?? "");
    setPeriod(toPeriodInput(initial?.period ?? null));
    setGross(toInput(initial?.grossSalary ?? 0));
    setNet(toInput(initial?.netSalary ?? 0));
    setLaunchIncome(incomeAccountsRef.current.length > 0);
    setAccountId(incomeAccountsRef.current[0]?.id);
  }, [visible, initial]);

  const deductions = initial?.deductions ?? [];
  const normalizedPeriod = normalizePayslipPeriod(period);
  const grossValue = gross ? parseBRL(gross) : 0;
  const netValue = net ? parseBRL(net) : 0;
  const valid =
    company.trim().length > 0 &&
    !!normalizedPeriod &&
    Number.isFinite(grossValue) &&
    Number.isFinite(netValue) &&
    netValue > 0 &&
    grossValue >= netValue;

  const handleSave = () => {
    if (!valid || !normalizedPeriod) return;
    onSave({
      company: company.trim(),
      period: normalizedPeriod,
      grossSalary: grossValue,
      netSalary: netValue,
      deductions,
      incomeAccountId: launchIncome ? accountId : undefined,
    });
  };

  const inputStyle = [s.input, { color: theme.textColor, borderColor: theme.border, backgroundColor: theme.background }];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: theme.cardBackground, paddingBottom: insets.bottom + 16 }]}>
          <View style={s.header}>
            <Text style={[s.title, { color: theme.textColor }]}>Revisar holerite</Text>
            <Pressable onPress={onCancel} hitSlop={12} accessibilityLabel="Fechar">
              <Feather name="x" size={22} color={theme.secondaryText} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            {initial?.warnings.map((w) => (
              <View key={w} style={[s.warning, { backgroundColor: theme.warning + "22" }]}>
                <Feather name="alert-triangle" size={14} color={theme.warning} />
                <Text style={[s.warningText, { color: theme.textColor }]}>{w}</Text>
              </View>
            ))}

            <Text style={[s.label, { color: theme.secondaryText }]}>Empresa</Text>
            <TextInput style={inputStyle} value={company} onChangeText={setCompany} placeholder="Nome do empregador" placeholderTextColor={theme.secondaryText} />

            <Text style={[s.label, { color: theme.secondaryText }]}>Competência (MM/AAAA)</Text>
            <TextInput style={inputStyle} value={period} onChangeText={setPeriod} placeholder="03/2026" placeholderTextColor={theme.secondaryText} keyboardType="numbers-and-punctuation" />

            <View style={s.row}>
              <View style={s.flex}>
                <Text style={[s.label, { color: theme.secondaryText }]}>Salário bruto</Text>
                <TextInput style={inputStyle} value={gross} onChangeText={setGross} placeholder="0,00" placeholderTextColor={theme.secondaryText} keyboardType="decimal-pad" />
              </View>
              <View style={s.flex}>
                <Text style={[s.label, { color: theme.secondaryText }]}>Salário líquido</Text>
                <TextInput style={inputStyle} value={net} onChangeText={setNet} placeholder="0,00" placeholderTextColor={theme.secondaryText} keyboardType="decimal-pad" />
              </View>
            </View>

            {deductions.length > 0 && (
              <View style={[s.deductions, { borderColor: theme.border }]}>
                <Text style={[s.label, { color: theme.secondaryText }]}>Descontos identificados</Text>
                {deductions.map((d, i) => (
                  <View key={`${d.name}-${i}`} style={s.deductionRow}>
                    <Text style={[s.deductionName, { color: theme.textColor }]} numberOfLines={1}>{d.name}</Text>
                    <Text style={{ color: theme.danger }}>− {formatCurrency(d.value)}</Text>
                  </View>
                ))}
              </View>
            )}

            {incomeAccounts.length > 0 && (
              <View style={s.launch}>
                <View style={[s.row, s.center]}>
                  <Text style={[s.flex, { color: theme.textColor }]}>Lançar líquido como receita</Text>
                  <Switch value={launchIncome} onValueChange={setLaunchIncome} trackColor={{ true: theme.primaryColor }} />
                </View>
                {launchIncome && (
                  <View style={s.chips}>
                    {incomeAccounts.map((a) => {
                      const active = a.id === accountId;
                      return (
                        <Pressable
                          key={a.id}
                          onPress={() => setAccountId(a.id)}
                          style={[s.chip, { borderColor: active ? theme.primaryColor : theme.border, backgroundColor: active ? theme.primaryColor + "22" : "transparent" }]}
                        >
                          <Text style={{ color: active ? theme.primaryColor : theme.textColor }}>{a.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <Pressable
            onPress={handleSave}
            disabled={!valid}
            style={[s.save, { backgroundColor: theme.primaryColor, opacity: valid ? 1 : 0.4 }]}
            accessibilityRole="button"
          >
            <Text style={s.saveText}>Salvar holerite</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", paddingHorizontal: 20, paddingTop: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  body: { gap: 8, paddingBottom: 16 },
  warning: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  warningText: { flex: 1, fontSize: 13 },
  label: { fontSize: 12, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: "row", gap: 12 },
  center: { alignItems: "center" },
  flex: { flex: 1 },
  deductions: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6, marginTop: 8 },
  deductionRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  deductionName: { flex: 1 },
  launch: { marginTop: 12, gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  save: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
