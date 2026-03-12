import React, { useRef, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "@/src/modules/notifications/application/NotificationSettingsStore";
import {
  requestPermission as requestNotifPermission,
  setupChannels,
  setupCategories,
} from "@/src/modules/notifications/infrastructure/NotificationService";
import {
  loadAnalyticsSettings,
  saveAnalyticsSettings,
} from "@/src/modules/analytics/application/AnalyticsSettingsStore";
import { applyAnalyticsPreferences } from "@/src/modules/analytics/infrastructure/AnalyticsService";
import {
  saveSupportModes,
  type SupportMode,
} from "@/src/modules/monetization/MonetizationSettingsStore";
import { ClipboardService } from "@/src/modules/security/application/ClipboardService";
import { useAISettings } from "@/src/hooks/useAISettings";
import type { AIProvider } from "@packages/ai";

const { width: SCREEN_W } = Dimensions.get("window");
const TOTAL_SLIDES = 6;

const PIX_KEY = "55.075.291/0001-79";
const KOFI_URL = "https://ko-fi.com/willianquintino33618";

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Erro", "Não foi possível abrir o link.");
  }
}

interface Props {
  visible: boolean;
  onComplete: () => void;
}

export function WelcomeCarousel({ visible, onComplete }: Props) {
  const { theme, setIsCatholic } = useAppState();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [slide, setSlide] = useState(0);

  // Slide 1: católico
  const [catholicChoice, setCatholicChoice] = useState<boolean | null>(null);
  // Slide 2: permissões
  const [cameraGranted, setCameraGranted] = useState(false);
  const [photosGranted, setPhotosGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  // Slide 3: analytics
  const [analyticsChoice, setAnalyticsChoice] = useState<boolean | null>(null);
  // Slide 4: suporte/monetização (multi-select)
  const [supportModes, setSupportModes] = useState<Set<SupportMode>>(new Set(["links"]));
  const [pixCopied, setPixCopied] = useState(false);

  const toggleMode = useCallback((mode: SupportMode) => {
    soundManager.play("tap");
    setSupportModes((prev) => {
      const next = new Set(prev);
      if (mode === "links") {
        // "links" é autônomo — selecionar ele limpa os outros
        return new Set(["links"]);
      }
      // Ao selecionar outro modo, remove "links" se estava sozinho
      next.delete("links");
      if (next.has(mode)) {
        next.delete(mode);
        // Se ficou vazio, volta para "links"
        if (next.size === 0) next.add("links");
      } else {
        next.add(mode);
      }
      return next;
    });
  }, []);
  // Slide 5: IA
  const { settings: aiSettings, saveApiKey, updateSettings } = useAISettings();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKeyInput.trim() || savingKey) return;
    setSavingKey(true);
    try {
      await updateSettings({ provider: selectedProvider });
      const ok = await saveApiKey(selectedProvider, apiKeyInput.trim());
      if (ok) {
        setApiKeySaved(true);
        setApiKeyInput("");
        soundManager.play("success");
      }
    } catch {
      // best-effort
    }
    setSavingKey(false);
  }, [apiKeyInput, selectedProvider, saveApiKey, updateSettings, savingKey]);

  // Finalizing
  const [finishing, setFinishing] = useState(false);

  const handleCopyPix = useCallback(async () => {
    soundManager.play("success");
    const ok = await ClipboardService.copy(PIX_KEY);
    if (ok) {
      if (Platform.OS !== "web") {
        const Haptics = await import("expo-haptics");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    }
  }, []);

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
    setSlide(idx);
  };

  const handleNext = () => {
    soundManager.play("tap");
    if (slide < TOTAL_SLIDES - 1) {
      goTo(slide + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    soundManager.play("tap");
    handleComplete();
  };

  const handleComplete = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      // Apply Catholic preference if chosen
      if (catholicChoice !== null) {
        setIsCatholic(catholicChoice);
      } else {
        setIsCatholic(false);
      }
      // Apply analytics if chosen
      if (analyticsChoice !== null) {
        const settings = await loadAnalyticsSettings();
        await saveAnalyticsSettings({
          ...settings,
          analyticsEnabled: analyticsChoice,
          performanceEnabled: analyticsChoice,
          crashlyticsEnabled: analyticsChoice,
          hasCompletedConsent: true,
        });
        if (analyticsChoice) {
          await applyAnalyticsPreferences(true, true, true);
        }
      } else {
        // Mark consent as done even if skipped (default off)
        const settings = await loadAnalyticsSettings();
        await saveAnalyticsSettings({ ...settings, hasCompletedConsent: true });
      }
      // Mark notifications setup as done
      const notifSettings = await loadNotificationSettings();
      await saveNotificationSettings({ ...notifSettings, hasCompletedSetup: true });
      // Save support modes choice
      await saveSupportModes(Array.from(supportModes));
    } catch {
      // best-effort
    }
    onComplete();
  };

  const [requestingCamera, setRequestingCamera] = useState(false);
  const [requestingPhotos, setRequestingPhotos] = useState(false);
  const [requestingNotif, setRequestingNotif] = useState(false);

  const handleRequestCamera = async () => {
    if (requestingCamera || cameraGranted) return;
    setRequestingCamera(true);
    try {
      const { Camera } = await import("expo-camera");
      const result = await Camera.requestCameraPermissionsAsync();
      setCameraGranted(result.status === "granted");
      soundManager.play("tap");
    } catch { /* best-effort */ }
    setRequestingCamera(false);
  };

  const handleRequestPhotos = async () => {
    if (requestingPhotos || photosGranted) return;
    setRequestingPhotos(true);
    try {
      const ImagePicker = await import("expo-image-picker");
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setPhotosGranted(result.status === "granted");
      soundManager.play("tap");
    } catch { /* best-effort */ }
    setRequestingPhotos(false);
  };

  const handleRequestNotif = async () => {
    if (requestingNotif || notifGranted) return;
    setRequestingNotif(true);
    try {
      const ok = await requestNotifPermission();
      setNotifGranted(ok);
      if (ok) { await setupChannels(); await setupCategories(); }
      soundManager.play("tap");
    } catch { /* best-effort */ }
    setRequestingNotif(false);
  };

  const isLastSlide = slide === TOTAL_SLIDES - 1;
  const canNext =
    slide === 0 ||
    (slide === 1 && catholicChoice !== null) ||
    slide === 2 ||
    (slide === 3 && analyticsChoice !== null) ||
    slide === 4 ||
    slide === 5;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[st.overlay, { backgroundColor: "rgba(0,0,0,0.85)" }]}>
        <View
          style={[
            st.container,
            {
              backgroundColor: theme.cardBackground,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Pular */}
          {!isLastSlide && (
            <TouchableOpacity style={st.skipBtn} onPress={handleSkip} hitSlop={12}>
              <Text style={[st.skipText, { color: theme.secondaryText }]}>Pular</Text>
            </TouchableOpacity>
          )}

          {/* Slides */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            {/* Slide 0: Boas-vindas */}
            <SlideWrapper>
              <View style={[st.iconCircle, { backgroundColor: `${theme.primaryColor}20` }]}>
                <Text style={{ fontSize: 40 }}>🏠</Text>
              </View>
              <Text style={[st.title, { color: theme.textColor }]}>Bem-vindo ao DOMUS!</Text>
              <Text style={[st.subtitle, { color: theme.secondaryText }]}>
                Seu assistente financeiro pessoal. Controle gastos, defina orçamentos, conquiste metas e mantenha suas finanças em dia — tudo local e seguro no seu dispositivo.
              </Text>
              <View style={[st.infoRow, { backgroundColor: `${theme.primaryColor}12` }]}>
                <Feather name="shield" size={16} color={theme.primaryColor} />
                <Text style={[st.infoText, { color: theme.primaryColor }]}>
                  100% offline. Seus dados nunca saem do seu celular sem sua permissão.
                </Text>
              </View>
              <View style={st.featureGrid}>
                <FeatureItem icon="trending-up" color="#10B981" label="Orçamento 50/30/20" theme={theme} />
                <FeatureItem icon="camera" color="#6366F1" label="Importar NF-e" theme={theme} />
                <FeatureItem icon="star" color="#F59E0B" label="Conquistas & XP" theme={theme} />
                <FeatureItem icon="cpu" color="#06B6D4" label="Assistente IA" theme={theme} />
              </View>
            </SlideWrapper>

            {/* Slide 1: Católico? */}
            <SlideWrapper>
              <Text style={{ fontSize: 48 }}>✝️</Text>
              <Text style={[st.title, { color: theme.textColor }]}>Você é católico(a)?</Text>
              <Text style={[st.subtitle, { color: theme.secondaryText }]}>
                Isso adiciona santos e festas litúrgicas ao sorteio mensal de Troféus Surpresa — como São Pedro e Paulo, Nossa Senhora Aparecida e Carlo Acutis.
              </Text>
              <View style={[st.infoRow, { backgroundColor: `${theme.primaryColor}12` }]}>
                <Text style={{ fontSize: 18 }}>🎴</Text>
                <Text style={[st.infoText, { color: theme.primaryColor }]}>
                  Feriados nacionais aparecem para todos. Apenas os troféus de santos são exclusivos.
                </Text>
              </View>
              <View style={st.choiceRow}>
                <TouchableOpacity
                  style={[
                    st.choiceBtn,
                    { borderColor: catholicChoice === true ? theme.primaryColor : theme.border },
                    catholicChoice === true && { backgroundColor: `${theme.primaryColor}15` },
                  ]}
                  onPress={() => { soundManager.play("tap"); setCatholicChoice(true); }}
                >
                  <Text style={[st.choiceBtnText, { color: catholicChoice === true ? theme.primaryColor : theme.textColor }]}>
                    ✝️  Sim, sou católico(a)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    st.choiceBtn,
                    { borderColor: catholicChoice === false ? theme.primaryColor : theme.border },
                    catholicChoice === false && { backgroundColor: `${theme.primaryColor}15` },
                  ]}
                  onPress={() => { soundManager.play("tap"); setCatholicChoice(false); }}
                >
                  <Text style={[st.choiceBtnText, { color: catholicChoice === false ? theme.primaryColor : theme.secondaryText }]}>
                    Não por enquanto
                  </Text>
                </TouchableOpacity>
              </View>
            </SlideWrapper>

            {/* Slide 2: Permissões */}
            <SlideWrapper>
              <View style={[st.iconCircle, { backgroundColor: "#6366F118" }]}>
                <Feather name="lock" size={36} color="#6366F1" />
              </View>
              <Text style={[st.title, { color: theme.textColor }]}>Permissões do App</Text>
              <Text style={[st.subtitle, { color: theme.secondaryText }]}>
                Todas opcionais — conceda agora ou depois nas configurações do sistema.
              </Text>
              <View style={st.permList}>
                <PermRow
                  icon="camera" color="#6366F1" label="Câmera"
                  desc="Escanear QR Code de notas fiscais"
                  granted={cameraGranted} requesting={requestingCamera}
                  onRequest={handleRequestCamera} theme={theme}
                />
                <PermRow
                  icon="image" color="#10B981" label="Fotos"
                  desc="Importar imagens de notas fiscais"
                  granted={photosGranted} requesting={requestingPhotos}
                  onRequest={handleRequestPhotos} theme={theme}
                />
                <PermRow
                  icon="bell" color="#F59E0B" label="Notificações"
                  desc="Lembretes e alertas de orçamento"
                  granted={notifGranted} requesting={requestingNotif}
                  onRequest={handleRequestNotif} theme={theme}
                />
              </View>
            </SlideWrapper>

            {/* Slide 3: Analytics */}
            <SlideWrapper>
              <View style={[st.iconCircle, { backgroundColor: "#6366F118" }]}>
                <Feather name="bar-chart" size={36} color="#6366F1" />
              </View>
              <Text style={[st.title, { color: theme.textColor }]}>Ajude a Melhorar o DOMUS</Text>
              <Text style={[st.subtitle, { color: theme.secondaryText }]}>
                Compartilhe dados anônimos de uso e desempenho para nos ajudar a identificar problemas e melhorar o app.
              </Text>
              <View style={[st.infoRow, { backgroundColor: `${theme.primaryColor}12` }]}>
                <Feather name="shield" size={16} color={theme.primaryColor} />
                <Text style={[st.infoText, { color: theme.primaryColor }]}>
                  Nenhum dado financeiro é coletado. Apenas métricas de uso — sem identificação pessoal.
                </Text>
              </View>
              <View style={st.choiceRow}>
                <TouchableOpacity
                  style={[
                    st.choiceBtn,
                    { borderColor: analyticsChoice === true ? "#6366F1" : theme.border },
                    analyticsChoice === true && { backgroundColor: "#6366F115" },
                  ]}
                  onPress={() => { soundManager.play("tap"); setAnalyticsChoice(true); }}
                >
                  <Feather name="check" size={16} color={analyticsChoice === true ? "#6366F1" : theme.secondaryText} />
                  <Text style={[st.choiceBtnText, { color: analyticsChoice === true ? "#6366F1" : theme.textColor }]}>
                    Sim, compartilhar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    st.choiceBtn,
                    { borderColor: analyticsChoice === false ? theme.primaryColor : theme.border },
                    analyticsChoice === false && { backgroundColor: `${theme.primaryColor}12` },
                  ]}
                  onPress={() => { soundManager.play("tap"); setAnalyticsChoice(false); }}
                >
                  <Text style={[st.choiceBtnText, { color: analyticsChoice === false ? theme.primaryColor : theme.secondaryText }]}>
                    Não, obrigado
                  </Text>
                </TouchableOpacity>
              </View>
            </SlideWrapper>

            {/* Slide 4: Transparência & Apoio */}
            <SlideWrapper>
              <View style={[st.iconCircle, { backgroundColor: "#F59E0B18" }]}>
                <Text style={{ fontSize: 32 }}>🔗</Text>
              </View>
              <Text style={[st.title, { color: theme.textColor }]}>Transparência em Primeiro Lugar</Text>
              <View style={[st.infoRow, { backgroundColor: "#F59E0B12" }]}>
                <Text style={{ fontSize: 16 }}>🔗</Text>
                <Text style={[st.infoText, { color: theme.textColor }]}>
                  Ao comprar pelos links gerados na Lista de Desejos (Amazon ou Mercado Livre), o DOMUS recebe uma comissão — sem custo extra para você. É assim que o app se sustenta.
                </Text>
              </View>
              <Text style={[st.sectionLabel, { color: theme.secondaryText }]}>Escolha seu nível de apoio:</Text>
              <View style={st.choiceRow}>
                <SupportOption
                  mode="links"
                  active={supportModes.has("links")}
                  onToggle={toggleMode}
                  color={theme.primaryColor}
                  label="🔗  Apenas Links na Lista"
                  desc="Padrão — sem anúncios extras"
                  theme={theme}
                />
                <SupportOption
                  mode="banners"
                  active={supportModes.has("banners")}
                  onToggle={toggleMode}
                  color={theme.primaryColor}
                  label="📢  Banner de Afiliados"
                  desc="Barra discreta Amazon/ML acima da navegação"
                  theme={theme}
                />
                <SupportOption
                  mode="daily_ad"
                  active={supportModes.has("daily_ad")}
                  onToggle={toggleMode}
                  color="#F59E0B"
                  label="⭐  Intersticial Diário"
                  desc="Anúncio Google em tela cheia 1× por dia"
                  theme={theme}
                />
                <SupportOption
                  mode="native_ad"
                  active={supportModes.has("native_ad")}
                  onToggle={toggleMode}
                  color="#6366F1"
                  label="🎯  Anúncio Nativo"
                  desc="Banner Google integrado ao layout do app"
                  theme={theme}
                />
                <SupportOption
                  mode="app_open"
                  active={supportModes.has("app_open")}
                  onToggle={toggleMode}
                  color="#10B981"
                  label="🚀  Abertura do App"
                  desc="Anúncio Google ao abrir ou retornar ao app"
                  theme={theme}
                />
              </View>
              <View style={st.donateRow}>
                <TouchableOpacity
                  style={[
                    st.donateBtn,
                    { backgroundColor: pixCopied ? "#10B981" : `${theme.primaryColor}15`, borderColor: pixCopied ? "#10B981" : `${theme.primaryColor}40` },
                  ]}
                  onPress={handleCopyPix}
                  activeOpacity={0.8}
                >
                  <Feather name={pixCopied ? "check" : "copy"} size={14} color={pixCopied ? "#FFF" : theme.primaryColor} />
                  <Text style={[st.donateBtnText, { color: pixCopied ? "#FFF" : theme.primaryColor }]}>
                    {pixCopied ? "Copiado!" : "Pix"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.donateBtn, { backgroundColor: "#FF5E5B18", borderColor: "#FF5E5B40" }]}
                  onPress={() => { soundManager.play("tap"); openUrl(KOFI_URL); }}
                  activeOpacity={0.8}
                >
                  <Feather name="coffee" size={14} color="#FF5E5B" />
                  <Text style={[st.donateBtnText, { color: "#FF5E5B" }]}>Ko-fi</Text>
                </TouchableOpacity>
              </View>
            </SlideWrapper>

            {/* Slide 5: IA */}
            <SlideWrapper>
              <View style={[st.iconCircle, { backgroundColor: "#06B6D418" }]}>
                <Feather name="cpu" size={36} color="#06B6D4" />
              </View>
              <Text style={[st.title, { color: theme.textColor }]}>Assistente Financeiro IA</Text>
              <View style={[st.infoRow, { backgroundColor: "#06B6D415" }]}>
                <Feather name="shield" size={16} color="#06B6D4" />
                <Text style={[st.infoText, { color: "#06B6D4" }]}>
                  Chave armazenada localmente com AES-256. Você pode pular e configurar depois em Configurações → Assistente IA.
                </Text>
              </View>
              {/* Seleção de provider */}
              <Text style={[st.sectionLabel, { color: theme.secondaryText }]}>Escolha o provedor:</Text>
              <View style={st.providerGrid}>
                {(["gemini", "openai", "claude", "deepseek", "qwen"] as AIProvider[]).map((p) => {
                  const colors: Record<AIProvider, string> = { gemini: "#4285F4", openai: "#10A37F", claude: "#D97706", deepseek: "#6366F1", qwen: "#8B5CF6" };
                  const labels: Record<AIProvider, string> = { gemini: "Gemini", openai: "OpenAI", claude: "Claude", deepseek: "DeepSeek", qwen: "Qwen" };
                  const hasKey = aiSettings.apiKeyStatus[p] === true;
                  const active = selectedProvider === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[st.providerBtn, { borderColor: active ? colors[p] : theme.border }, active && { backgroundColor: colors[p] + "15" }]}
                      onPress={() => { soundManager.play("tap"); setSelectedProvider(p); setApiKeySaved(false); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[st.providerLabel, { color: active ? colors[p] : theme.secondaryText }]}>{labels[p]}</Text>
                      {hasKey && <Feather name="check-circle" size={12} color="#10B981" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Campo de API key */}
              {apiKeySaved ? (
                <View style={[st.infoRow, { backgroundColor: "#10B98115" }]}>
                  <Feather name="check-circle" size={16} color="#10B981" />
                  <Text style={[st.infoText, { color: "#10B981" }]}>Chave salva com sucesso!</Text>
                </View>
              ) : (
                <View style={[st.apiKeyRow, { borderColor: theme.border, backgroundColor: theme.inputBackground ?? theme.cardBackground }]}>
                  <TextInput
                    style={[st.apiKeyInput, { color: theme.textColor }]}
                    placeholder={`Chave de API ${selectedProvider}`}
                    placeholderTextColor={theme.secondaryText}
                    value={apiKeyInput}
                    onChangeText={setApiKeyInput}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[st.apiKeySaveBtn, { backgroundColor: apiKeyInput.trim() ? "#06B6D4" : theme.border }]}
                    onPress={handleSaveApiKey}
                    disabled={!apiKeyInput.trim() || savingKey}
                  >
                    {savingKey ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="check" size={16} color="#FFF" />}
                  </TouchableOpacity>
                </View>
              )}
              <Text style={[st.footerNote, { color: theme.secondaryText }]}>
                Opcional — pode configurar depois em Configurações → Assistente IA.
              </Text>
            </SlideWrapper>
          </ScrollView>

          {/* Dots + Navegação */}
          <View style={st.bottomBar}>
            <View style={st.dots}>
              {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    st.dot,
                    {
                      backgroundColor: i === slide ? theme.primaryColor : `${theme.primaryColor}30`,
                      width: i === slide ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                st.nextBtn,
                { backgroundColor: canNext ? theme.primaryColor : `${theme.primaryColor}50` },
              ]}
              onPress={handleNext}
              disabled={!canNext || finishing}
            >
              {finishing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={st.nextBtnText}>
                    {isLastSlide ? "Começar Tour!" : "Próximo"}
                  </Text>
                  <Feather name={isLastSlide ? "play" : "arrow-right"} size={16} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SupportOption({
  mode, active, onToggle, color, label, desc, theme,
}: {
  mode: SupportMode; active: boolean; onToggle: (m: SupportMode) => void;
  color: string; label: string; desc: string; theme: any;
}) {
  return (
    <TouchableOpacity
      style={[
        st.choiceBtn,
        { borderColor: active ? color : theme.border },
        active && { backgroundColor: color + "15" },
      ]}
      onPress={() => onToggle(mode)}
      activeOpacity={0.75}
    >
      <View style={st.choiceBtnRow}>
        <Text style={[st.choiceBtnText, { color: active ? color : theme.textColor, flex: 1 }]}>
          {label}
        </Text>
        <View style={[
          st.checkbox,
          { borderColor: active ? color : theme.border },
          active && { backgroundColor: color },
        ]}>
          {active && <Feather name="check" size={11} color="#FFF" />}
        </View>
      </View>
      <Text style={[st.choiceDesc, { color: theme.secondaryText }]}>{desc}</Text>
    </TouchableOpacity>
  );
}

function SlideWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: SCREEN_W, paddingHorizontal: 28, paddingTop: 8, alignItems: "center", gap: 16 }}>
      {children}
    </View>
  );
}

function FeatureItem({ icon, color, label, theme }: { icon: string; color: string; label: string; theme: any }) {
  return (
    <View style={st.featureItem}>
      <View style={[st.featureIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[st.featureLabel, { color: theme.secondaryText }]}>{label}</Text>
    </View>
  );
}

function PermRow({ icon, color, label, desc, granted, requesting, onRequest, theme }: {
  icon: string; color: string; label: string; desc: string;
  granted: boolean; requesting: boolean; onRequest: () => void; theme: any;
}) {
  return (
    <View style={[st.permRow, { borderColor: granted ? "#10B98140" : theme.border, backgroundColor: granted ? "#10B98108" : "transparent" }]}>
      <View style={[st.featureIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.permLabel, { color: theme.textColor }]}>{label}</Text>
        <Text style={[st.permDesc, { color: theme.secondaryText }]}>{desc}</Text>
      </View>
      {granted ? (
        <Feather name="check-circle" size={20} color="#10B981" />
      ) : (
        <TouchableOpacity
          style={[st.permBtn, { backgroundColor: color + "20", borderColor: color + "40" }]}
          onPress={onRequest}
          disabled={requesting}
        >
          {requesting
            ? <ActivityIndicator size="small" color={color} />
            : <Text style={[st.permBtnText, { color }]}>Permitir</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "100%",
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 24,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
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
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    width: "100%",
  },
  featureItem: {
    alignItems: "center",
    gap: 6,
    width: "44%",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  featureLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    textAlign: "center",
  },
  choiceRow: {
    width: "100%",
    gap: 10,
  },
  choiceBtn: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  choiceBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
  permList: {
    width: "100%",
    gap: 8,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  permLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  permDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  permBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  permBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  actionBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  footerNote: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
  },
  bottomBar: {
    paddingHorizontal: 28,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  nextBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#FFF",
  },
  sectionLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  choiceBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  choiceDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  providerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  providerLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  apiKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
  },
  apiKeyInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  apiKeySaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  donateRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  donateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  donateBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
});
