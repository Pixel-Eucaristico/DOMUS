import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, BackHandler } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  buildPayslipHistory,
  buildPayslipSaveEvents,
  deletePayslipEvent,
  deletePayslipMessage,
  payslipChartSeries,
  payslipDeductionTitle,
  payslipDeductionTotals,
  replacePayslipMessage,
  sortPayslipsNewestFirst,
  summarizePayslipHistory,
  type StoredPayslip,
} from "@packages/domain";
import { draftFromParse, emptyPayslipDraft, type PayslipDraft } from "@/src/modules/payslip/reviewDraft";
import { createSingleFlight } from "@/src/modules/payslip/singleFlight";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { appAlert, appConfirm } from "@/src/services/appAlert";
import { usePayslipScanner, type PayslipCaptureSource } from "@/src/hooks/usePayslipScanner";
import { takePendingPayslipReview } from "@/src/modules/payslip/pendingReview";
import { PayslipReview, type PayslipReviewSave } from "@/src/components/payslip/PayslipReview";
import { PayslipHistory, PayslipEmptyState } from "@/src/components/payslip/PayslipHistory";

interface ReviewState {
  /** Muda a cada revisão aberta, para o formulário começar do zero. */
  key: number;
  draft: PayslipDraft;
  warnings: string[];
}

/**
 * Story 11.5: `/payslips` — captura (câmera, galeria, à mão), revisão e salvar.
 * Story 11.6: resumo, gráfico, total por desconto e lista com excluir, todos
 * derivados de `domain.payslips` a cada render (nunca persistidos).
 */
export default function PayslipsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme, dispatchDomainEvent, deviceId } = useAppState();
  const [review, setReview] = useState<ReviewState | null>(null);
  const [saving, setSaving] = useState(false);
  const reviewSeq = useRef(0);
  // Trava síncrona do salvar (R5): o toque duplo não lança a receita duas vezes.
  const saveFlight = useRef(createSingleFlight()).current;
  // Toque duplo no excluir abre uma confirmação só.
  const deleteFlight = useRef(createSingleFlight()).current;

  const openReview = useCallback((draft: PayslipDraft, warnings: readonly string[] = []) => {
    reviewSeq.current += 1;
    setReview({ key: reviewSeq.current, draft, warnings: [...warnings] });
  }, []);

  const openManual = useCallback(() => openReview(emptyPayslipDraft()), [openReview]);

  const { scan, scanning } = usePayslipScanner({ onManual: openManual });

  // Holerite lido no chat da IA: passagem em memória, lida uma vez.
  useFocusEffect(
    useCallback(() => {
      const pending = takePendingPayslipReview();
      if (!pending) return;
      openReview(
        pending.source === "manual" ? emptyPayslipDraft() : draftFromParse(pending.data, pending.source),
        pending.source === "manual" ? [] : pending.data.warnings,
      );
    }, [openReview]),
  );

  // Voltar do Android na revisão volta para a tela de captura.
  useEffect(() => {
    if (!review) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setReview(null);
      return true;
    });
    return () => sub.remove();
  }, [review]);

  const handleScan = useCallback(
    async (source: PayslipCaptureSource) => {
      soundManager.play("tap");
      const result = await scan(source);
      if (result) openReview(draftFromParse(result.data, result.source), result.data.warnings);
    },
    [scan, openReview],
  );

  const accounts = useMemo(() => Object.values(domain.accounts), [domain.accounts]);
  const saved = useMemo(() => sortPayslipsNewestFirst(domain.payslips), [domain.payslips]);
  const history = useMemo(() => buildPayslipHistory(domain.payslips), [domain.payslips]);
  const summary = useMemo(() => summarizePayslipHistory(history), [history]);
  const series = useMemo(() => payslipChartSeries(history), [history]);
  const deductionTotals = useMemo(() => payslipDeductionTotals(domain.payslips, history), [domain.payslips, history]);
  const deductionTitle = payslipDeductionTitle(history);

  // Excluir só despacha PAYSLIP_DELETED: a receita lançada nunca é apagada.
  const handleDelete = useCallback(
    (p: StoredPayslip) =>
      deleteFlight.run(async () => {
        soundManager.play("tap");
        const incomeStillExists = !!p.transactionId && !!domain.transactions[p.transactionId];
        const ok = await appConfirm({
          title: "Excluir holerite?",
          message: deletePayslipMessage(p, incomeStillExists),
          confirmLabel: "Excluir",
          destructive: true,
        });
        if (!ok) return;
        dispatchDomainEvent(deletePayslipEvent(p.id, deviceId ?? "local"));
        soundManager.play("success");
      }),
    [deleteFlight, domain.transactions, dispatchDomainEvent, deviceId],
  );

  const handleSave = useCallback(
    (save: PayslipReviewSave) =>
      saveFlight.run(async () => {
        const { values, income, inSlot } = save;
        setSaving(true);
        try {
          if (inSlot.length > 0) {
            const ok = await appConfirm({
              title: inSlot.length > 1 ? "Substituir holerites?" : "Substituir holerite?",
              message: replacePayslipMessage(inSlot),
              confirmLabel: "Substituir",
            });
            if (!ok) return;
          }
          let events;
          try {
            events = buildPayslipSaveEvents(values, { income, deviceId: deviceId ?? "local" });
          } catch (err) {
            console.warn("[Payslips] Falha ao montar o holerite:", err);
            soundManager.play("error");
            appAlert("Não foi possível salvar", "Confira os dados do holerite e tente de novo.");
            return;
          }
          // Holerite primeiro, depois a receita ligada a ele.
          for (const event of events) dispatchDomainEvent(event);
          soundManager.play("success");
          setReview(null);
        } finally {
          setSaving(false);
        }
      }),
    [saveFlight, deviceId, dispatchDomainEvent],
  );

  const goBack = () => {
    soundManager.play("tap");
    if (review) setReview(null);
    else router.back();
  };

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.title, { color: theme.textColor }]} accessibilityRole="header">
          {review ? "Revisar holerite" : "Holerites"}
        </Text>
        <View style={s.headerSpacer} />
      </View>

      {review ? (
        <PayslipReview
          key={review.key}
          initialDraft={review.draft}
          warnings={review.warnings}
          accounts={accounts}
          payslips={domain.payslips}
          theme={theme}
          bottomInset={insets.bottom}
          saving={saving}
          onCancel={() => setReview(null)}
          onSave={handleSave}
        />
      ) : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
          {saved.length === 0 && <PayslipEmptyState theme={theme} />}

          <Text style={[s.intro, { color: theme.secondaryText }]}>
            Fotografe o holerite ou preencha os valores. Você confere tudo antes de salvar.
          </Text>

          <View style={s.actions}>
            <CaptureButton
              icon="camera"
              label="Câmera"
              color="#4CAF50"
              disabled={scanning}
              theme={theme}
              onPress={() => handleScan("camera")}
            />
            <CaptureButton
              icon="image"
              label="Galeria"
              color="#2196F3"
              disabled={scanning}
              theme={theme}
              onPress={() => handleScan("gallery")}
            />
            <CaptureButton
              icon="edit-3"
              label="Preencher à mão"
              color="#F59E0B"
              disabled={scanning}
              theme={theme}
              onPress={() => {
                soundManager.play("tap");
                openManual();
              }}
            />
          </View>

          {scanning && (
            <View style={[s.scanning, { backgroundColor: theme.cardBackground }]}>
              <ActivityIndicator color={theme.primaryColor} />
              <Text style={{ color: theme.textColor }}>Lendo o holerite…</Text>
            </View>
          )}

          {saved.length > 0 && (
            <PayslipHistory
              summary={summary}
              series={series}
              deductionTotals={deductionTotals}
              deductionTitle={deductionTitle}
              payslips={saved}
              theme={theme}
              onDelete={handleDelete}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function CaptureButton({
  icon,
  label,
  color,
  disabled,
  theme,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  color: string;
  disabled: boolean;
  theme: { cardBackground: string; border: string; textColor: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.capture,
        { backgroundColor: theme.cardBackground, borderColor: theme.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[s.captureIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <Text style={[s.captureLabel, { color: theme.textColor }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  headerSpacer: { width: 24 },
  content: { paddingHorizontal: 20, gap: 12 },
  intro: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10 },
  capture: { flex: 1, alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 6 },
  captureIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  captureLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  scanning: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12 },
});
