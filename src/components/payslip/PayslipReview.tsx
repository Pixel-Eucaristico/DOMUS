import React, { useMemo, useState } from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { AccountPayload } from "@packages/events/src/types";
import {
  defaultLaunchIncome,
  findPayslipInSlot,
  isThirteenthPeriodInput,
  validatePayslipDraft,
  type PayslipDraft,
  type PayslipDraftField,
  type PayslipReviewValues,
  type StoredPayslip,
} from "@packages/domain";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AppTextInput } from "@/src/components/shared/AppTextInput";
import { AccountPicker } from "@/src/components/shared/AccountPicker";
import { DatePickerField } from "@/src/components/shared/DatePickerField";
import { TButton } from "@/src/components/tamagui";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { soundManager } from "@/src/services/SoundManager";

export interface PayslipReviewSave {
  values: PayslipReviewValues;
  /** Conta e data da receita; ausente = não lançar. */
  income?: { accountId: string; date: string };
  /** Holerite já salvo na mesma vaga (será substituído). */
  inSlot?: StoredPayslip;
}

interface PayslipReviewProps {
  initialDraft: PayslipDraft;
  /** Avisos do parser/leitura; só exibidos, nunca vão para o evento. */
  warnings: readonly string[];
  accounts: readonly AccountPayload[];
  payslips: Readonly<Record<string, StoredPayslip>>;
  theme: ThemeColors;
  bottomInset: number;
  saving?: boolean;
  onCancel: () => void;
  onSave: (save: PayslipReviewSave) => void;
}

const SOURCE_LABEL: Record<PayslipDraft["source"], { icon: React.ComponentProps<typeof Feather>["name"]; text: string }> = {
  vision: { icon: "cpu", text: "Lido pela IA" },
  ocr: { icon: "smartphone", text: "Lido no aparelho" },
  manual: { icon: "edit-3", text: "Preenchido à mão" },
};

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Story 11.5: revisão do holerite como tela que rola (sem `Modal`), com o
 * teclado gerido pelo `KeyboardAwareScrollViewCompat` (Story 13.1). Só valida
 * e devolve os valores; quem confirma a substituição e despacha é a tela.
 */
export function PayslipReview({
  initialDraft,
  warnings,
  accounts,
  payslips,
  theme,
  bottomInset,
  saving = false,
  onCancel,
  onSave,
}: PayslipReviewProps) {
  const [draft, setDraft] = useState<PayslipDraft>(initialDraft);
  // Campo já preenchido pela leitura mostra o erro de saída; vazio, só depois de mexer.
  const [touched, setTouched] = useState<Partial<Record<PayslipDraftField, boolean>>>(() => ({
    company: initialDraft.company.trim() !== "" || initialDraft.cnpj.trim() !== "",
    cnpj: initialDraft.cnpj.trim() !== "",
    period: initialDraft.period.trim() !== "",
    gross: initialDraft.gross.trim() !== "",
    net: initialDraft.net.trim() !== "",
  }));
  const [incomeChoice, setIncomeChoice] = useState<boolean | null>(null);
  const eligibleAccounts = useMemo(() => accounts.filter((a) => a.type !== "credit_card"), [accounts]);
  const [accountId, setAccountId] = useState<string>(() => eligibleAccounts[0]?.id ?? "");
  const [incomeDate, setIncomeDate] = useState<string>(todayLocalISO);

  const validation = useMemo(() => validatePayslipDraft(draft), [draft]);
  const inSlot = useMemo(
    () => (validation.ok ? findPayslipInSlot(payslips, validation.values) : undefined),
    [validation, payslips],
  );
  const hasEligible = eligibleAccounts.length > 0;
  const selectedAccountId = eligibleAccounts.some((a) => a.id === accountId) ? accountId : eligibleAccounts[0]?.id ?? "";
  const launchIncome = hasEligible && (incomeChoice ?? defaultLaunchIncome(hasEligible, inSlot));

  const set = (field: PayslipDraftField) => (text: string) => {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
    setDraft((d) => {
      const next = { ...d, [field]: text };
      // Competência 13/AAAA liga a chave do 13º ao ser digitada.
      if (field === "period" && isThirteenthPeriodInput(text) && !isThirteenthPeriodInput(d.period)) {
        next.thirteenth = true;
      }
      return next;
    });
  };

  const errorOf = (field: PayslipDraftField): string | undefined => {
    if (!touched[field]) {
      // A falta de empresa/CNPJ aparece na empresa assim que um dos dois é mexido.
      if (field === "company" && touched.cnpj) return validation.errors.company;
      return undefined;
    }
    return validation.errors[field];
  };

  const canSave = validation.ok && !saving && (!launchIncome || !!selectedAccountId);

  const handleSave = () => {
    if (!validation.ok) {
      setTouched({ company: true, cnpj: true, period: true, gross: true, net: true });
      return;
    }
    if (!canSave) return;
    onSave({
      values: validation.values,
      income: launchIncome ? { accountId: selectedAccountId, date: incomeDate } : undefined,
      inSlot,
    });
  };

  const source = SOURCE_LABEL[draft.source];

  return (
    <KeyboardAwareScrollViewCompat
      contentContainerStyle={[s.content, { paddingBottom: bottomInset + 32 }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={50}
    >
      <View style={[s.sourceRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Feather name={source.icon} size={14} color={theme.primaryColor} />
        <Text style={[s.sourceText, { color: theme.textColor }]}>{source.text}</Text>
      </View>

      {warnings.map((w) => (
        <View key={w} style={[s.warning, { backgroundColor: theme.warning + "22" }]}>
          <Feather name="alert-triangle" size={14} color={theme.warning} />
          <Text style={[s.warningText, { color: theme.textColor }]}>{w}</Text>
        </View>
      ))}

      <AppTextInput
        label="Empresa"
        value={draft.company}
        onChangeText={set("company")}
        placeholder="Nome do empregador"
        error={errorOf("company")}
        autoCapitalize="words"
      />
      <AppTextInput
        label="CNPJ (opcional)"
        value={draft.cnpj}
        onChangeText={set("cnpj")}
        placeholder="00.000.000/0000-00"
        keyboardType="numbers-and-punctuation"
        error={errorOf("cnpj")}
      />
      <AppTextInput
        label="Competência (MM/AAAA)"
        value={draft.period}
        onChangeText={set("period")}
        placeholder="09/2026"
        keyboardType="numbers-and-punctuation"
        error={errorOf("period")}
      />

      <View style={[s.switchRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={s.flex}>
          <Text style={[s.switchTitle, { color: theme.textColor }]}>13º salário</Text>
          <Text style={[s.switchHint, { color: theme.secondaryText }]}>
            Não substitui o holerite mensal de dezembro.
          </Text>
        </View>
        <Switch
          value={draft.thirteenth}
          onValueChange={(v) => setDraft((d) => ({ ...d, thirteenth: v }))}
          trackColor={{ false: theme.border, true: theme.primaryColor }}
          thumbColor="#fff"
          accessibilityLabel="13º salário"
        />
      </View>

      {(draft.earnings.length > 0 || draft.deductions.length > 0 || draft.fgts !== undefined) && (
        <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {draft.earnings.length > 0 && (
            <>
              <Text style={[s.cardTitle, { color: theme.secondaryText }]}>Proventos lidos</Text>
              {draft.earnings.map((l, i) => (
                <View key={`e-${i}`} style={s.lineRow}>
                  <Text style={[s.lineName, { color: theme.textColor }]} numberOfLines={1}>{l.name}</Text>
                  <Text style={{ color: theme.success }}>{formatCurrency(l.value)}</Text>
                </View>
              ))}
            </>
          )}
          {draft.deductions.length > 0 && (
            <>
              <Text style={[s.cardTitle, { color: theme.secondaryText }]}>Descontos lidos</Text>
              {draft.deductions.map((l, i) => (
                <View key={`d-${i}`} style={s.lineRow}>
                  <Text style={[s.lineName, { color: theme.textColor }]} numberOfLines={1}>{l.name}</Text>
                  <Text style={{ color: theme.danger }}>− {formatCurrency(l.value)}</Text>
                </View>
              ))}
            </>
          )}
          {draft.fgts !== undefined && (
            <View style={s.lineRow}>
              <Text style={[s.lineName, { color: theme.secondaryText }]}>FGTS do mês (não é desconto)</Text>
              <Text style={{ color: theme.secondaryText }}>{formatCurrency(draft.fgts)}</Text>
            </View>
          )}
        </View>
      )}

      <AppTextInput
        label="Salário bruto"
        value={draft.gross}
        onChangeText={set("gross")}
        placeholder="0,00"
        keyboardType="decimal-pad"
        error={errorOf("gross")}
      />
      <AppTextInput
        label="Salário líquido"
        value={draft.net}
        onChangeText={set("net")}
        placeholder="0,00"
        keyboardType="decimal-pad"
        error={errorOf("net")}
      />

      <View style={[s.switchRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={s.flex}>
          <Text style={[s.switchTitle, { color: hasEligible ? theme.textColor : theme.secondaryText }]}>
            Lançar o líquido como receita
          </Text>
          <Text style={[s.switchHint, { color: theme.secondaryText }]}>
            {!hasEligible
              ? "Crie uma conta corrente, poupança ou carteira para lançar a receita."
              : inSlot?.transactionId
                ? "O holerite anterior desta competência já lançou receita."
                : "Entra no extrato na categoria Salário."}
          </Text>
        </View>
        <Switch
          value={launchIncome}
          disabled={!hasEligible}
          onValueChange={(v) => setIncomeChoice(v)}
          trackColor={{ false: theme.border, true: theme.primaryColor }}
          thumbColor="#fff"
          accessibilityLabel="Lançar o líquido como receita"
        />
      </View>

      {launchIncome && (
        <>
          <AccountPicker
            accounts={eligibleAccounts as AccountPayload[]}
            selectedId={selectedAccountId}
            theme={theme}
            label="Conta da receita"
            onSelect={setAccountId}
            compact
          />
          <DatePickerField label="Data da receita" value={incomeDate} onChange={setIncomeDate} theme={theme} />
        </>
      )}

      <View style={s.actions}>
        <TButton
          variant="outline"
          borderColor={theme.border}
          color={theme.textColor}
          flex={1}
          onPress={() => {
            soundManager.play("tap");
            onCancel();
          }}
        >
          Cancelar
        </TButton>
        <TButton
          variant="primary"
          flex={2}
          backgroundColor={theme.primaryColor}
          opacity={canSave ? 1 : 0.5}
          disabled={!canSave}
          onPress={handleSave}
          accessibilityLabel="Salvar holerite"
        >
          Salvar holerite
        </TButton>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sourceText: { fontSize: 13, fontWeight: "600" },
  warning: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  warningText: { flex: 1, fontSize: 13 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  switchTitle: { fontSize: 15, fontWeight: "600" },
  switchHint: { fontSize: 12, marginTop: 2 },
  flex: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  cardTitle: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  lineRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  lineName: { flex: 1 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
});
