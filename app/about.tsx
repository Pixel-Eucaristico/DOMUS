import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Animated,
  Switch,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import { useAppState } from "@/src/context/AppStateProvider";
import { ClipboardService } from "@/src/modules/security/application/ClipboardService";
import { EmailService } from "@/src/modules/security/application/EmailService";
import type { ContactFormData } from "@/src/modules/security/application/EmailService";
import { DeviceInfoService } from "@/src/modules/security/infrastructure/DeviceInfoService";
import { SelectionModal, type SelectionOption } from "@/src/components/shared/SelectionModal";

// ─── PIX EMV payload ─────────────────────────────────────────────────────────

function crc16ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emvField(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function buildPixPayload(pixKey: string): string {
  const merchantInfo =
    emvField("00", "BR.GOV.BCB.PIX") + emvField("01", pixKey);
  const additionalData = emvField("05", "***");

  let payload = "";
  payload += emvField("00", "01");
  payload += emvField("26", merchantInfo);
  payload += emvField("52", "0000");
  payload += emvField("53", "986");
  payload += emvField("58", "BR");
  payload += emvField("59", "Pixel Eucaristico");
  payload += emvField("60", "Goiania");
  payload += emvField("62", additionalData);
  payload += "6304";

  return payload + crc16ccitt(payload);
}

// ─── constants ───────────────────────────────────────────────────────────────

const PIX_KEY = "55.075.291/0001-79";
const PIX_PAYLOAD = buildPixPayload(PIX_KEY);
const KOFI_URL = "https://ko-fi.com/willianquintino33618";
const LINKEDIN_URL = "https://www.linkedin.com/in/willian-custodio-quintino";
const GITHUB_URL = "https://github.com/WillianQuintino";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── helpers ─────────────────────────────────────────────────────────────────

async function safeOpenUrl(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Erro", "Não foi possível abrir este link.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Erro", "Não foi possível abrir este link.");
  }
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode, soundEnabled, setSoundEnabled, resetApp } = useAppState();

  const [pixCopied, setPixCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetting, setResetting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>(
    {},
  );

  const emailRef = useRef<TextInput>(null);
  const subjectRef = useRef<TextInput>(null);
  const messageRef = useRef<TextInput>(null);

  const handleCopyPix = useCallback(async () => {
    const ok = await ClipboardService.copy(PIX_KEY);
    if (ok) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<string, string>> = {};
    if (!name.trim()) errors.name = "Nome é obrigatório.";
    if (!email.trim()) {
      errors.email = "E-mail é obrigatório.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "E-mail inválido.";
    }
    if (!subject.trim()) errors.subject = "Assunto é obrigatório.";
    if (!message.trim()) errors.message = "Mensagem é obrigatória.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, subject, message]);

  const handleSendEmail = useCallback(async () => {
    if (!validateForm()) return;
    setSending(true);
    const form: ContactFormData = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    };
    const deviceInfo = DeviceInfoService.get();
    await EmailService.open(form, deviceInfo);
    setSending(false);
  }, [name, email, subject, message, validateForm]);

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
            onPress={() => router.back()}
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
            <FeatureRow
              icon="shield"
              color={theme.success}
              theme={theme}
              label="Privacidade em primeiro lugar"
              description="Nenhum dado é enviado para servidores."
            />
            <FeatureRow
              icon="database"
              color={theme.primaryColor}
              theme={theme}
              label="Arquitetura baseada em eventos"
              description="Histórico imutável e rastreável de transações."
            />
            <FeatureRow
              icon="hard-drive"
              color={theme.warning}
              theme={theme}
              label="Armazenamento local"
              description="SQLite criptografado no seu dispositivo."
            />
            <FeatureRow
              icon="download"
              color={theme.accentColor}
              theme={theme}
              label="Backup manual e cifrado"
              description="AES-256-GCM com senha sua. Você controla tudo."
            />
          </SectionCard>

          {/* ── SUPPORT ─────────────────────────────────────────────────── */}
          <SectionCard
            theme={theme}
            icon="heart"
            title="Apoie o Projeto"
            accentColor="#E11D48"
            collapsible
          >
            {/* PIX */}
            <View style={s.pixBlock}>
              <View style={s.pixRow}>
                <View style={s.pixInfo}>
                  <Text style={[s.pixLabel, { color: theme.secondaryText }]}>
                    Chave PIX (CNPJ)
                  </Text>
                  <Text style={[s.pixKey, { color: theme.textColor }]} selectable>
                    {PIX_KEY}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    s.copyBtn,
                    { backgroundColor: pixCopied ? theme.success : theme.primaryColor },
                  ]}
                  onPress={handleCopyPix}
                  activeOpacity={0.8}
                >
                  <Feather name={pixCopied ? "check" : "copy"} size={15} color="#fff" />
                  <Text style={s.copyBtnText}>
                    {pixCopied ? "Copiado!" : "Copiar"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={s.qrContainer}>
                <QRCode
                  value={PIX_PAYLOAD}
                  size={160}
                  color={theme.textColor}
                  backgroundColor={theme.cardBackground}
                />
                <Text style={[s.qrHint, { color: theme.secondaryText }]}>
                  Escaneie com seu banco
                </Text>
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <LinkRow
              icon="coffee"
              label="Ko-fi"
              description="Apoie com um café"
              color="#FF5E5B"
              theme={theme}
              onPress={() => safeOpenUrl(KOFI_URL)}
            />
            <LinkRow
              icon="linkedin"
              label="LinkedIn"
              description="Willian Custodio Quintino"
              color="#0A66C2"
              theme={theme}
              onPress={() => safeOpenUrl(LINKEDIN_URL)}
            />
            <LinkRow
              icon="github"
              label="GitHub"
              description="WillianQuintino"
              color={theme.textColor}
              theme={theme}
              onPress={() => safeOpenUrl(GITHUB_URL)}
            />
          </SectionCard>

          {/* ── SETTINGS ────────────────────────────────────────────────── */}
          <SectionCard
            theme={theme}
            icon="settings"
            title="Configurações"
            accentColor={theme.accentColor}
            collapsible
          >
            <LinkRow
              icon="lock"
              label="Segurança"
              description="Bloqueio por PIN ou biometria"
              color={theme.primaryColor}
              theme={theme}
              onPress={() => router.push("/security-settings")}
            />
            <LinkRow
              icon="download-cloud"
              label="Backup & Restauração"
              description="Exportar e importar dados cifrados"
              color={theme.warning}
              theme={theme}
              onPress={() => router.push("/backup")}
            />
            <LinkRow
              icon="shield"
              label="Política de Privacidade"
              description="Como seus dados são protegidos"
              color={theme.primaryColor}
              theme={theme}
              onPress={() => router.push("/privacy-policy")}
            />
            <LinkRow
              icon="moon"
              label="Tema"
              description={`Modo atual: ${themeMode === "system" ? "Sistema" : themeMode === "dark" ? "Escuro" : "Claro"}`}
              color={theme.accentColor}
              theme={theme}
              onPress={() => setThemeModalVisible(true)}
            />
            <SwitchRow
              icon="volume-2"
              label="Efeitos Sonoros"
              description="Sons de confirmação e interações"
              color={theme.primaryColor}
              theme={theme}
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />
          </SectionCard>

          {/* ── CONTACT FORM ────────────────────────────────────────────── */}
          <SectionCard
            theme={theme}
            icon="mail"
            title="Fale Conosco"
            accentColor={theme.primaryColor}
            collapsible
          >
            <Text style={[s.bodyText, { color: theme.secondaryText }]}>
              Envie sugestões, bugs ou dúvidas. Abrirá seu cliente de e-mail
              com as informações preenchidas.
            </Text>

            <FormField
              label="Nome"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setFormErrors((e) => ({ ...e, name: undefined }));
              }}
              error={formErrors.name}
              placeholder="Seu nome"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              theme={theme}
            />
            <FormField
              ref={emailRef}
              label="E-mail"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setFormErrors((e) => ({ ...e, email: undefined }));
              }}
              error={formErrors.email}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => subjectRef.current?.focus()}
              theme={theme}
            />
            <FormField
              ref={subjectRef}
              label="Assunto"
              value={subject}
              onChangeText={(v) => {
                setSubject(v);
                setFormErrors((e) => ({ ...e, subject: undefined }));
              }}
              error={formErrors.subject}
              placeholder="Qual é o assunto?"
              returnKeyType="next"
              onSubmitEditing={() => messageRef.current?.focus()}
              theme={theme}
            />
            <FormField
              ref={messageRef}
              label="Mensagem"
              value={message}
              onChangeText={(v) => {
                setMessage(v);
                setFormErrors((e) => ({ ...e, message: undefined }));
              }}
              error={formErrors.message}
              placeholder="Descreva sua mensagem…"
              multiline
              numberOfLines={5}
              returnKeyType="done"
              theme={theme}
            />

            <TouchableOpacity
              style={[
                s.submitBtn,
                { backgroundColor: theme.primaryColor },
                sending && s.submitBtnDisabled,
              ]}
              onPress={handleSendEmail}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={17} color="#fff" />
              )}
              <Text style={s.submitBtnText}>
                {sending ? "Abrindo e-mail…" : "Enviar mensagem"}
              </Text>
            </TouchableOpacity>
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
              onPress={() => { setResetPhrase(""); setShowResetModal(true); }}
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
                onPress={() => { setShowResetModal(false); setResetPhrase(""); }}
              >
                <Text style={{ color: theme.textColor, fontFamily: "DMSans_500Medium", fontSize: 14 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.resetConfirmBtn, resetPhrase !== "APAGAR TUDO" && { opacity: 0.35 }]}
                onPress={handleReset}
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
        onCancel={() => setThemeModalVisible(false)}
        options={[
          {
            label: "Sistema",
            icon: "monitor",
            onPress: () => setThemeMode("system"),
          },
          {
            label: "Claro",
            icon: "sun",
            onPress: () => setThemeMode("light"),
          },
          {
            label: "Escuro",
            icon: "moon",
            onPress: () => setThemeMode("dark"),
          },
        ]}
      />
    </SafeAreaView>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

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
  const rotation = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    if (!collapsible) return;
    LayoutAnimation.configureNext({
      duration: 250,
      update: { type: "easeInEaseOut" },
      create: { type: "easeInEaseOut", property: "opacity" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    Animated.timing(rotation, {
      toValue: open ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setOpen((v) => !v);
  }, [collapsible, open, rotation]);

  const chevronRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const s = styles(theme);
  const showBody = !collapsible || open;

  return (
    <View
      style={[
        s.card,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
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
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
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

function FeatureRow({
  icon,
  color,
  label,
  description,
  theme,
}: {
  icon: string;
  color: string;
  label: string;
  description: string;
  theme: any;
}) {
  return (
    <View style={featureRowStyles.row}>
      <View style={[featureRowStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <View style={featureRowStyles.texts}>
        <Text style={[featureRowStyles.label, { color: theme.textColor }]}>
          {label}
        </Text>
        <Text
          style={[featureRowStyles.description, { color: theme.secondaryText }]}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

const featureRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  texts: { flex: 1 },
  label: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    marginBottom: 1,
  },
  description: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
});

function LinkRow({
  icon,
  label,
  description,
  color,
  theme,
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  color: string;
  theme: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={linkRowStyles.row}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[linkRowStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={linkRowStyles.texts}>
        <Text style={[linkRowStyles.label, { color: theme.textColor }]}>
          {label}
        </Text>
        <Text
          style={[linkRowStyles.description, { color: theme.secondaryText }]}
        >
          {description}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={theme.secondaryText} />
    </TouchableOpacity>
  );
}

const linkRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  texts: { flex: 1 },
  label: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  description: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
});

function SwitchRow({
  icon,
  label,
  description,
  color,
  theme,
  value,
  onValueChange,
}: {
  icon: string;
  label: string;
  description: string;
  color: string;
  theme: any;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={linkRowStyles.row}>
      <View style={[linkRowStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={linkRowStyles.texts}>
        <Text style={[linkRowStyles.label, { color: theme.textColor }]}>
          {label}
        </Text>
        <Text
          style={[linkRowStyles.description, { color: theme.secondaryText }]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.primaryColor }}
        thumbColor={Platform.OS === "ios" ? undefined : value ? "#fff" : "#f4f3f4"}
      />
    </View>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: TextInput["props"]["autoCapitalize"];
  returnKeyType?: TextInput["props"]["returnKeyType"];
  onSubmitEditing?: () => void;
  theme: any;
}

const FormField = React.forwardRef<TextInput, FormFieldProps>(
  (
    {
      label,
      value,
      onChangeText,
      error,
      placeholder,
      multiline,
      numberOfLines,
      keyboardType,
      autoCapitalize,
      returnKeyType,
      onSubmitEditing,
      theme,
    },
    ref,
  ) => {
    return (
      <View style={formFieldStyles.container}>
        <Text style={[formFieldStyles.label, { color: theme.secondaryText }]}>
          {label}
        </Text>
        <TextInput
          ref={ref}
          style={[
            formFieldStyles.input,
            {
              backgroundColor: theme.background,
              color: theme.textColor,
              borderColor: error ? theme.danger : theme.border,
              textAlignVertical: multiline ? "top" : "center",
              height: multiline ? 96 : 46,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.secondaryText + "70"}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "words"}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={!multiline}
        />
        {error != null && (
          <Text style={[formFieldStyles.error, { color: theme.danger }]}>
            {error}
          </Text>
        )}
      </View>
    );
  },
);
FormField.displayName = "FormField";

const formFieldStyles = StyleSheet.create({
  container: { gap: 4 },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  error: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
});

// ─── stylesheet factory ───────────────────────────────────────────────────────

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
    headerTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 19,
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 40,
      gap: 12,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    cardIconBg: {
      width: 36,
      height: 36,
      borderRadius: 11,
      justifyContent: "center",
      alignItems: "center",
    },
    cardTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 15,
      flex: 1,
    },
    cardDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 14,
    },
    cardBody: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 10,
    },
    bodyText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      lineHeight: 20,
    },
    // PIX
    pixBlock: {
      gap: 14,
    },
    pixRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    pixInfo: { flex: 1 },
    pixLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      marginBottom: 2,
    },
    pixKey: {
      fontFamily: "DMSans_700Bold",
      fontSize: 15,
      letterSpacing: 0.4,
    },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 9,
    },
    copyBtnText: {
      fontFamily: "DMSans_700Bold",
      fontSize: 12,
      color: "#fff",
    },
    qrContainer: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 2,
    },
    qrHint: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
    },
    // Contact form
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 48,
      borderRadius: 12,
      marginTop: 2,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: {
      fontFamily: "DMSans_700Bold",
      fontSize: 14,
      color: "#fff",
    },
    // Danger zone
    dangerSection: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    dangerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dangerTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 14,
    },
    dangerDesc: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      lineHeight: 19,
    },
    dangerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#DC2626",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignSelf: "flex-start",
    },
    dangerBtnText: {
      color: "#FFF",
      fontFamily: "DMSans_700Bold",
      fontSize: 13,
    },
    // Reset modal
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    resetModal: {
      borderRadius: 18,
      padding: 24,
      width: "100%",
      maxWidth: 420,
    },
    resetModalTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 18,
      textAlign: "center",
      marginBottom: 12,
    },
    resetModalDesc: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 18,
    },
    resetModalLabel: {
      fontFamily: "DMSans_500Medium",
      fontSize: 13,
      marginBottom: 8,
    },
    resetInput: {
      borderWidth: 1.5,
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontFamily: "DMSans_500Medium",
      fontSize: 15,
      letterSpacing: 1,
      marginBottom: 20,
    },
    resetButtons: {
      flexDirection: "row",
      gap: 10,
    },
    resetCancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 11,
      paddingVertical: 13,
      alignItems: "center",
    },
    resetConfirmBtn: {
      flex: 1,
      backgroundColor: "#DC2626",
      borderRadius: 11,
      paddingVertical: 13,
      alignItems: "center",
    },
    // Footer
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      justifyContent: "center",
      paddingVertical: 4,
    },
    footerText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      textAlign: "center",
    },
  });
}
