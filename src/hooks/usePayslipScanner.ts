import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createHybridOCRAdapter, type OCRProvider } from "@packages/parsers";
import type { VisionPayslipInput } from "@packages/parsers";
import { VisionOCRService } from "@packages/ai/src/vision/VisionOCRService";
import { OCRConfigService } from "@/src/services/ocrConfigService";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { soundManager } from "@/src/services/SoundManager";
import { appAlert } from "@/src/services/appAlert";
import { SecureStorageService } from "@/src/modules/security/infrastructure/SecureStorageService";
import { AI_SETTINGS_STORE_KEY } from "@/src/modules/ai/domain/AISettings";
import {
  resolveVisionFromStore,
  scanPayslip,
  type PayslipScanResult,
  type ResolvedVision,
} from "@/src/modules/payslip/scanPayslip";

export type PayslipCaptureSource = "camera" | "gallery";

interface UsePayslipScannerOptions {
  /** Chamado quando o usuário escolhe "Preencher à mão" num alerta de falha. */
  onManual: () => void;
}

/**
 * Configurações da IA lidas do armazenamento no momento do scan (R1 da
 * revisão): trocar o provedor no chat vale na hora, sem depender de uma cópia
 * carregada na montagem.
 */
function resolveVisionNow(): Promise<ResolvedVision> {
  return resolveVisionFromStore(() => SecureStorageService.get(AI_SETTINGS_STORE_KEY), {
    supportsVision: (provider) => VisionOCRService.supportsVision(provider),
    retrieveKey: (provider) => SecureKeyService.retrieveKey(provider),
    isOverBudget: (s) =>
      TokenTracker.isOverBudget(s.provider, s.customBudgets, s.budgetMode, s.monthlyBudgets, s.billingDay),
  });
}

/**
 * Story 11.5: captura do holerite (câmera/galeria). Só orquestra: a escolha
 * Vision × OCR do aparelho fica em `scanPayslip` (puro). O Vision só é tentado
 * com IA ligada, flag `visionOCREnabled`, provedor com visão, chave e orçamento.
 */
export function usePayslipScanner({ onManual }: UsePayslipScannerOptions) {
  const [scanning, setScanning] = useState(false);
  const busy = useRef(false);
  const onManualRef = useRef(onManual);
  onManualRef.current = onManual;

  const alertWithManual = useCallback((title: string, message: string) => {
    appAlert(title, message, [
      { text: "Fechar", style: "cancel" },
      { text: "Preencher à mão", onPress: () => onManualRef.current() },
    ]);
  }, []);

  const scan = useCallback(
    async (source: PayslipCaptureSource): Promise<PayslipScanResult | null> => {
      if (busy.current) return null;
      busy.current = true;
      try {
        const vision = await resolveVisionNow();
        const visionEligible = vision.eligible;
        const provider = vision.provider;
        const apiKey = vision.apiKey;

        let picked: ImagePicker.ImagePickerResult;
        try {
          if (source === "camera") {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              soundManager.play("error");
              alertWithManual(
                "Permissão negada",
                "Permita o acesso à câmera para fotografar o holerite, ou preencha os dados à mão.",
              );
              return null;
            }
            picked = await ImagePicker.launchCameraAsync({ base64: visionEligible, quality: 0.8 });
          } else {
            picked = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              base64: visionEligible,
              quality: 0.8,
            });
          }
        } catch (err) {
          console.warn("[PayslipScanner] Falha ao abrir a imagem:", err);
          soundManager.play("error");
          alertWithManual(
            "Não foi possível abrir a imagem",
            source === "camera"
              ? "A câmera não abriu. Tente de novo ou preencha os dados à mão."
              : "A galeria não abriu. Tente de novo ou preencha os dados à mão.",
          );
          return null;
        }
        if (picked.canceled || !picked.assets?.[0]) return null;
        const asset = picked.assets[0];

        setScanning(true);
        soundManager.play("pop");
        try {
          const result = await scanPayslip({
            visionEligible: visionEligible && !!asset.base64 && !!apiKey,
            runVision: async () => {
              const mimeType = asset.mimeType ?? (asset.uri.endsWith(".png") ? "image/png" : "image/jpeg");
              const raw = await VisionOCRService.process(asset.base64!, mimeType, provider, apiKey!, "payslip");
              return raw as VisionPayslipInput;
            },
            recordVisionTokens: () => TokenTracker.record(provider, 2000, vision.billingDay),
            runLocalOcr: async () => {
              const ocrConfig = await OCRConfigService.loadConfig();
              const cloudVisionConfig = await OCRConfigService.getCloudVisionConfig();
              let preferred: OCRProvider = Platform.OS === "web" ? "tesseract" : "mlkit";
              if (ocrConfig.preferredProvider === "cloudvision") preferred = "cloudvision";
              const adapter = createHybridOCRAdapter({
                preferredProvider: preferred,
                fallbackProviders: ["cloudvision"],
                cloudVisionConfig,
              });
              const { text } = await adapter.recognizeText(asset.uri);
              return text;
            },
            onVisionError: (err) => console.warn("[PayslipScanner] Vision falhou, lendo no aparelho:", err),
          });
          const hasValues = result.data.grossSalary > 0 || result.data.netSalary > 0;
          soundManager.play(hasValues ? "success" : "error");
          return result;
        } catch (err) {
          console.warn("[PayslipScanner] OCR falhou:", err);
          soundManager.play("error");
          alertWithManual(
            "Não foi possível ler o holerite",
            "A leitura da imagem falhou. Tente uma foto mais nítida, confira as configurações de OCR ou preencha os dados à mão.",
          );
          return null;
        } finally {
          setScanning(false);
        }
      } finally {
        busy.current = false;
      }
    },
    [alertWithManual],
  );

  return { scan, scanning };
}
