import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
  LayoutAnimation,
  Switch,
  Modal,
  Pressable,
} from "react-native";
import {
  KeyboardAwareScrollViewCompat,
  SCROLL_BOTTOM_PADDING,
} from "@/components/KeyboardAwareScrollViewCompat";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { SupportModeSelector } from "@/src/components/monetization/SupportModeSelector";
import { soundManager } from "@/src/services/SoundManager";
import { SelectionModal } from "@/src/components/shared/SelectionModal";
import { ScreenIntroModal } from "@/src/components/tour/ScreenIntroModal";
import { useScreenIntro, resetAllScreenIntros } from "@/src/hooks/useScreenIntro";
import { SCREEN_INTROS } from "@/src/tour/screenIntroContent";

// Extracted components
import { ContactForm } from "@/src/components/about/ContactForm";
import { DonationSection , LinkRow } from "@/src/components/about/DonationSection";
import { PixelText } from "@/src/components/pixel";
import { TText, TButton } from "@/src/components/tamagui";
import { useExternalLookups } from "@/src/hooks/useExternalLookups";
import { formatPrivacyFlagText, PRIVACY_FLAG_TEXTS } from "@/src/constants/privacyFlagTexts";
import { appAlert } from "@/src/services/appAlert";

export default function AboutScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode, soundEnabled, setSoundEnabled, resetApp } = useAppState();
  const { showIntro, dismissIntro } = useScreenIntro("about");
  const externalLookups = useExternalLookups();

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleReset = useCallback(async () => {
    if (resetPhrase !== "APAGAR TUDO") return;
    setResetting(true);
    try {
      await resetApp();
      setShowResetModal(false);
      setResetPhrase("");
      router.replace("/(tabs)");
    } finally {
      setResetting(false);
    }
  }, [resetPhrase, resetApp, router]);

  const s = styles(theme);

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
          <TText variant="subtitle" bold color={theme.textColor} flex={1}>
            Sobre o DOMUS
          </TText>
        </View>

        <KeyboardAwareScrollViewCompat
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── COMPANY ─────────────────────────────────────────────────── */}
          <SectionCard
            theme={theme}
            icon="cpu"
            title="Pixel Eucarístico"
            accentColor={theme.primaryColor}
          >
            <PixelText size={9} color={theme.primaryColor} style={{ marginBottom: 8 }}>Pixel Eucarístico</PixelText>
            <TText variant="label" secondary lineHeight={20}>
              Tecnologia com propósito. A Pixel Eucarístico desenvolve
              soluções digitais que respeitam a privacidade do usuário e
              promovem autonomia financeira e crescimento pessoal.
            </TText>
            <TText variant="label" secondary lineHeight={20}>
              Criadora do DOMUS — seus dados ficam no seu dispositivo e só
              saem dele pelos recursos que você ativa.
            </TText>
          </SectionCard>

          {/* ── PROJECT ─────────────────────────────────────────────────── */}
          <SectionCard
            theme={theme}
            icon="home"
            title="Sobre o DOMUS"
            accentColor={theme.accentColor}
          >
            <FeatureRow icon="shield" color={theme.success} theme={theme} label="Privacidade em primeiro lugar" description="Sem servidor do DOMUS. Os dados só saem do aparelho pelos recursos que você ativa, e cada um diz o que envia." />
            <FeatureRow icon="database" color={theme.primaryColor} theme={theme} label="Arquitetura baseada em eventos" description="Histórico imutável e rastreável de transações." />
            <FeatureRow icon="hard-drive" color={theme.warning} theme={theme} label="Armazenamento local" description="SQLite no seu dispositivo, protegido pelo isolamento do sistema; o DOMUS não cifra o banco." />
            <FeatureRow icon="download" color={theme.accentColor} theme={theme} label="Backup manual e cifrado" description="AES-256-GCM com senha sua. Você controla tudo." />
            <TText variant="label" secondary lineHeight={20}>
              Ilustrações dos troféus com elementos do Twemoji (CC-BY 4.0) e do Bootstrap Icons (MIT).
            </TText>
          </SectionCard>

          {/* ── SUPPORT ─────────────────────────────────────────────────── */}
          <SectionCard theme={theme} icon="heart" title="Apoie o Projeto" accentColor="#E11D48" collapsible>
            <DonationSection theme={theme} />
          </SectionCard>

          {/* ── APOIO & ANÚNCIOS ─────────────────────────────────────────── */}
          <SectionCard theme={theme} icon="radio" title="Apoio & Anúncios" accentColor="#F59E0B" collapsible>
            <SupportModeSelector theme={theme} />
          </SectionCard>

          {/* ── SETTINGS ────────────────────────────────────────────────── */}
          <SectionCard theme={theme} icon="settings" title="Configurações" accentColor={theme.accentColor} collapsible>
              <LinkRow icon="cpu" label="IA Financeira" description="Provedor, chave de API, limites e custos" color="#6366F1" theme={theme} onPress={() => { soundManager.play("tap"); router.push("/ai-settings"); }} />
              <LinkRow icon="bell" label="Notificações" description="Lembretes, alertas de orçamento e resumos" color="#F59E0B" theme={theme} onPress={() => { soundManager.play("tap"); router.push("/notification-settings"); }} />
              <LinkRow icon="bar-chart" label="Analytics & Performance" description="Dados de uso, desempenho e falhas ao Firebase (Google)" color="#6366F1" theme={theme} onPress={() => { soundManager.play("tap"); router.push("/analytics-settings"); }} />
              <LinkRow icon="lock" label="Segurança" description="Bloqueio por PIN ou biometria" color={theme.primaryColor} theme={theme} onPress={() => { soundManager.play("tap"); router.push("/security-settings"); }} />
              <LinkRow icon="download-cloud" label="Backup & Restauração" description="Exportar e importar dados cifrados" color={theme.warning} theme={theme} onPress={() => { soundManager.play("tap"); router.push("/backup"); }} />
              <LinkRow icon="shield" label="Política de Privacidade" description="Como seus dados são protegidos" color={theme.primaryColor} theme={theme} onPress={() => { soundManager.play("tap"); router.push("/privacy-policy"); }} />
              <LinkRow icon="star" label="Avaliar na Play Store" description="Deixe sua avaliação e ajude o DOMUS a crescer" color="#34A853" theme={theme} onPress={() => { soundManager.play("tap"); Linking.openURL("https://play.google.com/store/apps/details?id=br.com.pixeleucaristico.domus"); }} />
              <LinkRow icon="moon" label="Tema" description={`Modo atual: ${themeMode === "system" ? "Sistema" : themeMode === "dark" ? "Escuro" : "Claro"}`} color={theme.accentColor} theme={theme} onPress={() => { soundManager.play("tap"); setThemeModalVisible(true); }} />
              <LinkRow icon="info" label="Ver Dicas das Telas" description="Reexibe as explicações de cada tela do DOMUS" color={theme.accentColor} theme={theme} onPress={() => { soundManager.play("tap"); resetAllScreenIntros(); }} />
              <SwitchRow icon="globe" label={PRIVACY_FLAG_TEXTS.externalLookups.title} description={PRIVACY_FLAG_TEXTS.externalLookups.shortDescription ?? ""} color={theme.accentColor} theme={theme} value={externalLookups.enabled} onValueChange={(v) => { externalLookups.setEnabled(v).catch(() => {}); }} onLearnMore={() => { soundManager.play("tap"); appAlert(PRIVACY_FLAG_TEXTS.externalLookups.title, formatPrivacyFlagText("externalLookups").replace("\n", "\n\n")); }} />
              <SwitchRow icon="volume-2" label="Efeitos Sonoros" description="Sons de confirmação e interações" color={theme.primaryColor} theme={theme} value={soundEnabled} onValueChange={setSoundEnabled} />
            </SectionCard>

          {/* ── CONTACT FORM ────────────────────────────────────────────── */}
          <SectionCard theme={theme} icon="mail" title="Fale Conosco" accentColor={theme.primaryColor} collapsible>
            <ContactForm theme={theme} />
          </SectionCard>

          {/* ── ZONA DE PERIGO ──────────────────────────────────────────── */}
          <View style={[s.dangerSection, { borderColor: "#DC2626", backgroundColor: "#DC262608" }]}>
            <View style={s.dangerHeader}>
              <Feather name="alert-triangle" size={15} color="#DC2626" />
              <TText variant="body" bold color="#DC2626">Zona de Perigo</TText>
            </View>
            <TText variant="label" color={theme.secondaryText} lineHeight={19}>
              Apaga todos os dados e retorna o aplicativo ao estado inicial, como se fosse recém-instalado.
            </TText>
            <TButton
              variant="danger"
              backgroundColor={theme.danger ?? "#DC2626"}
              icon={<Feather name="trash-2" size={15} color="#FFF" />}
              onPress={() => { soundManager.play("trash"); setResetPhrase(""); setShowResetModal(true); }}
            >
              Resetar aplicativo
            </TButton>
          </View>

          {/* ── FOOTER ──────────────────────────────────────────────────── */}
          <View style={s.footer}>
            <Feather name="lock" size={11} color={theme.secondaryText} />
            <PixelText size={6} color={theme.secondaryText}>DOMUS</PixelText>
            <TText variant="caption" color={theme.secondaryText} textAlign="center">
              · Pixel Eucarístico · Privacidade em primeiro lugar
            </TText>
          </View>
        </KeyboardAwareScrollViewCompat>

      {/* Reset Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={s.overlay}>
          <View style={[s.resetModal, { backgroundColor: theme.cardBackground }]}>
            <Feather name="alert-octagon" size={44} color="#DC2626" style={{ alignSelf: "center", marginBottom: 14 }} />
            <Text style={[s.resetModalTitle, { color: theme.textColor }]}>Resetar aplicativo</Text>
            <Text style={[s.resetModalDesc, { color: theme.secondaryText }]}>
              Todos os seus dados serão apagados permanentemente — transações, contas, listas de desejo e configurações de segurança.{"\n\n"}Esta ação não pode ser desfeita.
            </Text>
            <Text style={[s.resetModalLabel, { color: theme.secondaryText }]}>
              Digite{" "}
              <Text style={{ color: "#DC2626", fontFamily: "DMSans_700Bold" }}>APAGAR TUDO</Text>
              {" "}para confirmar:
            </Text>
            <TextInput
              style={[
                s.resetInput,
                {
                  color: theme.textColor,
                  borderColor: resetPhrase === "APAGAR TUDO" ? "#DC2626" : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              value={resetPhrase}
              onChangeText={setResetPhrase}
              placeholder="APAGAR TUDO"
              placeholderTextColor={theme.secondaryText}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={s.resetButtons}>
              <TButton
                variant="outline"
                flex={1}
                borderColor={theme.border}
                color={theme.textColor}
                onPress={() => { soundManager.play("tap"); setShowResetModal(false); setResetPhrase(""); }}
              >
                Cancelar
              </TButton>
              <TButton
                variant="danger"
                flex={1}
                backgroundColor={theme.danger ?? "#DC2626"}
                opacity={resetPhrase !== "APAGAR TUDO" ? 0.35 : 1}
                disabled={resetPhrase !== "APAGAR TUDO" || resetting}
                onPress={() => { soundManager.play("trash"); handleReset(); }}
              >
                {resetting ? "Resetando..." : "Resetar"}
              </TButton>
            </View>
          </View>
        </View>
      </Modal>

      <SelectionModal
        visible={themeModalVisible}
        title="Escolha o Tema"
        subtitle="Como você prefere visualizar o DOMUS?"
        theme={theme}
        onCancel={() => { soundManager.play("tap"); setThemeModalVisible(false); }}
        options={[
          { label: "Sistema", icon: "monitor", onPress: () => { soundManager.play("pop"); setThemeMode("system"); } },
          { label: "Claro", icon: "sun", onPress: () => { soundManager.play("pop"); setThemeMode("light"); } },
          { label: "Escuro", icon: "moon", onPress: () => { soundManager.play("pop"); setThemeMode("dark"); } },
        ]}
      />
      <ScreenIntroModal
        visible={showIntro}
        intro={SCREEN_INTROS.about}
        onDismiss={dismissIntro}
      />
    </SafeAreaView>
  );
}

// ─── sub-components (kept inline — small, page-specific) ─────────────────────

function SectionCard({
  theme,
  icon,
  title,
  accentColor,
  collapsible = false,
  forceOpen = false,
  children,
}: {
  theme: any;
  icon: string;
  title: string;
  accentColor: string;
  collapsible?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(forceOpen);
  const rotationAnim = useSharedValue(forceOpen ? 1 : 0);

  // Auto-expand when forceOpen becomes true
  React.useEffect(() => {
    if (forceOpen && !open) {
      rotationAnim.value = withTiming(1, { duration: 250 });
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deve reagir apenas a forceOpen; incluir 'open' reabriria a seção após o usuário fechá-la
  }, [forceOpen]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationAnim.value * 180}deg` }],
  }));

  const toggle = useCallback(() => {
    if (!collapsible) return;
    LayoutAnimation.configureNext({
      duration: 250,
      update: { type: "easeInEaseOut" },
      create: { type: "easeInEaseOut", property: "opacity" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    soundManager.play("tap");
    rotationAnim.value = withTiming(open ? 0 : 1, { duration: 250 });
    setOpen((v) => !v);
  }, [collapsible, open, rotationAnim]);

  const s = styles(theme);
  const showBody = !collapsible || open;

  return (
    <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <TouchableOpacity
        style={s.cardHeader}
        onPress={toggle}
        activeOpacity={collapsible ? 0.6 : 1}
        disabled={!collapsible}
      >
        <View style={[s.cardIconBg, { backgroundColor: accentColor + "18" }]}>
          <Feather name={icon as any} size={18} color={accentColor} />
        </View>
        <TText variant="subtitle" bold color={theme.textColor} flex={1}>{title}</TText>
        {collapsible && (
          <Animated.View style={chevronStyle}>
            <Feather name="chevron-down" size={18} color={theme.secondaryText} />
          </Animated.View>
        )}
      </TouchableOpacity>
      {showBody && (
        <>
          <View style={[s.cardDivider, { backgroundColor: theme.border }]} />
          <View style={s.cardBody}>{children}</View>
        </>
      )}
    </View>
  );
}

function FeatureRow({ icon, color, label, description, theme }: {
  icon: string; color: string; label: string; description: string; theme: any;
}) {
  return (
    <View style={featureRowStyles.row}>
      <View style={[featureRowStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <View style={featureRowStyles.texts}>
        <TText variant="label" color={theme.textColor} marginBottom={1}>{label}</TText>
        <TText variant="caption" color={theme.secondaryText} lineHeight={17}>{description}</TText>
      </View>
    </View>
  );
}

const featureRowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBg: { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center", marginTop: 1 },
  texts: { flex: 1 },
});

function SwitchRow({ icon, label, description, color, theme, value, onValueChange, onLearnMore }: {
  icon: string; label: string; description: string; color: string; theme: any; value: boolean; onValueChange: (v: boolean) => void;
  /** Mostra um "Saiba mais" que abre o texto completo (ex.: o que a flag envia e o que se perde). */
  onLearnMore?: () => void;
}) {
  return (
    <View style={switchRowStyles.row}>
      <View style={[switchRowStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={switchRowStyles.texts}>
        <Text style={[switchRowStyles.label, { color: theme.textColor }]}>{label}</Text>
        <Text style={[switchRowStyles.description, { color: theme.secondaryText }]}>{description}</Text>
        {onLearnMore ? (
          <Pressable
            onPress={onLearnMore}
            accessibilityRole="button"
            accessibilityLabel={`Saiba mais sobre ${label}`}
            hitSlop={8}
            style={switchRowStyles.learnMoreBtn}
          >
            <Text style={[switchRowStyles.learnMore, { color: theme.primaryColor }]}>Saiba mais</Text>
          </Pressable>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { soundManager.play("tap"); onValueChange(v); }}
        trackColor={{ true: theme.primaryColor }}
        thumbColor={Platform.OS === "ios" ? undefined : value ? "#fff" : "#f4f3f4"}
      />
    </View>
  );
}

const switchRowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  texts: { flex: 1 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  description: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 1 },
  learnMoreBtn: { alignSelf: "flex-start", marginTop: 2 },
  learnMore: { fontFamily: "DMSans_600SemiBold", fontSize: 12, textDecorationLine: "underline" },
});

// ─── stylesheet factory ───────────────────────────────────────────────────────

function styles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    backBtn: { padding: 4 },
    content: { paddingHorizontal: 16, paddingBottom: SCROLL_BOTTOM_PADDING, gap: 12 },
    card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
    cardIconBg: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center" },
    cardDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
    cardBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 },
    dangerSection: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
    dangerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    dangerBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: "#DC2626", borderRadius: 10,
      paddingVertical: 10, paddingHorizontal: 14, alignSelf: "flex-start",
    },
    dangerBtnText: { color: "#FFF", fontFamily: "DMSans_700Bold", fontSize: 13 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
    resetModal: { borderRadius: 18, padding: 24, width: "100%", maxWidth: 420 },
    resetModalTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, textAlign: "center", marginBottom: 12 },
    resetModalDesc: { fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 21, marginBottom: 18 },
    resetModalLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 8 },
    resetInput: { borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontFamily: "DMSans_500Medium", fontSize: 15, letterSpacing: 1, marginBottom: 20 },
    resetButtons: { flexDirection: "row", gap: 10 },
    resetCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 11, paddingVertical: 13, alignItems: "center" },
    resetConfirmBtn: { flex: 1, backgroundColor: "#DC2626", borderRadius: 11, paddingVertical: 13, alignItems: "center" },
    footer: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingVertical: 4 },
  });
}
