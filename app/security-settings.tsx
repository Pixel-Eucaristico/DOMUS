import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { PinPad } from "@/src/components/security/PinPad";
import { PinAuthService } from "@/src/modules/security/application/PinAuthService";
import { PIN_LENGTH } from "@/src/modules/security/domain/UserSecuritySettings";
import { useSecuritySetup } from "@/src/hooks/useSecuritySetup";
import type { SetupStep } from "@/src/modules/security/application/securitySetupReducer";

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { theme } = useAppState();
  const sec = useSecuritySetup();
  const { settings, biometricAvailable, local, dispatch } = sec;

  // Loading state
  if (!settings) {
    return (
      <SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.background }]}>
        <View style={staticStyles.loadingContainer}>
          <ActivityIndicator color={theme.primaryColor} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const s = dynamicStyles(theme);

  // ── PIN/biometric entry overlays ─────────────────────────────────────────────

  if (
    local.step === "set_pin_new" ||
    local.step === "set_pin_confirm" ||
    local.step === "verify_pin_to_disable" ||
    local.step === "change_pin_current" ||
    local.step === "change_pin_new" ||
    local.step === "change_pin_confirm"
  ) {
    const titleMap: Record<SetupStep, string> = {
      set_pin_new: "Criar PIN",
      set_pin_confirm: "Confirmar PIN",
      verify_pin_to_disable: "Digite o PIN atual",
      change_pin_current: "PIN atual",
      change_pin_new: "Novo PIN",
      change_pin_confirm: "Confirmar novo PIN",
      idle: "",
      choose_method: "",
      verify_biometric_to_disable: "",
    };

    const subtitleMap: Record<SetupStep, string> = {
      set_pin_new: `Digite ${PIN_LENGTH} dígitos`,
      set_pin_confirm: "Digite o PIN novamente para confirmar",
      verify_pin_to_disable: "Confirme para desativar o bloqueio",
      change_pin_current: "Digite seu PIN atual",
      change_pin_new: `Digite o novo PIN (${PIN_LENGTH} dígitos)`,
      change_pin_confirm: "Digite o novo PIN novamente",
      idle: "",
      choose_method: "",
      verify_biometric_to_disable: "",
    };

    const handlerMap: Record<SetupStep, ((pin: string) => void) | undefined> = {
      set_pin_new: sec.handlePinNew,
      set_pin_confirm: sec.handlePinConfirm,
      verify_pin_to_disable: sec.handleVerifyPinToDisable,
      change_pin_current: sec.handleChangeCurrentPin,
      change_pin_new: sec.handleChangeNewPin,
      change_pin_confirm: sec.handleChangeConfirmPin,
      idle: undefined,
      choose_method: undefined,
      verify_biometric_to_disable: undefined,
    };

    const handler = handlerMap[local.step];

    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
        <View style={s.pinHeader}>
          <TouchableOpacity onPress={() => { soundManager.play("tap"); dispatch({ type: "RESET" }); }} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="x" size={22} color={theme.textColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.textColor }]}>Segurança</Text>
        </View>
        <View style={s.pinContainer}>
          {local.saving ? (
            <ActivityIndicator color={theme.primaryColor} size="large" />
          ) : (
            <PinPad
              theme={theme}
              onComplete={handler ?? (() => {})}
              title={titleMap[local.step]}
              subtitle={subtitleMap[local.step]}
              error={local.pinError}
              disabled={PinAuthService.isLocked(settings)}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── choose method overlay ───────────────────────────────────────────────────

  if (local.step === "choose_method") {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
        <View style={s.pinHeader}>
          <TouchableOpacity onPress={() => { soundManager.play("tap"); dispatch({ type: "RESET" }); }} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="x" size={22} color={theme.textColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.textColor }]}>Método de bloqueio</Text>
        </View>
        <View style={s.methodContainer}>
          <Text style={[s.methodTitle, { color: theme.textColor }]}>
            Como deseja bloquear o aplicativo?
          </Text>
          <MethodOption
            icon="hash" title="PIN"
            description={`Código numérico de ${PIN_LENGTH} dígitos`}
            color={theme.primaryColor} theme={theme}
            onPress={() => { soundManager.play("pop"); sec.handleChooseMethod("pin"); }}
          />
          <MethodOption
            icon="shield" title="Biometria"
            description={biometricAvailable ? "Digital ou reconhecimento facial" : "Indisponível neste dispositivo"}
            color={biometricAvailable ? theme.success : theme.secondaryText}
            theme={theme}
            onPress={() => { soundManager.play("pop"); sec.handleChooseMethod("biometric"); }}
            disabled={!biometricAvailable}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── main settings screen ─────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { soundManager.play("tap"); router.back(); }} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textColor }]}>Segurança</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Info banner */}
        <View style={[s.infoBanner, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Feather name="lock" size={16} color={theme.primaryColor} />
          <Text style={[s.infoText, { color: theme.secondaryText }]}>
            O bloqueio do aplicativo protege seus dados financeiros de
            acessos não autorizados. O PIN é armazenado apenas como hash
            SHA-256 com salt — nunca em texto simples.
          </Text>
        </View>

        {/* Lock toggle */}
        <View style={[s.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <SettingsRow
            icon="lock"
            title="Bloqueio do aplicativo"
            subtitle={settings.enabled ? `Ativo · ${settings.method === "pin" ? "PIN" : "Biometria"}` : "Desativado"}
            accentColor={settings.enabled ? theme.success : theme.secondaryText}
            theme={theme}
            right={
              <Switch
                value={settings.enabled}
                onValueChange={(v) => { soundManager.play("tap"); sec.handleToggleLock(v); }}
                trackColor={{ false: theme.border, true: theme.primaryColor + "80" }}
                thumbColor={settings.enabled ? theme.primaryColor : theme.secondaryText}
              />
            }
          />

          {settings.enabled && (
            <>
              <View style={[s.divider, { backgroundColor: theme.border }]} />
              <SettingsRow
                icon={settings.method === "pin" ? "hash" : "shield"}
                title="Método"
                subtitle={settings.method === "pin" ? "PIN numérico" : "Biometria"}
                accentColor={theme.primaryColor}
                theme={theme}
                right={
                  <TouchableOpacity
                    style={[s.changeBtn, { backgroundColor: theme.primaryColor + "18", borderColor: theme.primaryColor + "40" }]}
                    onPress={() => { soundManager.play("tap"); dispatch({ type: "START_ENABLE" }); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.changeBtnText, { color: theme.primaryColor }]}>Alterar</Text>
                  </TouchableOpacity>
                }
              />

              {settings.method === "pin" && (
                <>
                  <View style={[s.divider, { backgroundColor: theme.border }]} />
                  <SettingsRow
                    icon="key"
                    title="Alterar PIN"
                    subtitle="Defina um novo código de acesso"
                    accentColor={theme.warning}
                    theme={theme}
                    right={
                      <TouchableOpacity
                        style={[s.changeBtn, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "40" }]}
                        onPress={() => { soundManager.play("tap"); dispatch({ type: "START_CHANGE_PIN" }); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.changeBtnText, { color: theme.warning }]}>Alterar</Text>
                      </TouchableOpacity>
                    }
                  />
                </>
              )}
            </>
          )}
        </View>

        {/* Security note */}
        <View style={s.securityNote}>
          <Feather name="info" size={11} color={theme.secondaryText} />
          <Text style={[s.securityNoteText, { color: theme.secondaryText }]}>
            SHA-256 + salt · máx. {PIN_LENGTH} tentativas · bloqueio de 30s
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SettingsRow({ icon, title, subtitle, accentColor, theme, right }: {
  icon: string; title: string; subtitle: string; accentColor: string; theme: any; right: React.ReactNode;
}) {
  return (
    <View style={settingsRowStyles.row}>
      <View style={[settingsRowStyles.iconBg, { backgroundColor: accentColor + "18" }]}>
        <Feather name={icon as any} size={18} color={accentColor} />
      </View>
      <View style={settingsRowStyles.texts}>
        <Text style={[settingsRowStyles.title, { color: theme.textColor }]}>{title}</Text>
        <Text style={[settingsRowStyles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}

const settingsRowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  texts: { flex: 1 },
  title: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
});

function MethodOption({ icon, title, description, color, theme, onPress, disabled = false }: {
  icon: string; title: string; description: string; color: string; theme: any; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[methodStyles.card, { backgroundColor: theme.cardBackground, borderColor: disabled ? theme.border : color + "40", opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress} disabled={disabled} activeOpacity={0.8}
    >
      <View style={[methodStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={28} color={color} />
      </View>
      <Text style={[methodStyles.title, { color: theme.textColor }]}>{title}</Text>
      <Text style={[methodStyles.description, { color: theme.secondaryText }]}>{description}</Text>
    </TouchableOpacity>
  );
}

const methodStyles = StyleSheet.create({
  card: { flex: 1, alignItems: "center", padding: 20, borderRadius: 16, borderWidth: 1.5, gap: 10 },
  iconBg: { width: 56, height: 56, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  title: { fontFamily: "DMSans_700Bold", fontSize: 17 },
  description: { fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18 },
});

// ─── styles ──────────────────────────────────────────────────────────────────

const staticStyles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

function dynamicStyles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
    pinHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 48, gap: 16 },
    infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
    infoText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18 },
    card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
    changeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    changeBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
    securityNote: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingVertical: 4 },
    securityNoteText: { fontFamily: "DMSans_400Regular", fontSize: 10, textAlign: "center" },
    pinContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
    methodContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 32, gap: 20 },
    methodTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, textAlign: "center", marginBottom: 8 },
  });
}
