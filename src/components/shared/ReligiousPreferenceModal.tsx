import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { soundManager } from "@/src/services/SoundManager";

interface Props {
  visible: boolean;
  onSelect: (isCatholic: boolean) => void;
}

export function ReligiousPreferenceModal({ visible, onSelect }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={st.overlay}>
        <View style={st.card}>
          {/* Cross icon */}
          <Text style={st.crossIcon}>✝️</Text>

          <Text style={st.title}>Você é católico(a)?</Text>
          <Text style={st.subtitle}>
            Isso adiciona santos e festas litúrgicas ao sorteio mensal de Troféus Surpresa — como São Pedro e Paulo, Nossa Senhora Aparecida e Carlo Acutis.
          </Text>

          <View style={st.infoRow}>
            <Text style={st.infoIcon}>🎴</Text>
            <Text style={st.infoText}>
              Católicos recebem troféus de santos sorteados entre os demais. Feriados nacionais aparecem para todos.
            </Text>
          </View>

          <TouchableOpacity
            style={[st.btn, st.btnCatholic]}
            onPress={() => {
              soundManager.play("success");
              onSelect(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={st.btnCatholicText}>✝️  Sim, sou católico(a)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.btn, st.btnSecular]}
            onPress={() => {
              soundManager.play("tap");
              onSelect(false);
            }}
            activeOpacity={0.85}
          >
            <Text style={st.btnSecularText}>Não por enquanto</Text>
          </TouchableOpacity>

          <Text style={st.footer}>
            Você pode mudar esta opção a qualquer momento na tela Temporada.
          </Text>
        </View>
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
  card: {
    backgroundColor: "#12082A",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#4C1D95",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  crossIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "#F5F3FF",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#C4B5FD",
    textAlign: "center",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#1E1040",
    borderRadius: 12,
    padding: 12,
    width: "100%",
  },
  infoIcon: { fontSize: 18, lineHeight: 22 },
  infoText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#A78BFA",
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
    backgroundColor: "#7C3AED",
  },
  btnCatholicText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  btnSecular: {
    backgroundColor: "#FFFFFF10",
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  btnSecularText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#9CA3AF",
  },
  footer: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
  },
});
