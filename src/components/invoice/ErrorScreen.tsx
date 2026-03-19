import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";
import { TButton } from "@/src/components/tamagui";

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
      <View style={{ width: "100%" }}>
        <TButton variant="primary" backgroundColor={theme.primaryColor} onPress={() => { soundManager.play("tap"); onReset(); }}>
          Voltar ao início
        </TButton>
      </View>
      <View style={{ width: "100%", marginTop: 12 }}>
        {showOcrSettingsLink ? (
          <TButton
            variant="outline"
            borderColor={theme.border}
            color={theme.textColor}
            onPress={() => { soundManager.play("tap"); router.push("/ocr-settings"); }}
            icon={<Feather name="settings" size={18} color={theme.primaryColor} />}
          >
            Configurar Cloud Vision API
          </TButton>
        ) : (
          <TButton
            variant="outline"
            borderColor={theme.border}
            color={theme.textColor}
            onPress={() => { soundManager.play("tap"); onReset(); }}
            icon={<Feather name="hash" size={18} color={theme.textColor} />}
          >
            Digitar Chave de Acesso
          </TButton>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  errorText: { textAlign: "center", fontSize: 15, marginBottom: 28, lineHeight: 22 },
});
