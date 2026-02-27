import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import RNQRGenerator from "rn-qr-generator";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  QRScannerService,
  SefazService,
  OCRService,
  InvoiceParser,
  createInvoiceImportedEvent,
  createInvoiceConfirmedEvent,
  InvoiceImportedPayload,
  InvoiceItem,
  SefazFetcher,
  createKeywordClassifier,
  createHybridOCRAdapter,
} from "@packages/parsers";
import { createTransactionEvent } from "@packages/domain/src/transactions";
import { OCRConfigService } from "@/src/services/ocrConfigService";

type ScreenState = "idle" | "scanning" | "fetching" | "parsed" | "error";

export default function InvoiceImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme, dispatchDomainEvent } = useAppState();
  const [permission, requestPermission] = useCameraPermissions();

  const [state, setState] = useState<ScreenState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<InvoiceImportedPayload | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const accounts = Object.values(domain.accounts);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]!.id);
    }
  }, [accounts]);

  // Services
  const scannerService = useRef(new QRScannerService()).current;
  const parser = useRef(new InvoiceParser()).current;

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (state !== "scanning") return;

    const url = scannerService.extractUrl(data);
    if (!url) {
      setError("QR Code inválido. Certifique-se de que é um QR Code de NFC-e.");
      setState("error");
      return;
    }

    startFetching(url);
  };

  const startFetching = async (url: string) => {
    setState("fetching");
    setError(null);

    const fetcher: SefazFetcher = {
      fetchPage: async (u: string) => {
        const response = await fetch(u);
        return await response.text();
      },
    };

    const sefazService = new SefazService(fetcher);

    try {
      const result = await sefazService.fetchAndParse(url);
      const payload = parser.fromSefaz(result);
      setImportedData(payload);
      setState("parsed");
    } catch (err) {
      setError("Falha ao buscar dados da SEFAZ. Tente o OCR como alternativa.");
      setState("error");
    }
  };

  const processOCRImage = async (uri: string) => {
    setState("fetching");
    setError(null);

    try {
      // Carregar configuração do usuário
      const ocrConfig = await OCRConfigService.loadConfig();
      const cloudVisionConfig = await OCRConfigService.getCloudVisionConfig();

      // Criar adaptador híbrido
      const ocrAdapter = createHybridOCRAdapter({
        preferredProvider: ocrConfig.preferredProvider,
        fallbackProviders: ["tesseract", "mlkit"],
        cloudVisionConfig,
      });

      const ocrService = new OCRService(ocrAdapter);
      const ocrResult = await ocrService.processImage(uri);
      const payload = parser.fromOCR(ocrResult);
      setImportedData(payload);
      setState("parsed");
    } catch (err) {
      console.error("[OCR] Erro:", err);
      setError("Falha no processamento OCR. Tente novamente ou use o QR Code.");
      setState("error");
    }
  };

  const handleOCRFromCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets[0]) return;
    await processOCRImage(result.assets[0].uri);
  };

  const handleOCRFallback = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;
    await processOCRImage(result.assets[0].uri);
  };

  // Helper para ler QR Code de imagem usando rn-qr-generator
  const scanQRCodeFromImage = async (imageUri: string): Promise<string | null> => {
    try {
      const response = await RNQRGenerator.detect({
        uri: imageUri,
      });

      if (response && response.values && response.values.length > 0) {
        return response.values[0];
      }

      return null;
    } catch (err) {
      console.error("[QR Scan] Erro:", err);
      return null;
    }
  };

  const handleQRFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    setState("fetching");
    setError(null);

    try {
      // Ler QR Code da imagem
      const qrData = await scanQRCodeFromImage(result.assets[0].uri);

      if (!qrData) {
        setError("Nenhum QR Code encontrado na imagem. Tente tirar uma foto mais nítida.");
        setState("error");
        return;
      }

      const url = scannerService.extractUrl(qrData);

      if (!url) {
        setError("QR Code inválido. Certifique-se de que é um QR Code de NFC-e.");
        setState("error");
        return;
      }

      startFetching(url);
    } catch (err) {
      console.error("[QR Gallery] Erro:", err);
      setError("Erro ao ler QR Code da imagem. Tente novamente.");
      setState("error");
    }
  };

  const confirmImport = async () => {
    if (!importedData || !selectedAccountId) {
      Alert.alert("Erro", "Selecione uma conta para importar.");
      return;
    }

    const importEvent = createInvoiceImportedEvent(importedData);

    // Process items and classify them
    const classifier = createKeywordClassifier();
    const transactionItems = await Promise.all(importedData.items.map(async (item) => {
      const classification = await classifier.classify(item.description);
      return {
        description: item.description,
        amount: item.totalPrice,
        categoryId: classification.categoryId,
      };
    }));

    // Reclassify freight and discounts to predominant category
    const categoryTotals: Record<string, number> = {};

    // Calculate totals per category (excluding freight and discounts)
    transactionItems.forEach(item => {
      const desc = item.description.toLowerCase();
      if (!desc.includes("frete") &&
          !desc.includes("entrega") &&
          !desc.includes("desconto")) {
        categoryTotals[item.categoryId] = (categoryTotals[item.categoryId] || 0) + item.amount;
      }
    });

    // Find predominant category
    const predominantCategoryId = Object.keys(categoryTotals)
      .sort((a, b) => categoryTotals[b]! - categoryTotals[a]!)[0];

    // Apply predominant category to freight and discounts
    if (predominantCategoryId) {
      transactionItems.forEach(item => {
        const desc = item.description.toLowerCase();
        if (desc.includes("frete") || desc.includes("entrega") || desc.includes("desconto")) {
          item.categoryId = predominantCategoryId;
        }
      });
    }

    // Determine transaction category: use "compras_diversas" if multiple categories
    const uniqueCategories = new Set(transactionItems.map(i => i.categoryId));
    const categoryId = uniqueCategories.size > 1
      ? "compras_diversas"
      : (transactionItems[0]?.categoryId || "outros");

    const transactionPayload = {
      accountId: selectedAccountId,
      type: "expense" as const,
      amount: importedData.totalAmount,
      categoryId,
      date: importedData.date.split("T")[0]!,
      description: importedData.emitter.name,
      items: transactionItems,
    };

    const transactionEvents = createTransactionEvent(transactionPayload);

    dispatchDomainEvent(importEvent as any);
    for (const evt of transactionEvents) {
      dispatchDomainEvent(evt);
    }

    const confirmEvent = createInvoiceConfirmedEvent({
      invoiceId: importedData.invoiceId,
      date: importedData.date,
      totalAmount: importedData.totalAmount,
    });
    dispatchDomainEvent(confirmEvent as any);

    Alert.alert("Sucesso", "Nota fiscal e transações importadas com sucesso!");
    router.back();
  };

  if (!permission) return <View />;

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[s.title, { color: theme.textColor }]}>Importar NFC-e</Text>
      </View>

      {state === "idle" && (
        <ScrollView style={s.scrollView} contentContainerStyle={s.idleContent}>
          <Feather name="file-text" size={64} color={theme.primaryColor} style={{ marginBottom: 20 }} />
          <Text style={[s.instruction, { color: theme.textColor }]}>
            Escolha como importar sua nota fiscal
          </Text>

          {/* Seção QR Code */}
          <View style={s.methodSection}>
            <Text style={[s.methodTitle, { color: theme.textColor }]}>QR Code NFC-e</Text>
            <Text style={[s.methodSubtitle, { color: theme.secondaryText }]}>
              Mais rápido e preciso
            </Text>
            <Pressable
              style={[s.button, { backgroundColor: theme.primaryColor }]}
              onPress={() => {
                if (permission?.granted) setState("scanning");
                else requestPermission();
              }}
            >
              <Feather name="camera" size={20} color="#FFF" />
              <Text style={s.buttonText}>Escanear QR Code</Text>
            </Pressable>
            <Pressable
              style={[s.outlineButton, { borderColor: theme.border }]}
              onPress={handleQRFromGallery}
            >
              <Feather name="image" size={20} color={theme.textColor} />
              <Text style={[s.outlineButtonText, { color: theme.textColor }]}>
                Ler QR da Galeria
              </Text>
            </Pressable>
          </View>

          {/* Seção OCR */}
          <View style={s.methodSection}>
            <Text style={[s.methodTitle, { color: theme.textColor }]}>OCR (Reconhecimento de Texto)</Text>
            <Text style={[s.methodSubtitle, { color: theme.secondaryText }]}>
              Para notas sem QR Code
            </Text>
            <Pressable
              style={[s.button, { backgroundColor: theme.accentColor }]}
              onPress={handleOCRFromCamera}
            >
              <Feather name="camera" size={20} color="#FFF" />
              <Text style={s.buttonText}>Tirar Foto para OCR</Text>
            </Pressable>
            <Pressable
              style={[s.outlineButton, { borderColor: theme.border }]}
              onPress={handleOCRFallback}
            >
              <Feather name="image" size={20} color={theme.textColor} />
              <Text style={[s.outlineButtonText, { color: theme.textColor }]}>
                Importar da Galeria
              </Text>
            </Pressable>
          </View>

          {/* Link para configurações */}
          <Pressable
            style={s.settingsLink}
            onPress={() => router.push("/ocr-settings")}
          >
            <Feather name="settings" size={16} color={theme.secondaryText} />
            <Text style={[s.settingsLinkText, { color: theme.secondaryText }]}>
              Configurar OCR
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {state === "scanning" && (
        <View style={s.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <View style={s.overlay}>
            <View style={s.unfocusedContainer} />
            <View style={s.middleContainer}>
              <View style={s.unfocusedContainer} />
              <View style={[s.focusedContainer, { borderColor: theme.primaryColor }]} />
              <View style={s.unfocusedContainer} />
            </View>
            <View style={s.unfocusedContainer} />
          </View>
          <Pressable style={s.closeCamera} onPress={() => setState("idle")}>
            <Feather name="x" size={30} color="#FFF" />
          </Pressable>
        </View>
      )}

      {state === "fetching" && (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={[s.loadingText, { color: theme.textColor }]}>Processando nota fiscal...</Text>
        </View>
      )}

      {state === "parsed" && importedData && (
        <View style={s.parsedContainer}>
          <ScrollView contentContainerStyle={s.parsedScroll}>
            <View style={[s.emitterCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[s.emitterLabel, { color: theme.secondaryText }]}>Estabelecimento</Text>
              <Text style={[s.emitterName, { color: theme.textColor }]}>{importedData.emitter.name}</Text>
              <Text style={[s.emitterCnpj, { color: theme.secondaryText }]}>CNPJ: {importedData.emitter.cnpj}</Text>
            </View>

            <View style={s.accountSection}>
              <Text style={[s.sectionTitle, { color: theme.textColor }]}>Selecionar Conta</Text>
              <View style={s.accountPicker}>
                {accounts.map((acc) => (
                  <Pressable
                    key={acc.id}
                    style={[
                      s.accountChip,
                      {
                        backgroundColor: selectedAccountId === acc.id ? theme.primaryColor : theme.cardBackground,
                        borderColor: selectedAccountId === acc.id ? theme.primaryColor : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedAccountId(acc.id)}
                  >
                    <Text style={{ color: selectedAccountId === acc.id ? "#FFF" : theme.textColor, fontWeight: "600" }}>
                      {acc.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.itemsSection}>
              <Text style={[s.sectionTitle, { color: theme.textColor }]}>Produtos ({importedData.items.length})</Text>
              {importedData.items.map((item, index) => (
                <View key={index} style={[s.itemRow, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.itemDescription, { color: theme.textColor }]}>{item.description}</Text>
                    <Text style={[s.itemSub, { color: theme.secondaryText }]}>
                      {item.quantity} un x R$ {item.unitPrice.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={[s.itemPrice, { color: theme.textColor }]}>R$ {item.totalPrice.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[s.footer, { backgroundColor: theme.cardBackground, paddingBottom: insets.bottom + 20 }]}>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: theme.secondaryText }]}>Total da Nota</Text>
              <Text style={[s.totalAmount, { color: theme.primaryColor }]}>R$ {importedData.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={s.actionRow}>
              <Pressable style={[s.cancelBtn, { borderColor: theme.border }]} onPress={() => setState("idle")}>
                <Text style={[s.cancelBtnText, { color: theme.textColor }]}>Cancelar</Text>
              </Pressable>
              <Pressable style={[s.confirmBtn, { backgroundColor: theme.primaryColor }]} onPress={confirmImport}>
                <Text style={s.confirmBtnText}>Confirmar Importação</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {state === "error" && (
        <View style={s.center}>
          <Feather name="alert-circle" size={64} color={theme.danger} style={{ marginBottom: 20 }} />
          <Text style={[s.errorText, { color: theme.textColor }]}>{error}</Text>
          <Pressable style={[s.button, { backgroundColor: theme.primaryColor }]} onPress={() => setState("idle")}>
            <Text style={s.buttonText}>Tentar Novamente</Text>
          </Pressable>
          <Pressable style={[s.outlineButton, { borderColor: theme.border }]} onPress={handleOCRFallback}>
            <Text style={[s.outlineButtonText, { color: theme.textColor }]}>Usar OCR (Galeria)</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  idleContent: { alignItems: "center", padding: 40, paddingBottom: 60 },
  instruction: { textAlign: "center", fontSize: 16, marginBottom: 40, lineHeight: 24 },
  methodSection: {
    width: "100%",
    marginTop: 20,
    gap: 10,
  },
  methodTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 4,
  },
  methodSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 30,
    paddingVertical: 10,
  },
  settingsLinkText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "100%",
    marginBottom: 15,
    gap: 10,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
    gap: 10,
  },
  outlineButtonText: { fontSize: 16, fontWeight: "500" },
  loadingText: { marginTop: 20, fontSize: 16 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1 },
  unfocusedContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  middleContainer: { flexDirection: "row", height: 280 },
  focusedContainer: { flex: 6, borderWidth: 2, borderRadius: 20 },
  closeCamera: { position: "absolute", top: 50, right: 30 },
  parsedContainer: { flex: 1 },
  parsedScroll: { paddingBottom: 120 },
  emitterCard: { margin: 20, padding: 20, borderRadius: 16 },
  emitterLabel: { fontSize: 12, textTransform: "uppercase", marginBottom: 5 },
  emitterName: { fontSize: 18, fontWeight: "700", marginBottom: 5 },
  emitterCnpj: { fontSize: 14 },
  accountSection: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  accountPicker: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  accountChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  itemsSection: { paddingHorizontal: 20 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 15, borderBottomWidth: 1 },
  itemDescription: { fontSize: 15, fontWeight: "500", marginBottom: 4 },
  itemSub: { fontSize: 13 },
  itemPrice: { fontSize: 16, fontWeight: "600" },
  footer: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  totalLabel: { fontSize: 16, fontWeight: "500" },
  totalAmount: { fontSize: 24, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelBtnText: { fontSize: 16, fontWeight: "600" },
  confirmBtn: { flex: 2, paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  confirmBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  errorText: { textAlign: "center", fontSize: 16, marginBottom: 30, color: "#FF4444" },
});
