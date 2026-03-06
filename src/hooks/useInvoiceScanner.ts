import { useState, useCallback, useRef } from "react";
import { Alert, Platform } from "react-native";
import { soundManager } from "@/src/services/SoundManager";
import type { OCRProvider } from "@packages/parsers";
import { useCameraPermissions, scanFromURLAsync } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  InvoiceImportedPayload,
  InvoiceParser,
  OCRService,
  createHybridOCRAdapter,
  parseNFCeQRCode,
} from "@packages/parsers";
import { OCRConfigService } from "@/src/services/ocrConfigService";
import { SEFAZ_SP_CONSULTA } from "./useInvoiceWebView";

export interface UseInvoiceScannerResult {
  permission: ReturnType<typeof useCameraPermissions>[0];
  requestPermission: ReturnType<typeof useCameraPermissions>[1];
  manualChave: string;
  setManualChave: (v: string) => void;
  handleBarCodeScanned: (event: { data: string }) => void;
  handleQRFromGallery: () => Promise<void>;
  handleManualChave: () => void;
  handleOCRMultiple: (uris: string[]) => Promise<void>;
}

export function useInvoiceScanner(
  onNavigateWebView: (url: string, chave: string) => void,
  onImported: (payload: InvoiceImportedPayload) => void,
  onError: (msg: string, showOcrSettings: boolean) => void,
  onStartFetching: () => void,
): UseInvoiceScannerResult {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualChave, setManualChave] = useState("");
  const parser = useRef(new InvoiceParser()).current;

  const buildOCRService = async () => {
    const ocrConfig = await OCRConfigService.loadConfig();
    const cloudVisionConfig = await OCRConfigService.getCloudVisionConfig();
    const isWeb = Platform.OS === "web";

    // Auto-detect melhor provider para a plataforma atual:
    // - Web: Tesseract funciona (Web Workers + WASM disponíveis no browser)
    // - Native: mlkit (rn-mlkit-ocr) funciona on-device via ML Kit / Vision
    // A configuração salva pelo usuário é respeitada, mas corrigimos
    // incompatibilidades silenciosamente (ex: mlkit no web → tesseract)
    const saved = ocrConfig.preferredProvider;
    let preferred: OCRProvider;
    if (saved === "cloudvision") {
      preferred = "cloudvision";
    } else if (isWeb) {
      preferred = "tesseract";
    } else {
      preferred = "mlkit";
    }

    const ocrAdapter = createHybridOCRAdapter({
      preferredProvider: preferred,
      fallbackProviders: ["cloudvision"],
      cloudVisionConfig,
    });
    return new OCRService(ocrAdapter);
  };

  const handleOCRMultiple = async (uris: string[]) => {
    if (!uris.length) return;
    onStartFetching();
    try {
      const ocrService = await buildOCRService();
      const results = [];
      for (const uri of uris) {
        results.push(await ocrService.processImage(uri));
      }
      // Merge: combine items from all pages, highest total, first valid date/id
      const merged = {
        invoiceId: results.find((r) => r.invoiceId)?.invoiceId ?? Date.now().toString(36),
        date: results.find((r) => r.date)?.date ?? null,
        items: results.flatMap((r) => r.items),
        totalAmount: Math.max(...results.map((r) => r.totalAmount)),
        confidence: Math.min(...results.map((r) => r.confidence)),
      };
      const payload = parser.fromOCR(merged);
      onImported(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[OCR] Erro:", msg);

      // Qualquer falha total de OCR indica que nenhum provider está operacional:
      // - OCR_UNAVAILABLE: módulo nativo não linkado (falta prebuild)
      // - "Falha em todos os provedores": todos falharam (inclui "API key não configurada")
      // - "API key não configurada": Cloud Vision sem chave
      // Em todos os casos o usuário precisa ir às configurações.
      const needsSetup =
        msg.includes("OCR_UNAVAILABLE") ||
        msg.includes("Falha em todos os provedores") ||
        msg.includes("API key não configurada") ||
        msg.includes("doesn't seem to be linked");

      if (needsSetup) {
        onError(
          Platform.OS === "web"
            ? "Falha no OCR. Verifique as configurações de OCR."
            : "OCR não disponível. O ML Kit requer um development build " +
              "(não funciona no Expo Go). Use 'npx expo run:android' para criar um dev build, " +
              "ou configure a Cloud Vision API nas configurações.",
          true,
        );
      } else {
        onError(`Falha no processamento OCR: ${msg}`, false);
      }
    }
  };

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      const parsed = parseNFCeQRCode(data);
      if (!parsed) {
        onError("QR Code inválido. Certifique-se de que é um QR Code de NFC-e.", false);
        return;
      }
      soundManager.play("share");
      onNavigateWebView(parsed.url, parsed.chaveAcesso || "");
    },
    [onNavigateWebView, onError],
  );

  const handleQRFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    onStartFetching();

    try {
      // Resize to ensure a file:// URI and manageable dimensions for the scanner
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 },
      );
      const scanResults = await scanFromURLAsync(resized.uri, ["qr"]);
      if (!scanResults?.length) {
        onError(
          "Nenhum QR Code encontrado na imagem. Tente digitar a chave de acesso manualmente.",
          false,
        );
        return;
      }
      const parsed = parseNFCeQRCode(scanResults[0]!.data);
      if (!parsed) {
        onError("QR Code inválido. Não é um QR Code de NFC-e.", false);
        return;
      }
      onNavigateWebView(parsed.url, parsed.chaveAcesso || "");
    } catch (err) {
      console.error("[QR Gallery] Erro:", err);
      onError("Erro ao ler QR Code da imagem. Tente digitar a chave de acesso.", false);
    }
  };

  const handleManualChave = () => {
    const cleaned = manualChave.replace(/\D/g, "");
    if (cleaned.length !== 44) {
      Alert.alert(
        "Chave Inválida",
        "A chave de acesso deve conter exatamente 44 dígitos numéricos.",
      );
      return;
    }
    onNavigateWebView(SEFAZ_SP_CONSULTA, cleaned);
  };

  return {
    permission,
    requestPermission,
    manualChave,
    setManualChave,
    handleBarCodeScanned,
    handleQRFromGallery,
    handleManualChave,
    handleOCRMultiple,
  };
}
