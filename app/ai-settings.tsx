import React from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
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
import { TCard, TText } from "@/src/components/tamagui";
import type { AIProvider, AudioProvider } from "@packages/ai";
import { ELEVENLABS_VOICES } from "@packages/../packages/ai/src/audio/ElevenLabsAdapter";
import { GEMINI_TTS_VOICES } from "@packages/../packages/ai/src/audio/GeminiAudioAdapter";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ title, theme }: { title: string; theme: any }) {
  return (
    <View style={styles.sectionHeader}>
      <TText
        variant="caption"
        bold
        color={theme.secondaryText}
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        {title}
      </TText>
    </View>
  );
}

function Card({ theme, children }: { theme: any; children: React.ReactNode }) {
  return (
    <TCard backgroundColor={theme.cardBackground} borderColor={theme.border}>
      {children}
    </TCard>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onToggle,
  disabled,
  theme,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
  theme: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <TText variant="subtitle" color={disabled ? theme.secondaryText : theme.textColor} fontSize={15}>
          {title}
        </TText>
        <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
          {subtitle}
        </TText>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { soundManager.play("tap"); onToggle(v); }}
        trackColor={{ false: theme.border, true: theme.primaryColor }}
        thumbColor="#fff"
        disabled={disabled}
      />
    </View>
  );
}

function ChipSelector({
  options,
  selected,
  onSelect,
  theme,
}: {
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  theme: any;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map(({ id, label }) => (
        <TouchableOpacity
          key={id}
          onPress={() => { soundManager.play("tap"); onSelect(id); }}
          style={[
            styles.voiceChip,
            {
              backgroundColor: selected === id ? theme.primaryColor : theme.cardBackground,
              borderColor: selected === id ? theme.primaryColor : theme.border,
            },
          ]}
        >
          <Text style={{ fontSize: 13, color: selected === id ? "#fff" : theme.textColor }}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

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

  const isEnabled = settings.isEnabled;

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.background }]}
      />
    );
  }

  // Voice list based on audio provider
  const audioVoices = (() => {
    const prov = settings.audioProvider ?? "openai";
    if (prov === "openai") return ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"];
    if (prov === "elevenlabs") return Object.keys(ELEVENLABS_VOICES).slice(0, 12);
    if (prov === "gemini") return Object.keys(GEMINI_TTS_VOICES).slice(0, 12);
    return [];
  })();

  const currentAudioVoice = settings.audioVoice ?? (
    (settings.audioProvider ?? "openai") === "openai" ? (settings.openaiVoice ?? "nova") : audioVoices[0] ?? "nova"
  );

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
        <TouchableOpacity onPress={() => { soundManager.play("tap"); router.back(); }}>
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <TText variant="subtitle" bold color={theme.textColor} fontSize={18}>
          IA Financeira
        </TText>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={50}
      >
        {/* ════════════════════════════════════════════════════════════════════
            SECAO 1: ATIVACAO E PROVEDOR
            ════════════════════════════════════════════════════════════════════ */}
        <SectionHeader title="Configuração principal" theme={theme} />

        {/* Master toggle */}
        <Card theme={theme}>
          <ToggleRow
            title="Ativar IA"
            subtitle="Requer chave de API configurada"
            value={isEnabled}
            onToggle={(v) => updateSettings({ isEnabled: v && hasActiveKey(settings) })}
            disabled={!hasActiveKey(settings)}
            theme={theme}
          />
        </Card>

        {/* Provider + Model — always visible so user can configure before enabling */}
        <Card theme={theme}>
          <TText variant="subtitle" color={theme.textColor} fontSize={15}>
            Provedor e modelo
          </TText>
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
        </Card>

        {/* API Key — always visible */}
        <Card theme={theme}>
          <TText variant="subtitle" color={theme.textColor} fontSize={15}>
            Chave de API
          </TText>
          <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
            Criptografada com AES-256 e armazenada localmente.
            Nunca enviada para servidores do DOMUS.
          </TText>
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
            {/* Link to official docs for getting API key */}
            <TouchableOpacity
              onPress={() => {
                const urls: Record<string, string> = {
                  openai: "https://platform.openai.com/api-keys",
                  gemini: "https://aistudio.google.com/apikey",
                  claude: "https://console.anthropic.com/settings/keys",
                  deepseek: "https://platform.deepseek.com/api_keys",
                  qwen: "https://bailian.console.alibabacloud.com/#/model-market/detail/qwen-plus-latest",
                };
                Linking.openURL(urls[settings.provider] ?? urls.openai);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}
            >
              <Feather name="external-link" size={12} color={theme.primaryColor} />
              <TText variant="caption" color={theme.primaryColor}>
                Gerar chave de API — {
                  { openai: "OpenAI Platform", gemini: "Google AI Studio", claude: "Anthropic Console", deepseek: "DeepSeek Platform", qwen: "Alibaba DashScope" }[settings.provider] ?? settings.provider
                }
              </TText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const docs: Record<string, string> = {
                  openai: "https://platform.openai.com/docs/api-reference/chat",
                  gemini: "https://ai.google.dev/gemini-api/docs",
                  claude: "https://docs.anthropic.com/en/api/messages",
                  deepseek: "https://api-docs.deepseek.com/",
                  qwen: "https://help.aliyun.com/zh/model-studio/developer-reference/use-qwen-by-calling-api",
                };
                Linking.openURL(docs[settings.provider] ?? docs.openai);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}
            >
              <Feather name="book-open" size={12} color={theme.secondaryText} />
              <TText variant="caption" color={theme.secondaryText} fontSize={11}>
                Documentacao oficial
              </TText>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ════════════════════════════════════════════════════════════════════
            SECAO 2: FUNCIONALIDADES (so aparece se IA habilitada)
            ════════════════════════════════════════════════════════════════════ */}
        {isEnabled && (
          <>
            <SectionHeader title="Funcionalidades" theme={theme} />

            {/* Voice mode toggle */}
            <Card theme={theme}>
              <ToggleRow
                title="Modo Voz"
                subtitle="Microfone para entrada + resposta em audio (TTS)"
                value={settings.voiceEnabled ?? false}
                onToggle={(v) => updateSettings({ voiceEnabled: v })}
                theme={theme}
              />
            </Card>

            {/* Auto-play TTS toggle — only when voice is enabled */}
            {(settings.voiceEnabled ?? false) && (
              <Card theme={theme}>
                <ToggleRow
                  title="Falar direto"
                  subtitle="Ler automaticamente cada resposta da IA em audio"
                  value={settings.autoPlayTTS ?? false}
                  onToggle={(v) => updateSettings({ autoPlayTTS: v })}
                  theme={theme}
                />
              </Card>
            )}

            {/* Audio provider config — only when voice is enabled */}
            {(settings.voiceEnabled ?? false) && (
              <Card theme={theme}>
                <TText variant="subtitle" color={theme.textColor} fontSize={15}>
                  Provedor de Audio (TTS)
                </TText>
                <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                  Independente do provedor de texto. Cada um tem custos proprios.
                </TText>

                {/* Claude warning — no native TTS */}
                {settings.provider === "claude" && (
                  <View style={[styles.hint, { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, backgroundColor: `${theme.warning}15`, padding: 8, borderRadius: 8 }]}>
                    <Feather name="alert-triangle" size={13} color={theme.warning} />
                    <Text style={{ fontSize: 12, color: theme.warning, flex: 1 }}>
                      Claude nao possui TTS proprio. Selecione um provedor de audio abaixo para usar o modo voz.
                    </Text>
                  </View>
                )}

                <View style={{ marginTop: 8, gap: 12 }}>
                  <ChipSelector
                    options={[
                      { id: "openai", label: "OpenAI TTS" },
                      { id: "gemini", label: "Gemini TTS" },
                      { id: "elevenlabs", label: "ElevenLabs" },
                    ]}
                    selected={settings.audioProvider ?? "openai"}
                    onSelect={(id) => updateSettings({ audioProvider: id as AudioProvider, audioVoice: undefined })}
                    theme={theme}
                  />

                  {/* API Key info per audio provider */}
                  {settings.audioProvider === "elevenlabs" && (
                    <View style={{ gap: 4 }}>
                      <View style={{ backgroundColor: "rgba(251, 191, 36, 0.1)", borderRadius: 8, padding: 8, marginBottom: 4 }}>
                        <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "DMSans_500Medium" }}>
                          Requer plano pago (Starter $5/mes). O free tier nao permite uso de vozes via API.
                        </Text>
                      </View>
                      <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                        Chave ElevenLabs (BYOK)
                      </TText>
                      <APIKeyManager
                        provider={"elevenlabs" as AIProvider}
                        hasKey={settings.elevenLabsKeyStatus === true}
                        openaiAuthMethod="apikey"
                        hasOAuthSession={false}
                        onSave={async (_, key) => {
                          await saveApiKey("elevenlabs" as AIProvider, key);
                          updateSettings({ elevenLabsKeyStatus: true });
                          return true;
                        }}
                        onDelete={async () => {
                          await deleteApiKey("elevenlabs" as AIProvider);
                          updateSettings({ elevenLabsKeyStatus: false });
                        }}
                        onLoginChatGPT={async (_onCode) => false}
                        onLogoutChatGPT={async () => {}}
                      />
                      <TouchableOpacity
                        onPress={() => Linking.openURL("https://elevenlabs.io/app/settings/api-keys")}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}
                      >
                        <Feather name="external-link" size={11} color={theme.primaryColor} />
                        <Text style={{ color: theme.primaryColor, fontSize: 11 }}>Obter chave ElevenLabs</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* For OpenAI/Gemini TTS: show API key manager */}
                  {(settings.audioProvider === "openai" || settings.audioProvider === "gemini") && (
                    <View style={{ gap: 4 }}>
                      <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                        Chave {(settings.audioProvider ?? "openai").toUpperCase()} (mesma do provedor de texto)
                      </TText>
                      <APIKeyManager
                        provider={(settings.audioProvider ?? "openai") as AIProvider}
                        hasKey={settings.apiKeyStatus[settings.audioProvider ?? "openai"] === true}
                        openaiAuthMethod="apikey"
                        hasOAuthSession={false}
                        onSave={saveApiKey}
                        onDelete={deleteApiKey}
                        onLoginChatGPT={async (_onCode) => false}
                        onLogoutChatGPT={async () => {}}
                      />
                    </View>
                  )}

                  {/* Gemini TTS model selector (flash = fast, pro = quality) */}
                  {settings.audioProvider === "gemini" && (
                    <View style={{ gap: 4 }}>
                      <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                        Modelo TTS
                      </TText>
                      <ChipSelector
                        options={[
                          { id: "gemini-2.5-flash-preview-tts", label: "Flash (rapido)" },
                          { id: "gemini-2.5-pro-preview-tts", label: "Pro (qualidade)" },
                        ]}
                        selected={settings.audioVoice?.includes("pro") ? "gemini-2.5-pro-preview-tts" : "gemini-2.5-flash-preview-tts"}
                        onSelect={(id) => updateSettings({ audioVoice: id.includes("pro") ? "pro:" + (settings.audioVoice?.split(":")[1] ?? "kore") : "flash:" + (settings.audioVoice?.split(":")[1] ?? "kore") })}
                        theme={theme}
                      />
                    </View>
                  )}

                  {/* Voice selector */}
                  <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                    Voz
                  </TText>
                  <ChipSelector
                    options={audioVoices.map((v) => ({ id: v, label: v }))}
                    selected={currentAudioVoice}
                    onSelect={(v) => updateSettings({ audioVoice: v })}
                    theme={theme}
                  />
                </View>
              </Card>
            )}

            {/* Vision OCR toggle */}
            <Card theme={theme}>
              <ToggleRow
                title="OCR por Visao (IA)"
                subtitle="Usar IA para ler notas fiscais e holerites via camera"
                value={settings.visionOCREnabled ?? false}
                onToggle={(v) => updateSettings({ visionOCREnabled: v })}
                theme={theme}
              />
              {(settings.visionOCREnabled ?? false) && (
                <Text style={[styles.hint, { color: theme.secondaryText }]}>
                  Usa o provedor de IA ativo ({settings.provider}) para analisar imagens.
                  Consome tokens do seu orcamento.
                </Text>
              )}
            </Card>

            {/* Tooltips toggle */}
            <Card theme={theme}>
              <ToggleRow
                title="Dicas Financeiras"
                subtitle="Tooltips educativos sobre termos financeiros no chat"
                value={settings.tooltipsEnabled ?? true}
                onToggle={(v) => updateSettings({ tooltipsEnabled: v })}
                theme={theme}
              />
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            SECAO 3: PERMISSOES DE DADOS (so aparece se IA habilitada)
            ════════════════════════════════════════════════════════════════════ */}
        {isEnabled && (
          <>
            <SectionHeader title="Acesso aos dados" theme={theme} />

            <Card theme={theme}>
              <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                Escolha quais dados a IA pode acessar para respostas mais
                detalhadas. Nenhum dado pessoal (CPF, nome, conta) e enviado.
              </TText>
              <View style={styles.cardBody}>
                {(Object.keys(AI_DATA_PERMISSION_LABELS) as Array<keyof AIDataPermissions>).map(
                  (key) => {
                    const label = AI_DATA_PERMISSION_LABELS[key];
                    const enabled = settings.dataPermissions[key] ?? false;

                    const handleToggle = (value: boolean) => {
                      soundManager.play("tap");
                      if (value && !enabled) {
                        if (Platform.OS === "web") {
                          const ok = window.confirm(
                            `Permitir acesso: ${label.title}\n\nA IA podera ver: ${label.description}.\n\nVoce pode desativar a qualquer momento.`,
                          );
                          if (ok) {
                            updateSettings({
                              dataPermissions: { ...settings.dataPermissions, [key]: true },
                            });
                          }
                        } else {
                          Alert.alert(
                            `Permitir acesso: ${label.title}`,
                            `A IA podera ver: ${label.description}.\n\nVoce pode desativar a qualquer momento.`,
                            [
                              { text: "Cancelar", style: "cancel" },
                              {
                                text: "Permitir",
                                onPress: () =>
                                  updateSettings({
                                    dataPermissions: { ...settings.dataPermissions, [key]: true },
                                  }),
                              },
                            ],
                          );
                        }
                      } else {
                        updateSettings({
                          dataPermissions: { ...settings.dataPermissions, [key]: false },
                        });
                      }
                    };

                    return (
                      <View key={key} style={styles.permissionRow}>
                        <View style={styles.permissionInfo}>
                          <TText variant="label" bold color={theme.textColor}>
                            {label.title}
                          </TText>
                          <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                            {label.description}
                          </TText>
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
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            SECAO 4: ORCAMENTO E USO (so aparece se IA habilitada)
            ════════════════════════════════════════════════════════════════════ */}
        {isEnabled && (
          <>
            <SectionHeader title="Orcamento e uso" theme={theme} />

            <BudgetCostSection
              provider={settings.provider}
              modelTier={settings.modelTier}
              customBudgets={settings.customBudgets}
              budgetMode={settings.budgetMode ?? "daily"}
              monthlyBudgets={settings.monthlyBudgets}
              billingDay={settings.billingDay ?? 1}
              onBudgetChange={(budget) =>
                updateSettings({
                  customBudgets: { ...settings.customBudgets, [settings.provider]: budget },
                })
              }
              onMonthlyBudgetChange={(budget) =>
                updateSettings({
                  monthlyBudgets: { ...settings.monthlyBudgets, [settings.provider]: budget },
                })
              }
              onBudgetModeChange={(mode) => updateSettings({ budgetMode: mode })}
              onBillingDayChange={(day) => updateSettings({ billingDay: day })}
            />

            <SectionHeader title="Uso de tokens hoje" theme={theme} />
            <AIUsageDashboard
              modelTier={settings.modelTier}
              customBudgets={settings.customBudgets}
              budgetMode={settings.budgetMode}
              monthlyBudgets={settings.monthlyBudgets}
              billingDay={settings.billingDay}
            />
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            SECAO 5: PRIVACIDADE (sempre visivel)
            ════════════════════════════════════════════════════════════════════ */}
        <SectionHeader title="Privacidade e dados" theme={theme} />

        {/* Privacy notice */}
        <TCard
          backgroundColor={`${theme.accentColor}15`}
          borderColor={`${theme.accentColor}40`}
          gap={8}
        >
          <View style={styles.privacyHeader}>
            <Feather name="shield" size={16} color={theme.accentColor} />
            <TText variant="label" bold color={theme.accentColor}>
              Privacidade
            </TText>
          </View>
          <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
            Os dados sao enviados diretamente ao provedor de IA escolhido.
            Nunca passam por servidores do DOMUS. CPF, nome, numero de
            conta, cartao ou IDs internos nunca sao incluidos.
          </TText>
        </TCard>

        {/* Actions */}
        <Card theme={theme}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              soundManager.play("tap");
              if (Platform.OS === "web") {
                const ok = window.confirm("Limpar histórico da IA\n\nIsso apagará todas as mensagens da conversa atual. Esta ação não pode ser desfeita.");
                if (ok) { soundManager.play("trash"); clearHistory(); }
              } else {
                Alert.alert(
                  "Limpar histórico da IA",
                  "Isso apagará todas as mensagens da conversa atual. Esta ação não pode ser desfeita.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Limpar",
                      style: "destructive",
                      onPress: () => { soundManager.play("trash"); clearHistory(); },
                    },
                  ],
                );
              }
            }}
            accessibilityLabel="Limpar historico da IA"
            accessibilityRole="button"
          >
            <Feather name="trash-2" size={18} color={theme.warning} />
            <View style={styles.actionInfo}>
              <TText variant="subtitle" color={theme.textColor} fontSize={15}>
                Limpar historico da IA
              </TText>
              <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                Remove todas as mensagens da conversa atual
              </TText>
            </View>
            <Feather name="chevron-right" size={16} color={theme.secondaryText} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => { soundManager.play("tap"); router.push("/privacy-policy"); }}
            accessibilityLabel="Ver politica de privacidade"
            accessibilityRole="link"
          >
            <Feather name="shield" size={18} color={theme.primaryColor} />
            <View style={styles.actionInfo}>
              <TText variant="subtitle" color={theme.textColor} fontSize={15}>
                Politica de Privacidade
              </TText>
              <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
                Como seus dados e chaves de IA sao protegidos
              </TText>
            </View>
            <Feather name="chevron-right" size={16} color={theme.secondaryText} />
          </TouchableOpacity>
        </Card>

        <View style={styles.spacer} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  content: {
    padding: 16,
    gap: 12,
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
  voiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: "italic",
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    marginTop: 6,
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
});
