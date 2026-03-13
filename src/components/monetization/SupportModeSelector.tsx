import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { SupportMode } from "@/src/modules/monetization/MonetizationSettingsStore";
import { useSupportModes } from "@/src/hooks/useSupportModes";

interface SupportOption {
  mode: SupportMode;
  label: string;
  desc: string;
  color: string;
}

const SUPPORT_OPTIONS: SupportOption[] = [
  { mode: "links",      label: "🔗  Apenas Links na Lista",    desc: "Padrão — sem anúncios extras",                        color: "#6366F1" },
  { mode: "banners",    label: "📢  Banner de Afiliados",       desc: "Barra discreta Amazon/ML abaixo da navegação",         color: "#F59E0B" },
  { mode: "daily_ad",   label: "⭐  Intersticial Diário",       desc: "Tela de apoio 1× por dia ao abrir o app",             color: "#F59E0B" },
  { mode: "native_ad",  label: "🎯  Anúncio Nativo",           desc: "Banner Google integrado ao layout do app",            color: "#6366F1" },
  { mode: "app_open",   label: "🚀  Abertura do App",          desc: "Anúncio Google ao abrir ou retornar ao app",          color: "#10B981" },
];

interface Props {
  theme: ThemeColors;
  onChange?: (modes: SupportMode[]) => void;
}

export function SupportModeSelector({ theme, onChange }: Props) {
  const { modes, toggleMode } = useSupportModes(onChange);

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
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
