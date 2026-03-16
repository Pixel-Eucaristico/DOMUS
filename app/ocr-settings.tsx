import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { OCRConfigService } from "@/src/services/ocrConfigService";
import type { OCRProvider } from "@packages/parsers";

type OCRProviderExtended = OCRProvider | "vision_ai";

export default function OCRSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppState();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<OCRProviderExtended>("mlkit");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await OCRConfigService.loadConfig();
      setProvider(config.preferredProvider);
      setApiKey(config.cloudVisionApiKey || "");
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (provider === "cloudvision" && !apiKey.trim()) {
        Alert.alert(
          "API Key necessária",
          "Para usar Cloud Vision API, você precisa fornecer uma API Key do Google Cloud."
        );
        return;
      }

      await OCRConfigService.setPreferredProvider(provider as OCRProvider);

      if (apiKey.trim()) {
        await OCRConfigService.setCloudVisionApiKey(apiKey.trim());
      } else {
        await OCRConfigService.clearCloudVisionApiKey();
      }

      Alert.alert("Sucesso", "Configurações salvas com sucesso!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => { soundManager.play("tap"); router.back(); }} hitSlop={12}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.title, { color: theme.textColor }]}>Configurar OCR</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
        {/* Descrição */}
        <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
          <Feather name="info" size={20} color={theme.primaryColor} />
          <Text style={[s.description, { color: theme.secondaryText }]}>
            {Platform.OS === "web"
              ? "No navegador, o Tesseract.js funciona gratuitamente sem configuração extra. " +
                "Para maior precisão, configure a Cloud Vision API."
              : "Em dispositivos móveis, o OCR On-device (ML Kit) funciona gratuitamente e offline. " +
                "Suporta Português e outros idiomas. A Cloud Vision API é a alternativa paga com maior precisão."
            }
          </Text>
        </View>

        {/* Provedor Preferido */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>
            Provedor Preferido
          </Text>

          {/* On-device — ML Kit OCR */}
          <Pressable
            style={[
              s.providerCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: provider === "mlkit" || provider === "textrecognition"
                  ? theme.primaryColor
                  : theme.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => { soundManager.play("tap"); setProvider("mlkit"); }}
          >
            <View style={s.providerHeader}>
              <View style={s.providerTitleRow}>
                <Feather
                  name={provider === "mlkit" || provider === "textrecognition" ? "check-circle" : "circle"}
                  size={20}
                  color={provider === "mlkit" || provider === "textrecognition" ? theme.primaryColor : theme.secondaryText}
                />
                <Text style={[s.providerName, { color: theme.textColor }]}>
                  On-device
                </Text>
                <View style={[s.badge, { backgroundColor: `${theme.success}20` }]}>
                  <Text style={[s.badgeText, { color: theme.success }]}>Grátis</Text>
                </View>
              </View>
            </View>
            <Text style={[s.providerDesc, { color: theme.secondaryText }]}>
              Gratuito, funciona offline. Usa ML Kit (Google) no Android e Vision Framework no iOS.
              Suporta Português, Inglês, Espanhol e outros idiomas com alfabeto latino.
            </Text>
          </Pressable>

          {/* Cloud Vision API */}
          <Pressable
            style={[
              s.providerCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: provider === "cloudvision" ? theme.primaryColor : theme.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => { soundManager.play("tap"); setProvider("cloudvision"); }}
          >
            <View style={s.providerHeader}>
              <View style={s.providerTitleRow}>
                <Feather
                  name={provider === "cloudvision" ? "check-circle" : "circle"}
                  size={20}
                  color={provider === "cloudvision" ? theme.primaryColor : theme.secondaryText}
                />
                <Text style={[s.providerName, { color: theme.textColor }]}>
                  Cloud Vision API
                </Text>
                <View style={[s.badge, { backgroundColor: `${theme.primaryColor}20` }]}>
                  <Text style={[s.badgeText, { color: theme.primaryColor }]}>Pago</Text>
                </View>
              </View>
            </View>
            <Text style={[s.providerDesc, { color: theme.secondaryText }]}>
              Melhor precisão, requer internet e API Key do Google Cloud (~$1,50/1.000 imagens).
              Funciona em qualquer build do app, inclusive Expo Go.
            </Text>
          </Pressable>

          {/* Tesseract — gratuito no browser */}
          <Pressable
            style={[
              s.providerCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: provider === "tesseract" ? theme.primaryColor : theme.border,
                borderWidth: 2,
                opacity: Platform.OS === "web" ? 1 : 0.55,
              },
            ]}
            onPress={() => {
              soundManager.play("tap");
              if (Platform.OS !== "web") {
                Alert.alert(
                  "Tesseract — Somente Web",
                  "Tesseract.js funciona apenas no navegador web. Neste dispositivo o app " +
                  "usará automaticamente o OCR On-device ao invés do Tesseract.",
                  [{ text: "OK" }]
                );
                return;
              }
              setProvider("tesseract");
            }}
          >
            <View style={s.providerHeader}>
              <View style={s.providerTitleRow}>
                <Feather
                  name={provider === "tesseract" ? "check-circle" : Platform.OS === "web" ? "circle" : "alert-circle"}
                  size={20}
                  color={provider === "tesseract" ? theme.primaryColor : theme.secondaryText}
                />
                <Text style={[s.providerName, { color: Platform.OS === "web" ? theme.textColor : theme.secondaryText }]}>
                  Tesseract.js
                </Text>
                <View style={[s.badge, { backgroundColor: Platform.OS === "web" ? `${theme.success}20` : `${theme.secondaryText}20` }]}>
                  <Text style={[s.badgeText, { color: Platform.OS === "web" ? theme.success : theme.secondaryText }]}>
                    {Platform.OS === "web" ? "Grátis" : "Só Web"}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[s.providerDesc, { color: theme.secondaryText }]}>
              {Platform.OS === "web"
                ? "Gratuito, código aberto. Funciona no navegador sem instalar nada. Ideal para testes via Expo web."
                : "Não disponível em dispositivos móveis. O app usa On-device automaticamente neste caso."}
            </Text>
          </Pressable>
        </View>

        {/* API Key Cloud Vision */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>
            API Key do Cloud Vision
          </Text>
          <Text style={[s.sectionSubtitle, { color: theme.secondaryText }]}>
            {provider === "cloudvision"
              ? "Obrigatório para usar Cloud Vision como provedor principal"
              : "Opcional — usada como fallback se o OCR on-device falhar"}
          </Text>

          <View style={[s.inputContainer, { backgroundColor: theme.cardBackground }]}>
            <Feather name="key" size={18} color={theme.secondaryText} />
            <TextInput
              style={[s.input, { color: theme.textColor }]}
              placeholder="Cole sua API key aqui"
              placeholderTextColor={theme.secondaryText}
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            {apiKey ? (
              <Pressable onPress={() => { soundManager.play("tap"); setApiKey(""); }}>
                <Feather name="x-circle" size={18} color={theme.secondaryText} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            style={s.helpLink}
            onPress={() => {
              soundManager.play("tap");
              Alert.alert(
                "Como obter API Key",
                "1. Acesse console.cloud.google.com\n" +
                "2. Crie ou selecione um projeto\n" +
                "3. Ative a Cloud Vision API\n" +
                "4. Crie credenciais (API Key)\n" +
                "5. Cole a key aqui",
                [{ text: "OK" }]
              );
            }}
          >
            <Feather name="help-circle" size={16} color={theme.primaryColor} />
            <Text style={[s.helpLinkText, { color: theme.primaryColor }]}>
              Como obter uma API Key?
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Botão Salvar */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 20, backgroundColor: theme.cardBackground }]}>
        <Pressable
          style={[s.saveButton, { backgroundColor: theme.primaryColor }, saving && { opacity: 0.6 }]}
          onPress={() => { soundManager.play("pop"); handleSave(); }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Feather name="check" size={20} color="#FFF" />
              <Text style={s.saveButtonText}>Salvar Configurações</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  title: { fontSize: 20, fontFamily: "DMSans_600SemiBold" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  description: {
    flex: 1,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    lineHeight: 20,
  },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    marginBottom: 16,
  },
  providerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  providerHeader: { marginBottom: 8 },
  providerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  providerName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
  },
  providerDesc: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    lineHeight: 18,
    marginLeft: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
  },
  helpLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  helpLinkText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
  },
  footer: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
});
