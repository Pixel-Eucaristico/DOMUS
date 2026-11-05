import { useState, useCallback } from "react";
import { Platform } from "react-native";
import { useCameraPermissions } from "expo-camera";
import {
  createHybridOCRAdapter,
  parseOleriteFromImage,
  parseMeterNumber,
  type OCRProvider,
} from "@packages/parsers";
import { createOleriteReadingEvent } from "@packages/domain";
import { OCRConfigService } from "@/src/services/ocrConfigService";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";

export interface OleriteDraftReading {
  valueText: string;
  unit: string;
  location: string;
  confidence: number;
  imageUri: string;
  timestamp: Date;
}

export interface UseOleriteScannerResult {
  permission: ReturnType<typeof useCameraPermissions>[0];
  requestPermission: ReturnType<typeof useCameraPermissions>[1];
  isScanning: boolean;
  isProcessing: boolean;
  draftReading: OleriteDraftReading | null;
  errorMessage: string | null;
  needsOcrSettings: boolean;
  startCameraScan: () => void;
  closeCameraScan: () => void;
  openManualEntry: () => void;
  closePreviewModal: () => void;
  clearError: () => void;
  setDraftValueText: (text: string) => void;
  setDraftUnit: (unit: string) => void;
  setDraftLocation: (location: string) => void;
  handleProcessPhotos: (uris: string[]) => Promise<void>;
  confirmReading: () => boolean;
}

export function useOleriteScanner(): UseOleriteScannerResult {
  const [permission, requestPermission] = useCameraPermissions();
  const { dispatchDomainEvent, deviceId } = useAppState();

  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draftReading, setDraftReading] = useState<OleriteDraftReading | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsOcrSettings, setNeedsOcrSettings] = useState(false);

  const buildOCRAdapter = async () => {
    const ocrConfig = await OCRConfigService.loadConfig();
    const cloudVisionConfig = await OCRConfigService.getCloudVisionConfig();
    const isWeb = Platform.OS === "web";

    const saved = ocrConfig.preferredProvider;
    let preferred: OCRProvider;
    if (saved === "cloudvision") {
      preferred = "cloudvision";
    } else if (isWeb) {
      preferred = "tesseract";
    } else {
      preferred = "mlkit";
    }

    return createHybridOCRAdapter({
      preferredProvider: preferred,
      fallbackProviders: ["cloudvision"],
      cloudVisionConfig,
    });
  };

  const startCameraScan = useCallback(() => {
    setErrorMessage(null);
    setNeedsOcrSettings(false);
    setIsScanning(true);
  }, []);

  const closeCameraScan = useCallback(() => {
    setIsScanning(false);
  }, []);

  const openManualEntry = useCallback(() => {
    setErrorMessage(null);
    setNeedsOcrSettings(false);
    setIsScanning(false);
    setDraftReading({
      valueText: "",
      unit: "L",
      location: "",
      confidence: 1,
      imageUri: "",
      timestamp: new Date(),
    });
  }, []);

  const closePreviewModal = useCallback(() => {
    setDraftReading(null);
    setErrorMessage(null);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setNeedsOcrSettings(false);
  }, []);

  const setDraftValueText = useCallback((valueText: string) => {
    setErrorMessage(null);
    setDraftReading((prev) => (prev ? { ...prev, valueText } : null));
  }, []);

  const setDraftUnit = useCallback((unit: string) => {
    setDraftReading((prev) => (prev ? { ...prev, unit } : null));
  }, []);

  const setDraftLocation = useCallback((location: string) => {
    setDraftReading((prev) => (prev ? { ...prev, location } : null));
  }, []);

  const handleProcessPhotos = useCallback(async (uris: string[]) => {
    if (!uris.length) return;
    const primaryUri = uris[0]!;
    setIsScanning(false);
    setIsProcessing(true);
    setErrorMessage(null);
    setNeedsOcrSettings(false);

    try {
      const ocrAdapter = await buildOCRAdapter();
      let parsedReading = null;

      for (const uri of uris) {
        const candidate = await parseOleriteFromImage(uri, ocrAdapter);
        if (candidate) {
          parsedReading = candidate;
          break;
        }
      }

      if (parsedReading) {
        setDraftReading({
          valueText: String(parsedReading.value),
          unit: parsedReading.unit || "L",
          location: parsedReading.location ?? "",
          confidence: parsedReading.confidence,
          imageUri: parsedReading.imageUri || primaryUri,
          timestamp: parsedReading.timestamp,
        });
      } else {
        setErrorMessage(
          "Não foi possível identificar números do medidor automaticamente. Informe o valor manualmente abaixo.",
        );
        setDraftReading({
          valueText: "",
          unit: "L",
          location: "",
          confidence: 0,
          imageUri: primaryUri,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const needsSetup =
        msg.includes("OCR_UNAVAILABLE") ||
        msg.includes("Falha em todos os provedores") ||
        msg.includes("API key não configurada") ||
        msg.includes("doesn't seem to be linked");

      setNeedsOcrSettings(needsSetup);
      setErrorMessage(
        needsSetup
          ? Platform.OS === "web"
            ? "Falha no OCR. Verifique as configurações de OCR ou digite o valor manualmente."
            : "OCR automático indisponível neste ambiente. Configure a Cloud Vision API ou digite o valor manualmente."
          : `Não foi possível ler o medidor via OCR (${msg}). Digite o valor manualmente.`,
      );
      setDraftReading({
        valueText: "",
        unit: "L",
        location: "",
        confidence: 0,
        imageUri: primaryUri,
        timestamp: new Date(),
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const confirmReading = useCallback((): boolean => {
    if (!draftReading) return false;
    const parsedValue = parseMeterNumber(draftReading.valueText);
    if (parsedValue === null || parsedValue <= 0) {
      setErrorMessage("Informe um valor numérico positivo válido (ex: 1234,5).");
      return false;
    }

    const event = createOleriteReadingEvent(
      {
        value: parsedValue,
        unit: draftReading.unit || "L",
        confidence: draftReading.confidence,
        imageUri: draftReading.imageUri,
        timestamp: draftReading.timestamp,
        location: draftReading.location.trim() || undefined,
      },
      deviceId ?? "local",
    );

    dispatchDomainEvent(event);
    soundManager.play("success");
    setDraftReading(null);
    setErrorMessage(null);
    return true;
  }, [draftReading, deviceId, dispatchDomainEvent]);

  return {
    permission,
    requestPermission,
    isScanning,
    isProcessing,
    draftReading,
    errorMessage,
    needsOcrSettings,
    startCameraScan,
    closeCameraScan,
    openManualEntry,
    closePreviewModal,
    clearError,
    setDraftValueText,
    setDraftUnit,
    setDraftLocation,
    handleProcessPhotos,
    confirmReading,
  };
}
