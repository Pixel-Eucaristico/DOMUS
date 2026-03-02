import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemeColors } from "@packages/theme";

interface Props {
  theme: ThemeColors;
  error: string;
  showOcrSettingsLink: boolean;
  onReset: () => void;
}

export function ErrorScreen({ theme, error, showOcrSettingsLink, onReset }: Props) {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Feather name="alert-circle" size={60} color={theme.danger} style={{ marginBottom: 20 }} />
      <Text style={[s.errorText, { color: theme.textColor }]}>{error}</Text>
      <Pressable style={[s.button, { backgroundColor: theme.primaryColor }]} onPress={onReset}>
        <Text style={s.buttonText}>Voltar ao início</Text>
      </Pressable>
      {showOcrSettingsLink ? (
        <Pressable
          style={[s.outlineButton, { borderColor: theme.primaryColor }]}
          onPress={() => router.push("/ocr-settings")}
        >
          <Feather name="settings" size={18} color={theme.primaryColor} />
          <Text style={[s.outlineButtonText, { color: theme.primaryColor }]}>
            Configurar Cloud Vision API
          </Text>
        </Pressable>
      ) : (
        <Pressable style={[s.outlineButton, { borderColor: theme.border }]} onPress={onReset}>
          <Feather name="hash" size={18} color={theme.textColor} />
          <Text style={[s.outlineButtonText, { color: theme.textColor }]}>
            Digitar Chave de Acesso
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  errorText: { textAlign: "center", fontSize: 15, marginBottom: 28, lineHeight: 22 },
  button: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, width: "100%", gap: 8,
  },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  outlineButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, width: "100%", gap: 8, marginTop: 12,
  },
  outlineButtonText: { fontSize: 15, fontWeight: "500" },
});
