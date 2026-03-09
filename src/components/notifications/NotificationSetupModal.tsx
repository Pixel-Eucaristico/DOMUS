import React, { useState, useEffect } from "react";
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
  loadNotificationSettings,
  saveNotificationSettings,
} from "@/src/modules/notifications/application/NotificationSettingsStore";
import {
  requestPermission,
  setupChannels,
  setupCategories,
} from "@/src/modules/notifications/infrastructure/NotificationService";
import type { NotificationSettings } from "@/src/modules/notifications/domain/NotificationSettings";

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function NotificationSetupModal({ visible, onDone }: Props) {
  const { theme } = useAppState();

  const handleEnable = async () => {
    soundManager.play("success");
    try {
      const granted = await requestPermission();
      const settings = await loadNotificationSettings();
      const updated: NotificationSettings = {
        ...settings,
        enabled: granted,
        hasCompletedSetup: true,
      };
      if (granted) {
        await setupChannels();
        await setupCategories();
      }
      await saveNotificationSettings(updated);
    } catch {
      // best-effort
    }
    onDone();
  };

  const handleSkip = async () => {
    soundManager.play("tap");
    try {
      const settings = await loadNotificationSettings();
      await saveNotificationSettings({ ...settings, hasCompletedSetup: true });
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
          <View style={[st.iconCircle, { backgroundColor: "#F59E0B18" }]}>
            <Feather name="bell" size={32} color="#F59E0B" />
          </View>

          <Text style={[st.title, { color: theme.textColor }]}>
            Lembretes Inteligentes
          </Text>

          <Text style={[st.subtitle, { color: theme.secondaryText }]}>
            O DOMUS pode te lembrar de vencimentos, alertar quando o orçamento
            estiver no limite e enviar um resumo semanal das suas finanças.
          </Text>

          <View style={[st.infoRow, { backgroundColor: `${theme.primaryColor}15` }]}>
            <Feather name="shield" size={16} color={theme.primaryColor} />
            <Text style={[st.infoText, { color: theme.primaryColor }]}>
              100% local — nenhum dado sai do seu dispositivo. Sem servidores push.
            </Text>
          </View>

          <View style={st.features}>
            <FeatureItem icon="credit-card" color="#EF4444" label="Vencimento de contas" theme={theme} />
            <FeatureItem icon="pie-chart" color="#F59E0B" label="Alertas de orçamento" theme={theme} />
            <FeatureItem icon="target" color="#10B981" label="Metas de poupança" theme={theme} />
            <FeatureItem icon="bar-chart-2" color="#06B6D4" label="Resumo semanal" theme={theme} />
          </View>

          <TouchableOpacity
            style={[st.btn, { backgroundColor: "#F59E0B" }]}
            onPress={handleEnable}
            activeOpacity={0.85}
          >
            <Feather name="bell" size={18} color="#FFF" />
            <Text style={st.btnPrimaryText}>Ativar Notificações</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.btn, st.btnSecondary, { borderColor: theme.border }]}
            onPress={handleSkip}
            activeOpacity={0.85}
          >
            <Text style={[st.btnSecondaryText, { color: theme.secondaryText }]}>
              Agora não
            </Text>
          </TouchableOpacity>

          <Text style={[st.footer, { color: theme.secondaryText }]}>
            Você pode configurar isso depois em Configurações → Notificações.
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
