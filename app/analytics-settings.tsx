import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { TCard, TText } from "@/src/components/tamagui";
import {
  loadAnalyticsSettings,
  saveAnalyticsSettings,
} from "@/src/modules/analytics/application/AnalyticsSettingsStore";
import { applyAnalyticsPreferences } from "@/src/modules/analytics/infrastructure/AnalyticsService";
import {
  DEFAULT_ANALYTICS_SETTINGS,
  type AnalyticsSettings,
} from "@/src/modules/analytics/domain/AnalyticsSettings";
import { PrivacyFlagNote } from "@/src/components/privacy/PrivacyFlagNote";
import type { PrivacyFlagId } from "@/src/constants/privacyFlagTexts";

export default function AnalyticsSettingsScreen() {
  const router = useRouter();
  const { theme } = useAppState();
  const [settings, setSettings] = useState<AnalyticsSettings>(DEFAULT_ANALYTICS_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const update = useCallback(
    async (patch: Partial<AnalyticsSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveAnalyticsSettings(next);
      await applyAnalyticsPreferences(next.analyticsEnabled, next.performanceEnabled, next.crashlyticsEnabled);
    },
    [settings],
  );

  const s = styles(theme);

  if (loading) return null;

  const anyEnabled = settings.analyticsEnabled || settings.performanceEnabled || settings.crashlyticsEnabled;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => { soundManager.play("tap"); router.back(); }}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <TText variant="subtitle" bold color={theme.textColor} fontSize={19} flex={1}>
          Analytics & Performance
        </TText>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status */}
        <View style={[s.statusCard, { backgroundColor: anyEnabled ? "#10B98118" : `${theme.secondaryText}15`, borderColor: anyEnabled ? "#10B981" : theme.border }]}>
          <View style={[s.statusIcon, { backgroundColor: anyEnabled ? "#10B98125" : `${theme.secondaryText}20` }]}>
            <Feather
              name={anyEnabled ? "check-circle" : "x-circle"}
              size={20}
              color={anyEnabled ? "#10B981" : theme.secondaryText}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.statusTitle, { color: anyEnabled ? "#10B981" : theme.secondaryText }]}>
              {anyEnabled ? "Compartilhamento Ativo" : "Compartilhamento Desativado"}
            </Text>
            <Text style={[s.statusDesc, { color: theme.secondaryText }]}>
              {anyEnabled
                ? "Dados de uso e desempenho estão sendo enviados ao Firebase (Google) para melhorar o DOMUS."
                : "Nenhum dado de uso ou desempenho está sendo coletado."}
            </Text>
          </View>
        </View>

        {/* Toggles */}
        <TCard backgroundColor={theme.cardBackground} borderColor={theme.border} padding={0}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIconBg, { backgroundColor: "#6366F118" }]}>
              <Feather name="sliders" size={16} color="#6366F1" />
            </View>
            <TText variant="subtitle" bold color={theme.textColor} fontSize={15} flex={1}>
              O que Compartilhar
            </TText>
          </View>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.cardBody}>
            <SwitchRow
              icon="bar-chart-2"
              label="Analytics de Uso"
              description="Uso geral do app, como aberturas e duração das sessões"
              flag="firebaseAnalytics"
              color="#6366F1"
              theme={theme}
              value={settings.analyticsEnabled}
              onValueChange={(v) => update({ analyticsEnabled: v })}
            />
            <SwitchRow
              icon="activity"
              label="Performance"
              description="Tempos de carregamento, de tela e de rede"
              flag="firebasePerformance"
              color="#10B981"
              theme={theme}
              value={settings.performanceEnabled}
              onValueChange={(v) => update({ performanceEnabled: v })}
            />
            <SwitchRow
              icon="alert-triangle"
              label="Crash Reports"
              description="Relatórios de falha, com a mensagem de erro, para correção rápida"
              flag="firebaseCrashlytics"
              color="#F59E0B"
              theme={theme}
              value={settings.crashlyticsEnabled}
              onValueChange={(v) => update({ crashlyticsEnabled: v })}
            />
          </View>
        </TCard>

        {/* O que coletamos */}
        <TCard backgroundColor={theme.cardBackground} borderColor={theme.border} padding={0}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIconBg, { backgroundColor: "#10B98118" }]}>
              <Feather name="eye" size={16} color="#10B981" />
            </View>
            <TText variant="subtitle" bold color={theme.textColor} fontSize={15} flex={1}>
              O que Coletamos
            </TText>
          </View>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.cardBody}>
            <InfoItem icon="check" color="#10B981" label="Uso do app (aberturas e sessões)" theme={theme} />
            <InfoItem icon="check" color="#10B981" label="Tempos de carregamento, de tela e de rede" theme={theme} />
            <InfoItem icon="check" color="#10B981" label="Relatórios de falha, com a mensagem de erro e a pilha de componentes" theme={theme} />
            <InfoItem icon="check" color="#10B981" label="Versão do app e do sistema" theme={theme} />
            <InfoItem icon="check" color="#10B981" label="ID da instalação do app e, no Analytics, o ID de publicidade" theme={theme} />
            <InfoItem icon="check" color="#10B981" label="Endereço IP, visto pelo Firebase" theme={theme} />
          </View>
        </TCard>

        {/* O que NÃO coletamos */}
        <TCard backgroundColor={theme.cardBackground} borderColor={theme.border} padding={0}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIconBg, { backgroundColor: "#EF444418" }]}>
              <Feather name="shield" size={16} color="#EF4444" />
            </View>
            <TText variant="subtitle" bold color={theme.textColor} fontSize={15} flex={1}>
              O que não Coletamos de Propósito
            </TText>
          </View>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.cardBody}>
            <InfoItem icon="x" color="#EF4444" label="Valores de transações ou saldos" theme={theme} />
            <InfoItem icon="x" color="#EF4444" label="Nomes de contas ou categorias" theme={theme} />
            <InfoItem icon="x" color="#EF4444" label="Dados pessoais (nome, email, CPF)" theme={theme} />
            <InfoItem icon="x" color="#EF4444" label="Chaves de API ou senhas" theme={theme} />
            <InfoItem icon="x" color="#EF4444" label="Conteúdo de conversas com IA" theme={theme} />
          </View>
        </TCard>

        {/* Desativar tudo */}
        {anyEnabled && (
          <TouchableOpacity
            style={[s.disableBtn, { borderColor: "#EF4444" }]}
            onPress={() => {
              soundManager.play("tap");
              update({ analyticsEnabled: false, performanceEnabled: false, crashlyticsEnabled: false });
            }}
            activeOpacity={0.8}
          >
            <Feather name="power" size={16} color="#EF4444" />
            <Text style={[s.disableBtnText, { color: "#EF4444" }]}>
              Desativar Todo Compartilhamento
            </Text>
          </TouchableOpacity>
        )}

        {/* Info */}
        <View style={[s.infoBox, { backgroundColor: `${theme.primaryColor}10` }]}>
          <Feather name="info" size={14} color={theme.primaryColor} />
          <Text style={[s.infoText, { color: theme.primaryColor }]}>
            Os dados são processados pelo Firebase (Google). Eles não levam seu nome,
            e-mail nem dados financeiros, mas incluem o ID da instalação do app e o
            endereço IP, por isso não são anônimos.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SwitchRow({
  icon,
  label,
  description,
  flag,
  color,
  theme,
  value,
  onValueChange,
}: {
  icon: string;
  label: string;
  description: string;
  flag: PrivacyFlagId;
  color: string;
  theme: any;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={swStyles.row}>
      <View style={[swStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={swStyles.texts}>
        <Text style={[swStyles.label, { color: theme.textColor }]}>{label}</Text>
        <Text style={[swStyles.description, { color: theme.secondaryText }]}>
          {description}
        </Text>
        <PrivacyFlagNote flag={flag} color={theme.secondaryText} />
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          soundManager.play("tap");
          onValueChange(v);
        }}
        trackColor={{ true: theme.primaryColor }}
        thumbColor={Platform.OS === "ios" ? undefined : value ? "#fff" : "#f4f3f4"}
      />
    </View>
  );
}

const swStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  texts: { flex: 1 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  description: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 1 },
});

function InfoItem({
  icon,
  color,
  label,
  theme,
}: {
  icon: string;
  color: string;
  label: string;
  theme: any;
}) {
  return (
    <View style={infoStyles.row}>
      <View style={[infoStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={13} color={color} />
      </View>
      <Text style={[infoStyles.label, { color: theme.textColor }]}>{label}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBg: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 },
});

// ─── Stylesheet ─────────────────────────────────────────────────────────────

function styles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    backBtn: { padding: 4 },
    content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    statusCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    statusIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    statusTitle: { fontFamily: "DMSans_700Bold", fontSize: 14 },
    statusDesc: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2, lineHeight: 17 },
    cardBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    sectionIconBg: {
      width: 36,
      height: 36,
      borderRadius: 11,
      justifyContent: "center",
      alignItems: "center",
    },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
    disableBtn: {
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    disableBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 12,
      padding: 14,
    },
    infoText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      lineHeight: 17,
      flex: 1,
    },
  });
}
