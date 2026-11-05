import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import type { OleriteReadingPayload } from "@packages/events";
import {
  getChronologicalOleriteReadings,
  calculateAverageOleriteConsumption,
  getOleriteEvolutionSeries,
} from "@packages/domain";
import { TButton } from "@/src/components/tamagui";
import { soundManager } from "@/src/services/SoundManager";

interface Props {
  readings: Record<string, OleriteReadingPayload>;
  theme: ThemeColors;
  onStartCameraScan: () => void;
  onOpenManualEntry: () => void;
}

function formatNumber(val: number): string {
  return val.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatFullDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OleriteHistoryView({
  readings,
  theme,
  onStartCameraScan,
  onOpenManualEntry,
}: Props) {
  const chronological = useMemo(
    () => getChronologicalOleriteReadings(readings),
    [readings],
  );
  const averageConsumption = useMemo(
    () => calculateAverageOleriteConsumption(readings),
    [readings],
  );
  const evolutionSeries = useMemo(
    () => getOleriteEvolutionSeries(readings),
    [readings],
  );

  const latestReading =
    chronological.length > 0 ? chronological[chronological.length - 1] : null;
  const primaryUnit = latestReading?.unit ?? "L";

  const visibleSeries = useMemo(
    () => evolutionSeries.slice(-8),
    [evolutionSeries],
  );

  const maxChartValue = useMemo(() => {
    if (visibleSeries.length === 0) return 1;
    return Math.max(...visibleSeries.map((pt) => pt.value), 0.001);
  }, [visibleSeries]);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Action buttons */}
      <View style={s.topActions}>
        <View style={{ flex: 1 }}>
          <TButton
            variant="primary"
            backgroundColor={theme.primaryColor}
            icon={<Feather name="camera" size={16} color="#FFFFFF" />}
            onPress={() => {
              soundManager.play("tap");
              onStartCameraScan();
            }}
          >
            Ler Medidor (OCR)
          </TButton>
        </View>
        <View style={{ flex: 1 }}>
          <TButton
            variant="outline"
            borderColor={theme.border}
            color={theme.textColor}
            icon={<Feather name="edit-3" size={16} color={theme.textColor} />}
            onPress={() => {
              soundManager.play("tap");
              onOpenManualEntry();
            }}
          >
            Digitar Manual
          </TButton>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={s.metricsRow}>
        <View
          style={[
            s.metricCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[s.metricLabel, { color: theme.secondaryText }]}>
            Última Leitura
          </Text>
          <Text style={[s.metricValue, { color: theme.textColor }]}>
            {latestReading
              ? `${formatNumber(latestReading.value)} ${latestReading.unit}`
              : "—"}
          </Text>
          <Text style={[s.metricSub, { color: theme.secondaryText }]}>
            { chronological.length } registro{chronological.length === 1 ? "" : "s"}
          </Text>
        </View>

        <View
          style={[
            s.metricCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[s.metricLabel, { color: theme.secondaryText }]}>
            Consumo Médio
          </Text>
          <Text style={[s.metricValue, { color: theme.primaryColor }]}>
            {chronological.length >= 2
              ? `${averageConsumption >= 0 ? "+" : ""}${formatNumber(averageConsumption)} ${primaryUnit}`
              : `0 ${primaryUnit}`}
          </Text>
          <Text style={[s.metricSub, { color: theme.secondaryText }]}>
            {chronological.length >= 2
              ? "Média entre leituras"
              : "Requer ≥ 2 leituras"}
          </Text>
        </View>
      </View>

      {/* Evolution Chart */}
      <View
        style={[
          s.sectionCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={s.sectionHeader}>
          <Feather name="trending-up" size={18} color={theme.primaryColor} />
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>
            Evolução das Leituras
          </Text>
        </View>

        {evolutionSeries.length === 0 ? (
          <View style={s.emptyState}>
            <Feather name="bar-chart-2" size={32} color={theme.secondaryText} />
            <Text style={[s.emptyText, { color: theme.secondaryText }]}>
              Nenhuma leitura registrada ainda. Capture uma foto do medidor para acompanhar a evolução.
            </Text>
          </View>
        ) : (
          <View style={s.chartWrap}>
            {visibleSeries.map((point) => {
              const heightPct = Math.max(
                14,
                Math.round((point.value / maxChartValue) * 100),
              );
              return (
                <View key={point.id} style={s.chartCol}>
                  <Text
                    style={[s.chartValueText, { color: theme.textColor }]}
                    numberOfLines={1}
                  >
                    {formatNumber(point.value)}
                  </Text>
                  <View style={s.chartBarTrack}>
                    <View
                      style={[
                        s.chartBarFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: theme.primaryColor,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[s.chartDateText, { color: theme.secondaryText }]}
                  >
                    {formatShortDate(point.timestamp)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Chronological History List */}
      <View
        style={[
          s.sectionCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={s.sectionHeader}>
          <Feather name="clock" size={18} color={theme.primaryColor} />
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>
            Histórico Cronológico
          </Text>
        </View>

        {evolutionSeries.length === 0 ? (
          <Text style={[s.emptyText, { color: theme.secondaryText }]}>
            Sem leituras no histórico.
          </Text>
        ) : (
          <View style={s.historyList}>
            {evolutionSeries.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  s.historyItem,
                  idx < evolutionSeries.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <View style={s.historyLeft}>
                  <Text style={[s.historyValue, { color: theme.textColor }]}>
                    {formatNumber(item.value)} {item.unit}
                  </Text>
                  <Text
                    style={[s.historyDate, { color: theme.secondaryText }]}
                  >
                    {formatFullDateTime(item.timestamp)}
                  </Text>
                  {item.location ? (
                    <View style={s.locationBadge}>
                      <Feather
                        name="map-pin"
                        size={12}
                        color={theme.secondaryText}
                      />
                      <Text
                        style={[
                          s.locationText,
                          { color: theme.secondaryText },
                        ]}
                      >
                        {item.location}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={s.historyRight}>
                  {item.delta !== null ? (
                    <View
                      style={[
                        s.deltaBadge,
                        {
                          backgroundColor: `${theme.primaryColor}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[s.deltaText, { color: theme.primaryColor }]}
                      >
                        {item.delta >= 0 ? "+" : ""}
                        {formatNumber(item.delta)} {item.unit}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[s.initialLabel, { color: theme.secondaryText }]}
                    >
                      1ª leitura
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  topActions: {
    flexDirection: "row",
    gap: 12,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  metricSub: {
    fontSize: 11,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  chartWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 150,
    paddingTop: 12,
    gap: 8,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  chartValueText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chartBarTrack: {
    width: "100%",
    maxWidth: 32,
    height: 96,
    borderRadius: 8,
    backgroundColor: "rgba(128,128,128,0.12)",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 8,
  },
  chartDateText: {
    fontSize: 10,
  },
  historyList: {
    gap: 4,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  historyLeft: {
    flex: 1,
    gap: 2,
  },
  historyValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  historyDate: {
    fontSize: 12,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  deltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: "700",
  },
  initialLabel: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
