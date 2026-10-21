import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { SupportMode } from "@/src/modules/monetization/MonetizationSettingsStore";
import { useSupportModes } from "@/src/hooks/useSupportModes";
import { usePersonalizedAdsConsent } from "@/src/hooks/usePersonalizedAdsConsent";
import { soundManager } from "@/src/services/SoundManager";

interface SupportOption {
  mode: SupportMode;
  label: string;
  desc: string;
  color: string;
}

const SUPPORT_OPTIONS: SupportOption[] = [
  { mode: "links",      label: "🔗  Apenas Links na Lista",    desc: "Padrão — sem anúncios extras",                        color: "#6366F1" },
  { mode: "banners",    label: "📢  Banner",                   desc: "Banner Google abaixo da navegação; se ele falhar, barra de afiliados Amazon/Mercado Livre", color: "#F59E0B" },
  { mode: "daily_ad",   label: "⭐  Intersticial Diário",       desc: "Anúncio Google em tela cheia 1× por dia; se falhar, tela de apoio com links", color: "#F59E0B" },
  { mode: "native_ad",  label: "🎯  Anúncio Nativo",           desc: "Anúncio Google no visual do app, acima da navegação",  color: "#6366F1" },
  { mode: "app_open",   label: "🚀  Abertura do App",          desc: "Anúncio Google ao voltar ao app",                     color: "#10B981" },
];

interface Props {
  theme: ThemeColors;
  onChange?: (modes: SupportMode[]) => void;
}

export function SupportModeSelector({ theme, onChange }: Props) {
  const { modes, toggleMode } = useSupportModes(onChange);
  // Só os modos com anúncio do Google pedem anúncio; "links" não pede nenhum
  const hasAdMode = Array.from(modes).some((m) => m !== "links");

  return (
    <View style={st.container}>
      {SUPPORT_OPTIONS.map((opt) => (
        <SupportOptionItem
          key={opt.mode}
          option={opt}
          active={modes.has(opt.mode)}
          onToggle={toggleMode}
          theme={theme}
        />
      ))}
      {hasAdMode && <PersonalizedAdsConsentRow theme={theme} />}
    </View>
  );
}

function PersonalizedAdsConsentRow({ theme }: { theme: ThemeColors }) {
  const { consent, loaded, setConsent } = usePersonalizedAdsConsent();
  const [saving, setSaving] = useState(false);
  const color = "#F59E0B";

  const handleChange = useCallback(
    (next: boolean) => {
      soundManager.play("tap");
      setSaving(true);
      setConsent(next)
        .catch(() => {
          Alert.alert("Erro", "Não foi possível salvar a sua escolha. Tente de novo.");
        })
        .finally(() => setSaving(false));
    },
    [setConsent],
  );

  return (
    <View style={[st.consentBox, { borderColor: consent ? color : theme.border }]}>
      <View style={st.btnRow}>
        <Text style={[st.btnText, { color: theme.textColor, flex: 1 }]}>
          👤  Anúncios personalizados
        </Text>
        <Switch
          value={consent}
          disabled={!loaded || saving}
          onValueChange={handleChange}
          trackColor={{ false: theme.border, true: color + "80" }}
          thumbColor={consent ? color : "#f4f3f4"}
          accessibilityLabel="Anúncios personalizados"
        />
      </View>
      <Text style={[st.desc, { color: theme.secondaryText }]}>
        Ligado: o Google recebe o ID de publicidade do aparelho, informações do aparelho e do uso dos anúncios para escolher anúncios relacionados aos seus interesses.
      </Text>
      <Text style={[st.desc, { color: theme.secondaryText }]}>
        Desligado (padrão): os anúncios continuam aparecendo e o Google ainda recebe dados do aparelho necessários para entregar e medir os anúncios, mas não os usa para escolher anúncios pelos seus interesses; por isso eles ficam menos relacionados a você. Você pode mudar quando quiser; vale a partir do próximo anúncio.
      </Text>
    </View>
  );
}

interface SupportOptionItemProps {
  option: SupportOption;
  active: boolean;
  onToggle: (mode: SupportMode) => void;
  theme: ThemeColors;
}

function SupportOptionItem({ option, active, onToggle, theme }: SupportOptionItemProps) {
  const { mode, label, desc, color } = option;
  return (
    <TouchableOpacity
      style={[
        st.btn,
        { borderColor: active ? color : theme.border },
        active && { backgroundColor: color + "15" },
      ]}
      onPress={() => onToggle(mode)}
      activeOpacity={0.75}
    >
      <View style={st.btnRow}>
        <Text style={[st.btnText, { color: active ? color : theme.textColor, flex: 1 }]}>
          {label}
        </Text>
        <View style={[st.checkbox, { borderColor: active ? color : theme.border }, active && { backgroundColor: color }]}>
          {active && <Feather name="check" size={11} color="#FFF" />}
        </View>
      </View>
      <Text style={[st.desc, { color: theme.secondaryText }]}>{desc}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  container: { gap: 8 },
  btn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnRow: { flexDirection: "row", alignItems: "center" },
  btnText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  desc: { fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 },
  consentBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
