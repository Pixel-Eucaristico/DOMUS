import React from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { useAISettings } from "@/src/hooks/useAISettings";
import { useAIConsultant } from "@/src/hooks/useAIConsultant";
import { APIKeyManager } from "@/src/components/ai/APIKeyManager";
import { ProviderSelector } from "@/src/components/ai/ProviderSelector";
import { AIUsageDashboard } from "@/src/components/ai/AIUsageDashboard";

export default function AISettingsScreen() {
  const { theme } = useAppState();
  const { settings, isLoading, saveApiKey, deleteApiKey, updateSettings } =
    useAISettings();
  const { clearHistory } = useAIConsultant(settings);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.background }]}
      />
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textColor }]}>
          IA Financeira
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Master toggle */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.cardTitle, { color: theme.textColor }]}>
                Ativar IA
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>
                Requer chave de API configurada
              </Text>
            </View>
            <Switch
              value={settings.isEnabled}
              onValueChange={(v) =>
                updateSettings({ isEnabled: v && settings.hasApiKey })
              }
              trackColor={{ false: theme.border, true: theme.primaryColor }}
              thumbColor="#fff"
              disabled={!settings.hasApiKey}
            />
          </View>
        </View>

        {/* Provider + Model */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>
            Provedor e modelo
          </Text>
          <View style={styles.cardBody}>
            <ProviderSelector
              selectedProvider={settings.provider}
              selectedTier={settings.modelTier}
              onProviderChange={(provider) =>
                updateSettings({ provider, systemPromptSent: false })
              }
              onTierChange={(modelTier) => updateSettings({ modelTier })}
            />
          </View>
        </View>

        {/* API Key */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>
            Chave de API
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>
            Criptografada com AES-256 e armazenada localmente.
            Nunca enviada para servidores do DOMUS.
          </Text>
          <View style={styles.cardBody}>
            <APIKeyManager
              provider={settings.provider}
              hasKey={settings.hasApiKey}
              onSave={saveApiKey}
              onDelete={deleteApiKey}
            />
          </View>
        </View>

        {/* Privacy notice */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: `${theme.accentColor}15`,
              borderColor: `${theme.accentColor}40`,
            },
          ]}
        >
          <View style={styles.privacyHeader}>
            <Feather name="shield" size={16} color={theme.accentColor} />
            <Text style={[styles.privacyTitle, { color: theme.accentColor }]}>
              Privacidade
            </Text>
          </View>
          <Text style={[styles.privacyText, { color: theme.secondaryText }]}>
            A IA recebe apenas métricas agregadas (saldo total, média de
            gastos, scores de perfil). Nunca são enviados CPF, nome, número
            de conta, cartão ou IDs internos.
          </Text>
        </View>

        {/* Token usage */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Uso de tokens hoje
          </Text>
        </View>
        <AIUsageDashboard />

        {/* Clear AI history */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Dados e Privacidade
          </Text>
        </View>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              Alert.alert(
                "Limpar histórico da IA",
                "Isso apagará todas as mensagens da conversa atual. Esta ação não pode ser desfeita.",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Limpar",
                    style: "destructive",
                    onPress: clearHistory,
                  },
                ],
              );
            }}
            accessibilityLabel="Limpar histórico da IA"
            accessibilityRole="button"
          >
            <Feather name="trash-2" size={18} color={theme.warning} />
            <View style={styles.actionInfo}>
              <Text style={[styles.actionLabel, { color: theme.textColor }]}>
                Limpar histórico da IA
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>
                Remove todas as mensagens da conversa atual
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.secondaryText} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/privacy-policy")}
            accessibilityLabel="Ver política de privacidade"
            accessibilityRole="link"
          >
            <Feather name="shield" size={18} color={theme.primaryColor} />
            <View style={styles.actionInfo}>
              <Text style={[styles.actionLabel, { color: theme.textColor }]}>
                Política de Privacidade
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>
                Como seus dados e chaves de IA são protegidos
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.secondaryText} />
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardBody: {
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spacer: {
    height: 24,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  actionInfo: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
});
