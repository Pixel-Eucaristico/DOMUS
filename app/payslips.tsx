import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import {
  createTransactionEvent,
  deletePayslipEvent,
  formatPayslipPeriod,
  getPayslipHistory,
  recordPayslipEvent,
  summarizePayslips,
} from "@packages/domain";
import { normalizeVisionPayslip, type PayslipParseResult } from "@packages/parsers";
import type { PayslipOCRResult } from "@packages/ai/src/vision/ocrSchema";
import { usePayslipScanner, VISION_PAYSLIP_KEY, type PayslipScanSource } from "@/src/hooks/usePayslipScanner";
import { PayslipChart } from "@/src/components/payslip/PayslipChart";
import { PayslipReviewModal, type PayslipReviewValues } from "@/src/components/payslip/PayslipReviewModal";
import { SelectionModal } from "@/src/components/shared/SelectionModal";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { InfoTip } from "@/src/components/shared/InfoTip";

const EMPTY_PAYSLIP: PayslipParseResult = {
  company: "",
  period: null,
  grossSalary: 0,
  netSalary: 0,
  earnings: [],
  deductions: [],
  confidence: 0,
  warnings: [],
};

export default function PayslipsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme, dispatchDomainEvent, deviceId } = useAppState();
  const { scan, scanning, visionAvailable } = usePayslipScanner();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [review, setReview] = useState<{ data: PayslipParseResult; source: "vision" | "ocr" | "manual" } | null>(null);

  const history = useMemo(() => getPayslipHistory(domain), [domain]);
  const summary = useMemo(() => summarizePayslips(history), [history]);
  const accounts = useMemo(() => Object.values(domain.accounts), [domain.accounts]);

  // Holerite vindo do chat de IA (Vision OCR)
  const params = useLocalSearchParams<{ fromVision?: string }>();
  const visionLoadedRef = useRef(false);
  useEffect(() => {
    if (params.fromVision !== "1" || visionLoadedRef.current) return;
    visionLoadedRef.current = true;
    AsyncStorage.getItem(VISION_PAYSLIP_KEY).then((raw) => {
      if (!raw) return;
      AsyncStorage.removeItem(VISION_PAYSLIP_KEY);
      try {
        setReview({ data: normalizeVisionPayslip(JSON.parse(raw) as PayslipOCRResult), source: "vision" });
      } catch (err) {
        console.warn("[Payslips] Resultado do Vision inválido:", err);
      }
    });
  }, [params.fromVision]);

  const handleScan = useCallback(async (source: PayslipScanSource) => {
    setPickerVisible(false);
    const result = await scan(source);
    if (result) setReview({ data: result.data, source: result.method });
  }, [scan]);

  const handleManual = useCallback(() => {
    setPickerVisible(false);
    setReview({ data: EMPTY_PAYSLIP, source: "manual" });
  }, []);

  const handleSave = useCallback((values: PayslipReviewValues) => {
    if (!review) return;
    const device = deviceId ?? "local";
    const existing = history.find((p) => p.period === values.period && p.company.toLowerCase() === values.company.toLowerCase());

    const doSave = () => {
      let transactionId: string | undefined;
      if (values.incomeAccountId) {
        const [y, m] = values.period.split("-");
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === Number(y) && today.getMonth() + 1 === Number(m);
        const date = isCurrentMonth ? today.toISOString().split("T")[0]! : `${y}-${m}-05`;
        const [txEvent] = createTransactionEvent(
          {
            accountId: values.incomeAccountId,
            type: "income",
            amount: values.netSalary,
            categoryId: "salario",
            date,
            description: `Salário ${values.company} (${formatPayslipPeriod(values.period)})`,
          },
          device,
        );
        transactionId = txEvent!.payload.id;
        dispatchDomainEvent(txEvent!);
      }

      dispatchDomainEvent(
        recordPayslipEvent(
          {
            period: values.period,
            company: values.company,
            ...(review.data.cnpj ? { cnpj: review.data.cnpj } : {}),
            ...(review.data.employee ? { employee: review.data.employee } : {}),
            grossSalary: values.grossSalary,
            netSalary: values.netSalary,
            earnings: review.data.earnings,
            deductions: values.deductions,
            ...(review.data.fgts !== undefined ? { fgts: review.data.fgts } : {}),
            source: review.source,
            ...(transactionId ? { transactionId } : {}),
          },
          device,
        ),
      );
      soundManager.play("success");
      setReview(null);
    };

    if (existing) {
      Alert.alert(
        "Competência já registrada",
        `Já existe um holerite de ${formatPayslipPeriod(values.period)} para ${values.company}. Substituir?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Substituir", style: "destructive", onPress: doSave },
        ],
      );
    } else {
      doSave();
    }
  }, [review, history, deviceId, dispatchDomainEvent]);

  const handleDelete = useCallback((id: string, label: string) => {
    Alert.alert("Excluir holerite", `Remover o holerite de ${label}? A receita lançada (se houver) continua nas transações.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          dispatchDomainEvent(deletePayslipEvent(id, deviceId ?? "local"));
          soundManager.play("trash");
        },
      },
    ]);
  }, [dispatchDomainEvent, deviceId]);

  const changeColor = summary.netChange === null ? theme.secondaryText : summary.netChange >= 0 ? theme.success : theme.danger;

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => { soundManager.play("tap"); router.back(); }} hitSlop={12} accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.title, { color: theme.textColor }]}>Holerites</Text>
        <Pressable
          onPress={() => { soundManager.play("tap"); setPickerVisible(true); }}
          hitSlop={12}
          accessibilityLabel="Adicionar holerite"
          disabled={scanning}
        >
          <Feather name="plus" size={24} color={theme.primaryColor} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
        {scanning && (
          <View style={[s.scanning, { backgroundColor: theme.cardBackground }]}>
            <ActivityIndicator color={theme.primaryColor} />
            <Text style={{ color: theme.textColor }}>Lendo holerite…</Text>
          </View>
        )}

        {history.length === 0 ? (
          <View style={[s.empty, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Feather name="file-text" size={40} color={theme.primaryColor} />
            <Text style={[s.emptyTitle, { color: theme.textColor }]}>Nenhum holerite ainda</Text>
            <Text style={[s.emptyText, { color: theme.secondaryText }]}>
              Fotografe seu contracheque para acompanhar a evolução do salário, dos descontos e lançar a receita automaticamente.
            </Text>
            <Pressable style={[s.cta, { backgroundColor: theme.primaryColor }]} onPress={() => setPickerVisible(true)}>
              <Feather name="camera" size={18} color="#fff" />
              <Text style={s.ctaText}>Escanear holerite</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={s.stats}>
              <View style={[s.stat, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={s.labelRow}>
                  <Text style={[s.statLabel, { color: theme.secondaryText }]}>Último líquido</Text>
                  <InfoTip term="salario_liquido" size={12} />
                </View>
                <Text style={[s.statValue, { color: theme.textColor }]}>{formatCurrency(summary.latest!.netSalary)}</Text>
                <Text style={[s.statSub, { color: changeColor }]}>
                  {summary.netChangePct === null
                    ? formatPayslipPeriod(summary.latest!.period)
                    : `${summary.netChangePct >= 0 ? "▲" : "▼"} ${Math.abs(summary.netChangePct).toFixed(1)}% vs anterior`}
                </Text>
              </View>
              <View style={[s.stat, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={s.labelRow}>
                  <Text style={[s.statLabel, { color: theme.secondaryText }]}>Média líquida</Text>
                  <InfoTip term="descontos_holerite" size={12} />
                </View>
                <Text style={[s.statValue, { color: theme.textColor }]}>{formatCurrency(summary.averageNet)}</Text>
                <Text style={[s.statSub, { color: theme.secondaryText }]}>
                  {(summary.deductionRate * 100).toFixed(1)}% em descontos
                </Text>
              </View>
            </View>

            <View style={s.labelRow}>
              <Text style={[s.section, { color: theme.textColor }]}>Evolução</Text>
              <InfoTip term="salario_bruto" size={13} style={s.sectionTip} />
            </View>
            <PayslipChart history={history} theme={theme} />

            {summary.deductionTotals.length > 0 && (
              <>
                <Text style={[s.section, { color: theme.textColor }]}>Descontos acumulados</Text>
                <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  {summary.deductionTotals.slice(0, 6).map((d) => (
                    <View key={d.name} style={s.lineRow}>
                      <Text style={[s.lineName, { color: theme.textColor }]} numberOfLines={1}>{d.name}</Text>
                      <Text style={{ color: theme.danger }}>{formatCurrency(d.value)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={[s.section, { color: theme.textColor }]}>Histórico</Text>
            {[...history].reverse().map((p) => {
              const label = formatPayslipPeriod(p.period);
              return (
                <View key={p.id} style={[s.item, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={s.flex}>
                    <Text style={[s.itemTitle, { color: theme.textColor }]}>{label}</Text>
                    <Text style={[s.itemSub, { color: theme.secondaryText }]} numberOfLines={1}>
                      {p.company} · bruto {formatCurrency(p.grossSalary)}
                    </Text>
                  </View>
                  <View style={s.itemRight}>
                    <Text style={[s.itemValue, { color: theme.success }]}>{formatCurrency(p.netSalary)}</Text>
                    {p.transactionId && (
                      <Text style={[s.itemSub, { color: theme.secondaryText }]}>receita lançada</Text>
                    )}
                  </View>
                  <Pressable onPress={() => handleDelete(p.id, label)} hitSlop={10} accessibilityLabel={`Excluir holerite de ${label}`}>
                    <Feather name="trash-2" size={18} color={theme.secondaryText} />
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <SelectionModal
        visible={pickerVisible}
        title="Adicionar holerite"
        subtitle={visionAvailable ? "Leitura com IA (Vision)" : "Leitura com OCR do aparelho"}
        theme={theme}
        onCancel={() => setPickerVisible(false)}
        options={[
          { label: "Câmera", icon: "camera", color: "#4CAF50", onPress: () => handleScan("camera") },
          { label: "Galeria de Fotos", icon: "image", color: "#2196F3", onPress: () => handleScan("gallery") },
          { label: "Preencher manualmente", icon: "edit-3", color: "#F59E0B", onPress: handleManual },
        ]}
      />

      <PayslipReviewModal
        visible={!!review}
        initial={review?.data ?? null}
        accounts={accounts}
        theme={theme}
        onCancel={() => setReview(null)}
        onSave={handleSave}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  content: { paddingHorizontal: 20, gap: 12 },
  scanning: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12 },
  empty: { alignItems: "center", gap: 12, padding: 24, borderRadius: 16, borderWidth: 1, marginTop: 24 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { textAlign: "center", lineHeight: 20 },
  cta: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  ctaText: { color: "#fff", fontWeight: "700" },
  stats: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  statLabel: { fontSize: 12 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTip: { marginTop: 8 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statSub: { fontSize: 12 },
  section: { fontSize: 15, fontWeight: "700", marginTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  lineRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  lineName: { flex: 1 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  flex: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "600" },
  itemSub: { fontSize: 12 },
  itemRight: { alignItems: "flex-end" },
  itemValue: { fontSize: 15, fontWeight: "700" },
});
