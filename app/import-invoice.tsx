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
  OCRAdapter,
  createKeywordClassifier,
} from "@packages/parsers";
import { createTransactionEvent } from "@packages/domain/src/transactions";

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

  const handleOCRFallback = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    setState("fetching");
    setError(null);

    const ocrAdapter: OCRAdapter = {
      recognizeText: async (uri: string) => {
        // Placeholder for ML Kit integration
        // In a real app, this would call a native module
        return { text: `Simulated OCR Text
Item 1 2 x 5.00 10.00
TOTAL 10.00`, confidence: 0.9 };
      },
    };

    const ocrService = new OCRService(ocrAdapter);

    try {
      const ocrResult = await ocrService.processImage(result.assets[0].uri);
      const payload = parser.fromOCR(ocrResult);
      setImportedData(payload);
      setState("parsed");
    } catch (err) {
      setError("Falha no processamento OCR.");
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

    const transactionPayload = {
      accountId: selectedAccountId,
      type: "expense" as const,
      amount: importedData.totalAmount,
      categoryId: transactionItems[0]?.categoryId || "outros",
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
        <Pressable onPress={() => router.back()} style={s.backButton}>
          <Feather name="arrow-left" size={24} color={theme.textColor} />
        </Pressable>
        <Text style={[s.title, { color: theme.textColor }]}>Importar NFC-e</Text>
      </View>

      {state === "idle" && (
        <View style={s.center}>
          <Feather name="maximize" size={64} color={theme.primaryColor} style={{ marginBottom: 20 }} />
          <Text style={[s.instruction, { color: theme.textColor }]}>
            Escaneie o QR Code da sua Nota Fiscal para importar os itens automaticamente.
          </Text>
          <Pressable
            style={[s.button, { backgroundColor: theme.primaryColor }]}
            onPress={() => {
              if (permission.granted) setState("scanning");
              else requestPermission();
            }}
          >
            <Feather name="camera" size={20} color="#FFF" />
            <Text style={s.buttonText}>Escanear QR Code</Text>
          </Pressable>
          <Pressable style={[s.outlineButton, { borderColor: theme.border }]} onPress={handleOCRFallback}>
            <Feather name="image" size={20} color={theme.textColor} />
            <Text style={[s.outlineButtonText, { color: theme.textColor }]}>Importar da Galeria (OCR)</Text>
          </Pressable>
        </View>
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
  instruction: { textAlign: "center", fontSize: 16, marginBottom: 30, lineHeight: 24 },
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
