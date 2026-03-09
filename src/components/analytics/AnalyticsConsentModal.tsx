import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { soundManager } from "@/src/services/SoundManager";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  loadAnalyticsSettings,
  saveAnalyticsSettings,
} from "@/src/modules/analytics/application/AnalyticsSettingsStore";
import { applyAnalyticsPreferences } from "@/src/modules/analytics/infrastructure/AnalyticsService";

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function AnalyticsConsentModal({ visible, onDone }: Props) {
  const { theme } = useAppState();

  const handleAccept = async () => {
    soundManager.play("success");
    try {
      const settings = await loadAnalyticsSettings();
      const updated = {
        ...settings,
        analyticsEnabled: true,
        performanceEnabled: true,
        hasCompletedConsent: true,
      };
      await saveAnalyticsSettings(updated);
      await applyAnalyticsPreferences(true, true);
    } catch {
      // best-effort
    }
    onDone();
  };

  const handleDecline = async () => {
    soundManager.play("tap");
    try {
      const settings = await loadAnalyticsSettings();
      await saveAnalyticsSettings({
        ...settings,
        analyticsEnabled: false,
        performanceEnabled: false,
        hasCompletedConsent: true,
      });
    } catch {
      // best-effort
    }
    onDone();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={st.overlay}>
        <View
          style={[
            st.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              shadowColor: theme.primaryColor,
            },
          ]}
        >
          <View style={[st.iconCircle, { backgroundColor: "#6366F118" }]}>
            <Feather name="bar-chart" size={32} color="#6366F1" />
          </View>

          <Text style={[st.title, { color: theme.textColor }]}>
            Ajude a Melhorar o DOMUS
          </Text>

          <Text style={[st.subtitle, { color: theme.secondaryText }]}>
            Você pode compartilhar dados anônimos de uso e desempenho para nos
            ajudar a identificar problemas e melhorar a experiência do app.
          </Text>

          <View style={[st.infoRow, { backgroundColor: `${theme.primaryColor}15` }]}>
            <Feather name="shield" size={16} color={theme.primaryColor} />
            <Text style={[st.infoText, { color: theme.primaryColor }]}>
              Nenhum dado financeiro é coletado. Apenas métricas de uso e
              desempenho — sem identificação pessoal.
            </Text>
          </View>

          <View style={st.features}>
            <FeatureItem
              icon="activity"
              color="#10B981"
              label="Performance do app (FPS, lentidão)"
              theme={theme}
            />
            <FeatureItem
              icon="bar-chart-2"
              color="#6366F1"
              label="Quais telas são mais usadas"
              theme={theme}
            />
            <FeatureItem
              icon="zap"
              color="#F59E0B"
              label="Crashes e erros para correção rápida"
              theme={theme}
            />
            <FeatureItem
              icon="eye-off"
              color="#8B5CF6"
              label="100% anônimo — sem dados financeiros"
              theme={theme}
            />
          </View>

          <TouchableOpacity
            style={[st.btn, { backgroundColor: "#6366F1" }]}
            onPress={handleAccept}
            activeOpacity={0.85}
          >
            <Feather name="check" size={18} color="#FFF" />
            <Text style={st.btnPrimaryText}>Compartilhar Dados Anônimos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.btn, st.btnSecondary, { borderColor: theme.border }]}
            onPress={handleDecline}
            activeOpacity={0.85}
          >
            <Text style={[st.btnSecondaryText, { color: theme.secondaryText }]}>
              Não, obrigado
            </Text>
          </TouchableOpacity>

          <Text style={[st.footer, { color: theme.secondaryText }]}>
            Você pode alterar isso a qualquer momento em Configurações → Analytics.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function FeatureItem({
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
    <View style={st.featureRow}>
      <View style={[st.featureIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={13} color={color} />
      </View>
      <Text style={[st.featureLabel, { color: theme.textColor }]}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 24,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    width: "100%",
  },
  infoText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  features: {
    width: "100%",
    gap: 8,
    paddingVertical: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  featureLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
  },
  footer: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
