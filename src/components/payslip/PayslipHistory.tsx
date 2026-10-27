import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import {
  formatPayslipPeriodLabel,
  payslipEmployerLabel,
  type PayslipChartPoint,
  type PayslipDeductionTotal,
  type PayslipHistorySummary,
  type StoredPayslip,
} from "@packages/domain";
import { InfoTip } from "@/src/components/shared/InfoTip";
import { PayslipChart } from "./PayslipChart";
import {
  averageLabel,
  employersLabel,
  formatPercentPoints,
  moneyOrDash,
  netChangeView,
} from "@/src/modules/payslip/historyFormat";

interface PayslipHistoryProps {
  /** `null` quando só há 13º salvo (sem mensal para o resumo). */
  summary: PayslipHistorySummary | null;
  series: readonly PayslipChartPoint[];
  deductionTotals: readonly PayslipDeductionTotal[];
  deductionTitle: string;
  /** Todos os holerites, do mais novo ao mais antigo. */
  payslips: readonly StoredPayslip[];
  theme: ThemeColors;
  onDelete: (p: StoredPayslip) => void;
}

/**
 * Story 11.6: resumo, gráfico, total por desconto e lista com excluir. Recebe
 * os dados prontos (`packages/domain/src/payslipHistory.ts`); não calcula nada.
 */
export function PayslipHistory({
  summary,
  series,
  deductionTotals,
  deductionTitle,
  payslips,
  theme,
  onDelete,
}: PayslipHistoryProps) {
  return (
    <>
      {summary ? (
        <SummaryCards summary={summary} theme={theme} />
      ) : (
        <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[s.muted, { color: theme.secondaryText }]}>Ainda não há holerite mensal para o resumo.</Text>
        </View>
      )}

      {summary && <PayslipChart series={series} theme={theme} />}

      {deductionTotals.length > 0 && (
        <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={s.titleRow}>
            <Text style={[s.cardTitle, { color: theme.textColor }]} accessibilityRole="header">
              {deductionTitle}
            </Text>
            {!summary && <InfoTip term="descontos_holerite" size={13} />}
          </View>
          {deductionTotals.map((d) => (
            <View key={d.name} style={s.deduction}>
              <View style={s.deductionRow}>
                <Text style={[s.deductionName, { color: theme.textColor }]} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={[s.deductionValue, { color: theme.textColor }]}>{moneyOrDash(d.value)}</Text>
              </View>
              <View style={[s.barTrack, { backgroundColor: theme.border }]}>
                <View style={[s.barFill, { width: `${Math.round(d.ratio * 100)}%`, backgroundColor: theme.danger }]} />
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={[s.section, { color: theme.textColor }]} accessibilityRole="header">
        Holerites salvos
      </Text>
      {payslips.map((p) => {
        const period = formatPayslipPeriodLabel(p);
        const employer = payslipEmployerLabel(p);
        const known = employer !== "Empresa não informada";
        return (
          <View key={p.id} style={[s.item, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={s.flex}>
              <Text style={[s.itemTitle, { color: theme.textColor }]}>{period}</Text>
              <Text style={[s.itemSub, { color: theme.secondaryText }]} numberOfLines={1}>
                {employer}
              </Text>
              <Text style={[s.itemSub, { color: theme.secondaryText }]}>
                Bruto {moneyOrDash(p.grossSalary)} · Líquido {moneyOrDash(p.netSalary)}
              </Text>
            </View>
            <Pressable
              onPress={() => onDelete(p)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Excluir holerite de ${period}${known ? ` de ${employer}` : ""}`}
              style={({ pressed }) => [s.trash, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="trash-2" size={20} color={theme.danger} />
            </Pressable>
          </View>
        );
      })}
    </>
  );
}

function SummaryCards({ summary, theme }: { summary: PayslipHistorySummary; theme: ThemeColors }) {
  const change = netChangeView(summary);
  const changeColor = change.trend === "up" ? theme.success : change.trend === "down" ? theme.danger : theme.textColor;
  const changeIcon = change.trend === "up" ? "arrow-up-right" : change.trend === "down" ? "arrow-down-right" : "minus";
  const employers = employersLabel(summary.latest.count);
  const card = [s.summaryCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }];

  return (
    <View style={s.grid}>
      <View style={card}>
        <View style={s.titleRow}>
          <Text style={[s.label, { color: theme.secondaryText }]}>Último líquido</Text>
          <InfoTip term="salario_liquido" size={13} />
        </View>
        <Text style={[s.value, { color: theme.textColor }]} adjustsFontSizeToFit numberOfLines={1}>
          {moneyOrDash(summary.latest.net)}
        </Text>
        <Text style={[s.sub, { color: theme.secondaryText }]}>
          {formatPayslipPeriodLabel({ period: summary.latest.period })}
          {employers ? ` · ${employers}` : ""}
        </Text>
      </View>

      <View style={card}>
        <Text style={[s.label, { color: theme.secondaryText }]}>Variação</Text>
        <View style={s.changeRow}>
          {change.reference && <Feather name={changeIcon} size={16} color={changeColor} />}
          <Text style={[s.changeText, { color: change.reference ? changeColor : theme.textColor }]}>{change.text}</Text>
        </View>
        {change.reference && <Text style={[s.sub, { color: theme.secondaryText }]}>{change.reference}</Text>}
      </View>

      <View style={card}>
        <Text style={[s.label, { color: theme.secondaryText }]}>Média líquida</Text>
        <Text style={[s.value, { color: theme.textColor }]} adjustsFontSizeToFit numberOfLines={1}>
          {moneyOrDash(summary.averageNet)}
        </Text>
        <Text style={[s.sub, { color: theme.secondaryText }]}>{averageLabel(summary.windowCount)}</Text>
      </View>

      <View style={card}>
        <View style={s.titleRow}>
          <Text style={[s.label, { color: theme.secondaryText }]}>Descontos</Text>
          <InfoTip term="descontos_holerite" size={13} />
        </View>
        <Text style={[s.value, { color: theme.textColor }]}>{formatPercentPoints(summary.deductionRate * 100)}</Text>
        <Text style={[s.sub, { color: theme.secondaryText }]}>
          do bruto em {summary.windowCount} {summary.windowCount === 1 ? "competência" : "competências"}
        </Text>
      </View>
    </View>
  );
}

/** Sem holerite: explica o recurso (os botões de captura ficam na tela). */
export function PayslipEmptyState({ theme }: { theme: ThemeColors }) {
  return (
    <View style={[s.empty, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={[s.emptyIcon, { backgroundColor: theme.primaryColor + "1A" }]}>
        <Feather name="file-text" size={28} color={theme.primaryColor} />
      </View>
      <Text style={[s.emptyTitle, { color: theme.textColor }]} accessibilityRole="header">
        Acompanhe seu salário
      </Text>
      <Text style={[s.emptyText, { color: theme.secondaryText }]}>
        Fotografe o holerite ou preencha os valores para ver a evolução do salário líquido e bruto, a média e quanto vai
        para descontos como INSS e IRRF.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  muted: { fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { flexGrow: 1, flexBasis: "45%", borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  label: { fontSize: 12, fontWeight: "600" },
  value: { fontSize: 18, fontWeight: "700" },
  sub: { fontSize: 11 },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  changeText: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  deduction: { gap: 4 },
  deductionRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  deductionName: { fontSize: 14, flexShrink: 1 },
  deductionValue: { fontSize: 14, fontWeight: "600" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  section: { fontSize: 15, fontWeight: "700", marginTop: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  flex: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: "600" },
  itemSub: { fontSize: 12 },
  trash: { padding: 4 },
  empty: { alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, padding: 20 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
