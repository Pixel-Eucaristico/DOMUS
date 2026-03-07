import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Switch,
  Modal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { useDemoMode } from "@/src/context/DemoModeProvider";
import { soundManager } from "@/src/services/SoundManager";
import { SelectionModal } from "@/src/components/shared/SelectionModal";

// Extracted components
import { ContactForm } from "@/src/components/about/ContactForm";
import { DonationSection } from "@/src/components/about/DonationSection";
import { LinkRow } from "@/src/components/about/DonationSection";

export default function AboutScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode, soundEnabled, setSoundEnabled, resetApp } = useAppState();
  const { startDemo } = useDemoMode();

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => { soundManager.play("tap"); router.back(); }}
            style={s.backBtn}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={theme.textColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.textColor }]}>
            Sobre o DOMUS
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── COMPANY ─────────────────────────────────────────────────── */}
          <SectionCard
            theme={theme}
            icon="cpu"
            title="Pixel Eucarístico"
            accentColor={theme.primaryColor}
          >
            <Text style={[s.bodyText, { color: theme.secondaryText }]}>
              Tecnologia com propósito. A Pixel Eucarístico desenvolve
              soluções digitais que respeitam a privacidade do usuário e
              promovem autonomia financeira e crescimento pessoal.
            </Text>
            <Text style={[s.bodyText, { color: theme.secondaryText }]}>
              Criadora do DOMUS — seus dados ficam no seu dispositivo,
              nunca em servidores de terceiros.
            </Text>
          </SectionCard>

          {/* ── PROJECT ─────────────────────────────────────────────────── */}
          <SectionCard
            theme={theme}
            icon="home"
            title="Sobre o DOMUS"
            accentColor={theme.accentColor}
          >
            <FeatureRow icon="shield" color={theme.success} theme={theme} label="Privacidade em primeiro lugar" description="Nenhum dado é enviado para servidores." />
            <FeatureRow icon="database" color={theme.primaryColor} theme={theme} label="Arquitetura baseada em eventos" description="Histórico imutável e rastreável de transações." />
            <FeatureRow icon="hard-drive" color={theme.warning} theme={theme} label="Armazenamento local" description="SQLite criptografado no seu dispositivo." />
            <FeatureRow icon="download" color={theme.accentColor} theme={theme} label="Backup manual e cifrado" description="AES-256-GCM com senha sua. Você controla tudo." />
          </SectionCard>

          {/* ── SUPPORT ─────────────────────────────────────────────────── */}
          <SectionCard theme={theme} icon="heart" title="Apoie o Projeto" accentColor="#E11D48" collapsible>
            <DonationSection theme={theme} />
          </SectionCard>

          {/* ── SETTINGS ────────────────────────────────────────────────── */}
          <SectionCard theme={theme} icon="settings" title="Configurações" accentColor={theme.accentColor} collapsible>
            <LinkRow icon="cpu" label="IA Financeira" description="Provedor, chave de API, limites e custos" color="#6366F1" theme={theme} onPress={() => { soundManager.play("tap"); router.push("/ai-settings"); }} />
            <LinkRow icon="lock" label="Segurança" description="Bloqueio por PIN ou biometria" color={theme.primaryColor} theme={theme} onPress={() => { soundManager.play("tap"); router.push("/security-settings"); }} />
            <LinkRow icon="download-cloud" label="Backup & Restauração" description="Exportar e importar dados cifrados" color={theme.warning} theme={theme} onPress={() => { soundManager.play("tap"); router.push("/backup"); }} />
            <LinkRow icon="shield" label="Política de Privacidade" description="Como seus dados são protegidos" color={theme.primaryColor} theme={theme} onPress={() => { soundManager.play("tap"); router.push("/privacy-policy"); }} />
            <LinkRow icon="moon" label="Tema" description={`Modo atual: ${themeMode === "system" ? "Sistema" : themeMode === "dark" ? "Escuro" : "Claro"}`} color={theme.accentColor} theme={theme} onPress={() => { soundManager.play("tap"); setThemeModalVisible(true); }} />
            <LinkRow icon="play-circle" label="Refazer Tour do App" description="Reveja o guia de todas as funções do DOMUS (sandbox seguro)" color={theme.accentColor} theme={theme} onPress={() => { soundManager.play("tap"); router.back(); setTimeout(startDemo, 300); }} />
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
              <Text style={[s.dangerTitle, { color: "#DC2626" }]}>Zona de Perigo</Text>
            </View>
            <Text style={[s.dangerDesc, { color: theme.secondaryText }]}>
              Apaga todos os dados e retorna o aplicativo ao estado inicial, como se fosse recém-instalado.
            </Text>
            <TouchableOpacity
              style={s.dangerBtn}
              onPress={() => { soundManager.play("trash"); setResetPhrase(""); setShowResetModal(true); }}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={15} color="#FFF" />
              <Text style={s.dangerBtnText}>Resetar aplicativo</Text>
            </TouchableOpacity>
          </View>

          {/* ── FOOTER ──────────────────────────────────────────────────── */}
          <View style={s.footer}>
            <Feather name="lock" size={11} color={theme.secondaryText} />
            <Text style={[s.footerText, { color: theme.secondaryText }]}>
              DOMUS · Pixel Eucarístico · Privacidade em primeiro lugar
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
              <TouchableOpacity
                style={[s.resetCancelBtn, { borderColor: theme.border }]}
                onPress={() => { soundManager.play("tap"); setShowResetModal(false); setResetPhrase(""); }}
              >
                <Text style={{ color: theme.textColor, fontFamily: "DMSans_500Medium", fontSize: 14 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.resetConfirmBtn, resetPhrase !== "APAGAR TUDO" && { opacity: 0.35 }]}
                onPress={() => { soundManager.play("trash"); handleReset(); }}
                disabled={resetPhrase !== "APAGAR TUDO" || resetting}
                activeOpacity={0.8}
              >
                {resetting
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={{ color: "#FFF", fontFamily: "DMSans_700Bold", fontSize: 14 }}>Resetar</Text>}
              </TouchableOpacity>
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
  children,
}: {
  theme: any;
  icon: string;
  title: string;
  accentColor: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rotationAnim = useSharedValue(0);

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
        <Text style={[s.cardTitle, { color: theme.textColor }]}>{title}</Text>
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
        <Text style={[featureRowStyles.label, { color: theme.textColor }]}>{label}</Text>
        <Text style={[featureRowStyles.description, { color: theme.secondaryText }]}>{description}</Text>
      </View>
    </View>
  );
}

const featureRowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBg: { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center", marginTop: 1 },
  texts: { flex: 1 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 13, marginBottom: 1 },
  description: { fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17 },
});

function SwitchRow({ icon, label, description, color, theme, value, onValueChange }: {
  icon: string; label: string; description: string; color: string; theme: any; value: boolean; onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={switchRowStyles.row}>
      <View style={[switchRowStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={switchRowStyles.texts}>
        <Text style={[switchRowStyles.label, { color: theme.textColor }]}>{label}</Text>
        <Text style={[switchRowStyles.description, { color: theme.secondaryText }]}>{description}</Text>
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
});

// ─── stylesheet factory ───────────────────────────────────────────────────────

function styles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 19, flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
    cardIconBg: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center" },
    cardTitle: { fontFamily: "DMSans_700Bold", fontSize: 15, flex: 1 },
    cardDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
    cardBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 },
    bodyText: { fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 20 },
    dangerSection: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
    dangerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    dangerTitle: { fontFamily: "DMSans_700Bold", fontSize: 14 },
    dangerDesc: { fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 19 },
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
    footerText: { fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center" },
  });
}
