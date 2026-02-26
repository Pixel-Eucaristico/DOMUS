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
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { OCRConfigService } from "@/src/services/ocrConfigService";
import type { OCRProvider } from "@packages/parsers";

export default function OCRSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppState();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<OCRProvider>("tesseract");
  const [apiKey, setApiKey] = useState("");
  const [hasCloudVision, setHasCloudVision] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await OCRConfigService.loadConfig();
      setProvider(config.preferredProvider);
      setApiKey(config.cloudVisionApiKey || "");
      setHasCloudVision(!!config.cloudVisionApiKey);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar as configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Se selecionou Cloud Vision mas não tem API key
      if (provider === "cloudvision" && !apiKey.trim()) {
        Alert.alert(
          "API Key necessária",
          "Para usar Cloud Vision API, você precisa fornecer uma API Key do Google Cloud."
        );
        return;
      }

      await OCRConfigService.setPreferredProvider(provider);

      if (apiKey.trim()) {
        await OCRConfigService.setCloudVisionApiKey(apiKey.trim());
      } else {
        await OCRConfigService.clearCloudVisionApiKey();
      }

      Alert.alert("Sucesso", "Configurações salvas com sucesso!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
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
        <Pressable onPress={() => router.back()}>
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
            O sistema usa OCR híbrido com fallback automático. Tesseract funciona nativamente
            no Expo. Cloud Vision API requer configuração de chave. ML Kit nativo requer
            ejetar do Expo (bare React Native).
          </Text>
        </View>

        {/* Provedor Preferido */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>
            Provedor Preferido
          </Text>

          <Pressable
            style={[
              s.providerCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: provider === "tesseract" ? theme.primaryColor : theme.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => setProvider("tesseract")}
          >
            <View style={s.providerHeader}>
              <View style={s.providerTitleRow}>
                <Feather
                  name={provider === "tesseract" ? "check-circle" : "circle"}
                  size={20}
                  color={provider === "tesseract" ? theme.primaryColor : theme.secondaryText}
                />
                <Text style={[s.providerName, { color: theme.textColor }]}>
                  Tesseract
                </Text>
                <View style={[s.badge, { backgroundColor: `${theme.success}20` }]}>
                  <Text style={[s.badgeText, { color: theme.success }]}>Recomendado</Text>
                </View>
              </View>
            </View>
            <Text style={[s.providerDesc, { color: theme.secondaryText }]}>
              100% gratuito, código aberto, funciona nativamente no Expo
            </Text>
          </Pressable>

          <Pressable
            style={[
              s.providerCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: provider === "mlkit" ? theme.primaryColor : theme.border,
                borderWidth: 2,
                opacity: 0.6,
              },
            ]}
            onPress={() => {
              Alert.alert(
                "ML Kit Nativo",
                "Google ML Kit requer ejetar do Expo (bare React Native). No Expo Managed, " +
                "usamos Tesseract como fallback automaticamente.\n\n" +
                "Para usar ML Kit nativo, execute: npx expo prebuild --clean",
                [{ text: "OK" }]
              );
            }}
          >
            <View style={s.providerHeader}>
              <View style={s.providerTitleRow}>
                <Feather
                  name="alert-circle"
                  size={20}
                  color={theme.secondaryText}
                />
                <Text style={[s.providerName, { color: theme.secondaryText }]}>
                  Google ML Kit
                </Text>
                <View style={[s.badge, { backgroundColor: `${theme.secondaryText}20` }]}>
                  <Text style={[s.badgeText, { color: theme.secondaryText }]}>Bare RN</Text>
                </View>
              </View>
            </View>
            <Text style={[s.providerDesc, { color: theme.secondaryText }]}>
              Requer ejetar do Expo (npx expo prebuild)
            </Text>
          </Pressable>

          <Pressable
            style={[
              s.providerCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: provider === "cloudvision" ? theme.primaryColor : theme.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => setProvider("cloudvision")}
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
                  <Text style={[s.badgeText, { color: theme.primaryColor }]}>Premium</Text>
                </View>
              </View>
            </View>
            <Text style={[s.providerDesc, { color: theme.secondaryText }]}>
              Melhor precisão, requer API key do Google Cloud (pago)
            </Text>
          </Pressable>
        </View>

        {/* API Key Cloud Vision */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: theme.textColor }]}>
            API Key do Cloud Vision (Opcional)
          </Text>
          <Text style={[s.sectionSubtitle, { color: theme.secondaryText }]}>
            Necessário apenas se escolher Cloud Vision como preferido
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
            {apiKey && (
              <Pressable onPress={() => setApiKey("")}>
                <Feather name="x-circle" size={18} color={theme.secondaryText} />
              </Pressable>
            )}
          </View>

          <Pressable
            style={s.helpLink}
            onPress={() => {
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
          style={[
            s.saveButton,
            { backgroundColor: theme.primaryColor },
            saving && { opacity: 0.6 },
          ]}
          onPress={handleSave}
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
  providerHeader: {
    marginBottom: 8,
  },
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
