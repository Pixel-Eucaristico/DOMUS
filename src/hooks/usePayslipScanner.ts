import { useState, useCallback } from "react";
import { Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  createHybridOCRAdapter,
  parsePayslipText,
  normalizeVisionPayslip,
  type OCRProvider,
  type PayslipParseResult,
} from "@packages/parsers";
import { VisionOCRService } from "@packages/ai/src/vision/VisionOCRService";
import type { PayslipOCRResult } from "@packages/ai/src/vision/ocrSchema";
import { OCRConfigService } from "@/src/services/ocrConfigService";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";
import { soundManager } from "@/src/services/SoundManager";
import { useAISettings } from "@/src/hooks/useAISettings";

/** Chave usada pelo ai-chat para entregar um holerite lido pelo Vision OCR */
export const VISION_PAYSLIP_KEY = "@domus/vision_payslip_result";

export type PayslipScanSource = "camera" | "gallery";

export interface PayslipScanResult {
  data: PayslipParseResult;
  method: "vision" | "ocr";
}

/**
 * Captura de holerite: Vision OCR (IA) quando há provedor com visão
 * configurado; senão OCR on-device + parser local de holerite.
 */
export function usePayslipScanner() {
  const { settings } = useAISettings();
  const [scanning, setScanning] = useState(false);

  const visionAvailable =
    settings.isEnabled && VisionOCRService.supportsVision(settings.provider as any);

  const pickImage = useCallback(async (source: PayslipScanSource, base64: boolean) => {
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permissão negada", "Permita acesso à câmera para fotografar o holerite.");
        return null;
      }
      return ImagePicker.launchCameraAsync({ base64, quality: 0.8 });
    }
    return ImagePicker.launchImageLibraryAsync({ base64, quality: 0.8 });
  }, []);

  const scanWithVision = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const provider = settings.provider as any;
    const overBudget = await TokenTracker.isOverBudget(
      provider, settings.customBudgets, settings.budgetMode, settings.monthlyBudgets, settings.billingDay,
    );
    if (overBudget) throw new Error("Limite de uso de IA atingido. Ajuste o orçamento nas configurações de IA.");

    const apiKey = await SecureKeyService.retrieveKey(provider);
    if (!apiKey) throw new Error("Configure a chave API nas configurações de IA.");

    const mimeType = asset.mimeType ?? (asset.uri.endsWith(".png") ? "image/png" : "image/jpeg");
    const raw = (await VisionOCRService.process(asset.base64!, mimeType, provider, apiKey, "payslip")) as PayslipOCRResult;
    await TokenTracker.record(provider, 2000, settings.billingDay);
    return normalizeVisionPayslip(raw);
  }, [settings]);

  const scanWithLocalOCR = useCallback(async (uri: string) => {
    const ocrConfig = await OCRConfigService.loadConfig();
    const cloudVisionConfig = await OCRConfigService.getCloudVisionConfig();
    let preferred: OCRProvider = Platform.OS === "web" ? "tesseract" : "mlkit";
    if (ocrConfig.preferredProvider === "cloudvision") preferred = "cloudvision";
    const adapter = createHybridOCRAdapter({
      preferredProvider: preferred,
      fallbackProviders: ["cloudvision"],
      cloudVisionConfig,
    });
    const { text } = await adapter.recognizeText(uri);
    return parsePayslipText(text);
  }, []);

  const scan = useCallback(async (source: PayslipScanSource): Promise<PayslipScanResult | null> => {
    const result = await pickImage(source, visionAvailable);
    if (!result || result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];

    setScanning(true);
    soundManager.play("pop");
    try {
      let data: PayslipParseResult;
      let method: PayslipScanResult["method"];
      if (visionAvailable && asset.base64) {
        try {
          data = await scanWithVision(asset);
          method = "vision";
        } catch (err) {
          console.warn("[PayslipScanner] Vision falhou, usando OCR local:", err);
          data = await scanWithLocalOCR(asset.uri);
          method = "ocr";
        }
      } else {
        data = await scanWithLocalOCR(asset.uri);
        method = "ocr";
      }

      if (data.netSalary <= 0 && data.grossSalary <= 0) {
        soundManager.play("error");
        Alert.alert(
          "Holerite não reconhecido",
          "Não encontramos valores na imagem. Tente uma foto mais nítida ou preencha manualmente.",
        );
      } else {
        soundManager.play("success");
      }
      return { data, method };
    } catch (err: any) {
      soundManager.play("error");
      Alert.alert("Erro ao ler holerite", err?.message ?? "Falha desconhecida");
      return null;
    } finally {
      setScanning(false);
    }
  }, [pickImage, visionAvailable, scanWithVision, scanWithLocalOCR]);

  return { scan, scanning, visionAvailable };
}
