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
import {
  hasActiveKey,
  AI_DATA_PERMISSION_LABELS,
} from "@/src/modules/ai/domain/AISettings";
import type { AIDataPermissions } from "@/src/modules/ai/domain/AISettings";
import { APIKeyManager } from "@/src/components/ai/APIKeyManager";
import { ProviderSelector } from "@/src/components/ai/ProviderSelector";
import { AIUsageDashboard } from "@/src/components/ai/AIUsageDashboard";
import { BudgetCostSection } from "@/src/components/ai/BudgetCostSection";
import type { AIProvider } from "@packages/ai";

export default function AISettingsScreen() {
  const { theme } = useAppState();
  const {
    settings,
    isLoading,
    saveApiKey,
    deleteApiKey,
    loginWithChatGPT,
    logoutChatGPT,
    updateSettings,
  } = useAISettings();
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
                updateSettings({ isEnabled: v && hasActiveKey(settings) })
              }
              trackColor={{ false: theme.border, true: theme.primaryColor }}
              thumbColor="#fff"
              disabled={!hasActiveKey(settings)}
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
              apiKeyStatus={settings.apiKeyStatus}
              usingChatGPTOAuth={
                settings.provider === "openai" &&
                settings.openaiAuthMethod === "chatgpt_oauth" &&
                settings.hasOAuthSession === true
              }
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
              hasKey={settings.apiKeyStatus[settings.provider] === true}
              openaiAuthMethod={settings.openaiAuthMethod}
              hasOAuthSession={settings.hasOAuthSession}
              onSave={saveApiKey}
              onDelete={deleteApiKey}
              onLoginChatGPT={loginWithChatGPT}
              onLogoutChatGPT={logoutChatGPT}
            />
          </View>
        </View>

        {/* Data access permissions */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>
            Acesso aos dados
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>
            Escolha quais dados a IA pode acessar para respostas mais
            detalhadas. Nenhum dado pessoal (CPF, nome, conta) e enviado.
          </Text>
          <View style={styles.cardBody}>
            {(Object.keys(AI_DATA_PERMISSION_LABELS) as Array<keyof AIDataPermissions>).map(
              (key) => {
                const label = AI_DATA_PERMISSION_LABELS[key];
                const enabled = settings.dataPermissions[key] ?? false;

                const handleToggle = (value: boolean) => {
                  if (value && !enabled) {
                    Alert.alert(
                      `Permitir acesso: ${label.title}`,
                      `A IA podera ver: ${label.description}.\n\nVoce pode desativar a qualquer momento.`,
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Permitir",
                          onPress: () =>
                            updateSettings({
                              dataPermissions: {
                                ...settings.dataPermissions,
                                [key]: true,
                              },
                            }),
                        },
                      ],
                    );
                  } else {
                    updateSettings({
                      dataPermissions: {
                        ...settings.dataPermissions,
                        [key]: false,
                      },
                    });
                  }
                };

                return (
                  <View key={key} style={styles.permissionRow}>
                    <View style={styles.permissionInfo}>
                      <Text style={[styles.permissionLabel, { color: theme.textColor }]}>
                        {label.title}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: theme.secondaryText }]}>
                        {label.description}
                      </Text>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={handleToggle}
                      trackColor={{ false: theme.border, true: theme.primaryColor }}
                      thumbColor="#fff"
                    />
                  </View>
                );
              },
            )}
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
            Os dados sao enviados diretamente ao provedor de IA escolhido.
            Nunca passam por servidores do DOMUS. CPF, nome, numero de
            conta, cartao ou IDs internos nunca sao incluidos.
          </Text>
        </View>

        {/* Budget & Cost */}
        <BudgetCostSection
          provider={settings.provider}
          modelTier={settings.modelTier}
          customBudgets={settings.customBudgets}
          budgetMode={settings.budgetMode ?? "daily"}
          monthlyBudgets={settings.monthlyBudgets}
          billingDay={settings.billingDay ?? 1}
          onBudgetChange={(budget) =>
            updateSettings({
              customBudgets: {
                ...settings.customBudgets,
                [settings.provider]: budget,
              },
            })
          }
          onMonthlyBudgetChange={(budget) =>
            updateSettings({
              monthlyBudgets: {
                ...settings.monthlyBudgets,
                [settings.provider]: budget,
              },
            })
          }
          onBudgetModeChange={(mode) => updateSettings({ budgetMode: mode })}
          onBillingDayChange={(day) => updateSettings({ billingDay: day })}
        />

        {/* Token usage */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            Uso de tokens hoje
          </Text>
        </View>
        <AIUsageDashboard
          modelTier={settings.modelTier}
          customBudgets={settings.customBudgets}
          budgetMode={settings.budgetMode}
          monthlyBudgets={settings.monthlyBudgets}
          billingDay={settings.billingDay}
        />

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
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  permissionInfo: {
    flex: 1,
    gap: 2,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
