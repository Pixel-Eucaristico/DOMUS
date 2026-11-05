import React, { useState } from "react";
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { TCard, TText, TButton } from "@/src/components/tamagui";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { calculateAnnualReport } from "@packages/gamification";
import type { TransactionPayload, CategoryGroup } from "@packages/domain/src/transactions";

interface AnnualReportModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: TransactionPayload[];
  categories: Record<string, { group: CategoryGroup }>;
  year: number;
  theme: any;
}

const PRESET_SPLITS = [
  { label: "Padrão 50/30/20", needs: 50, wants: 30, savings: 20 },
  { label: "Início de Vida 60/20/20", needs: 60, wants: 20, savings: 20 },
  { label: "Investidor Forte 40/30/30", needs: 40, wants: 30, savings: 30 },
  { label: "Família com Filhos 70/15/15", needs: 70, wants: 15, savings: 15 },
];

export function AnnualReportModal({
  visible,
  onClose,
  transactions,
  categories,
  year,
  theme,
}: AnnualReportModalProps) {
  const [selectedSplitIndex, setSelectedSplitIndex] = useState(0);
  const report = calculateAnnualReport(transactions, categories, year);
  const activeSplit = PRESET_SPLITS[selectedSplitIndex]!;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.modalCard, { backgroundColor: theme.cardBackground }]}>
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="award" size={18} color={theme.primaryColor} />
                <TText variant="subtitle" color={theme.textColor}>
                  Relatório Anual {year}
                </TText>
              </View>
              <TText variant="caption" color={theme.secondaryText}>
                Desbloqueado no Nível 10: Visão Geral e Metas Customizadas
              </TText>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Feather name="x" size={20} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Totals Summary */}
            <View style={s.summaryGrid}>
              <View style={[s.summaryBox, { backgroundColor: `${theme.primaryColor}10` }]}>
                <TText variant="caption" color={theme.secondaryText}>Receitas no Ano</TText>
                <TText variant="label" fontWeight="700" color={theme.primaryColor}>
                  {formatCurrency(report.totalIncome)}
                </TText>
              </View>
              <View style={[s.summaryBox, { backgroundColor: `${theme.danger ?? "#EF4444"}10` }]}>
                <TText variant="caption" color={theme.secondaryText}>Despesas no Ano</TText>
                <TText variant="label" fontWeight="700" color={theme.danger ?? "#EF4444"}>
                  {formatCurrency(report.totalExpenses)}
                </TText>
              </View>
              <View style={[s.summaryBox, { backgroundColor: `${theme.success ?? "#10B981"}10` }]}>
                <TText variant="caption" color={theme.secondaryText}>Poupança Acumulada</TText>
                <TText variant="label" fontWeight="700" color={theme.success ?? "#10B981"}>
                  {formatCurrency(report.totalSavings)}
                </TText>
              </View>
              <View style={[s.summaryBox, { backgroundColor: `${theme.accentColor}10` }]}>
                <TText variant="caption" color={theme.secondaryText}>Aderência Média</TText>
                <TText variant="label" fontWeight="700" color={theme.accentColor}>
                  {report.averageAdherenceScore}%
                </TText>
              </View>
            </View>

            {/* Highlights */}
            {(report.bestSavingMonth || report.lowestExpenseMonth) && (
              <TCard elevated={false} backgroundColor={`${theme.border}25`} padding={12} gap={6} marginVertical={8}>
                {report.bestSavingMonth && (
                  <View style={s.highlightRow}>
                    <Feather name="trending-up" size={14} color={theme.success ?? "#10B981"} />
                    <TText variant="caption" color={theme.textColor} flex={1}>
                      Mês de maior poupança: <TText variant="caption" fontWeight="700">{report.bestSavingMonth}</TText>
                    </TText>
                  </View>
                )}
                {report.lowestExpenseMonth && (
                  <View style={s.highlightRow}>
                    <Feather name="shield" size={14} color={theme.primaryColor} />
                    <TText variant="caption" color={theme.textColor} flex={1}>
                      Mês com menor gasto: <TText variant="caption" fontWeight="700">{report.lowestExpenseMonth}</TText>
                    </TText>
                  </View>
                )}
              </TCard>
            )}

            {/* Personalização de Metas Orçamentárias */}
            <View style={{ marginTop: 14 }}>
              <TText variant="label" fontWeight="700" color={theme.textColor} marginBottom={6}>
                Personalização de Metas Orçamentárias
              </TText>
              <TText variant="caption" color={theme.secondaryText} marginBottom={10}>
                Selecione o modelo que melhor se adapta à fase atual da sua família:
              </TText>

              <View style={s.splitButtonsContainer}>
                {PRESET_SPLITS.map((split, idx) => {
                  const isSelected = idx === selectedSplitIndex;
                  return (
                    <TouchableOpacity
                      key={split.label}
                      style={[
                        s.splitButton,
                        {
                          borderColor: isSelected ? theme.primaryColor : theme.border,
                          backgroundColor: isSelected ? `${theme.primaryColor}15` : "transparent",
                        },
                      ]}
                      onPress={() => setSelectedSplitIndex(idx)}
                    >
                      <TText
                        variant="caption"
                        fontWeight={isSelected ? "700" : "500"}
                        color={isSelected ? theme.primaryColor : theme.textColor}
                      >
                        {split.label}
                      </TText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[s.splitBarPreview, { backgroundColor: theme.border }]}>
                <View style={[s.splitPart, { flex: activeSplit.needs, backgroundColor: theme.primaryColor }]} />
                <View style={[s.splitPart, { flex: activeSplit.wants, backgroundColor: theme.accentColor }]} />
                <View style={[s.splitPart, { flex: activeSplit.savings, backgroundColor: theme.success ?? "#10B981" }]} />
              </View>

              <View style={s.splitLegend}>
                <TText variant="caption" color={theme.primaryColor}>Necessidades {activeSplit.needs}%</TText>
                <TText variant="caption" color={theme.accentColor}>Desejos {activeSplit.wants}%</TText>
                <TText variant="caption" color={theme.success ?? "#10B981"}>Poupança {activeSplit.savings}%</TText>
              </View>
            </View>

            {/* Monthly Breakdowns */}
            <View style={{ marginTop: 18, marginBottom: 20 }}>
              <TText variant="label" fontWeight="700" color={theme.textColor} marginBottom={8}>
                Evolução Mês a Mês
              </TText>
              {report.months.map((m) => (
                <View key={m.month} style={[s.monthRow, { borderBottomColor: theme.border }]}>
                  <TText variant="caption" fontWeight="600" color={theme.textColor} width={80}>
                    {m.monthName}
                  </TText>
                  <TText variant="caption" color={theme.secondaryText} flex={1}>
                    Desp: {formatCurrency(m.totalExpenses)}
                  </TText>
                  <TText variant="caption" color={theme.success ?? "#10B981"} width={90} textAlign="right">
                    Poup: {formatCurrency(m.savings)}
                  </TText>
                </View>
              ))}
            </View>
          </ScrollView>

          <TButton
            variant="primary"
            backgroundColor={theme.primaryColor}
            onPress={onClose}
          >
            Fechar Relatório
          </TButton>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    marginVertical: 4,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  summaryBox: {
    flex: 1,
    minWidth: "45%",
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  splitButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  splitButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  splitBarPreview: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginVertical: 6,
  },
  splitPart: {
    height: "100%",
  },
  splitLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
});
