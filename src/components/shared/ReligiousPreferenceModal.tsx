import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { TCard } from "@/src/components/tamagui";
import { soundManager } from "@/src/services/SoundManager";
import { useAppState } from "@/src/context/AppStateProvider";

interface Props {
  visible: boolean;
  onSelect: (isCatholic: boolean) => void;
}

export function ReligiousPreferenceModal({ visible, onSelect }: Props) {
  const { theme } = useAppState();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={st.overlay}>
        <TCard
          variant="elevated"
          borderRadius={24}
          padding={28}
          width="100%"
          maxWidth={380}
          alignItems="center"
          gap={14}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
          shadowColor={theme.primaryColor as any}
          shadowOpacity={0.4}
          shadowRadius={24}
          elevation={12}
        >
          {/* Cross icon */}
          <Text style={st.crossIcon}>✝️</Text>

          <Text style={[st.title, { color: theme.textColor }]}>Você é católico(a)?</Text>
          <Text style={[st.subtitle, { color: theme.secondaryText }]}>
            Isso adiciona santos e festas litúrgicas ao sorteio mensal de Troféus Surpresa — como São Pedro e Paulo, Nossa Senhora Aparecida e Carlo Acutis.
          </Text>

          <View style={[st.infoRow, { backgroundColor: `${theme.primaryColor}15` }]}>
            <Text style={st.infoIcon}>🎴</Text>
            <Text style={[st.infoText, { color: theme.primaryColor }]}>
              Católicos recebem troféus de santos sorteados entre os demais. Feriados nacionais aparecem para todos.
            </Text>
          </View>

          <TouchableOpacity
            style={[st.btn, st.btnCatholic, { backgroundColor: theme.primaryColor }]}
            onPress={() => {
              soundManager.play("success");
              onSelect(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={st.btnCatholicText}>✝️  Sim, sou católico(a)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.btn, st.btnSecular, { borderColor: theme.border }]}
            onPress={() => {
              soundManager.play("tap");
              onSelect(false);
            }}
            activeOpacity={0.85}
          >
            <Text style={[st.btnSecularText, { color: theme.secondaryText }]}>Não por enquanto</Text>
          </TouchableOpacity>

          <Text style={[st.footer, { color: theme.secondaryText }]}>
            Você pode mudar esta opção a qualquer momento na tela Temporada.
          </Text>
        </TCard>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 24,
  },
  crossIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    width: "100%",
  },
  infoIcon: { fontSize: 18, lineHeight: 22 },
  infoText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnCatholic: {
    // backgroundColor handled by dynamic style
  },
  btnCatholicText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  btnSecular: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  btnSecularText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
  },
  footer: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
