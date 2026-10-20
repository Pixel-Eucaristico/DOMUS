import React, { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams , useRouter } from "expo-router";
import { View, ActivityIndicator, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { InvoiceImportedPayload } from "@packages/parsers";

import { useInvoiceWebView } from "@/src/hooks/useInvoiceWebView";
import { useInvoiceScanner } from "@/src/hooks/useInvoiceScanner";
import { useEditableItems } from "@/src/hooks/useEditableItems";
import { useExternalLookups } from "@/src/hooks/useExternalLookups";
import { useInvoiceConfirm } from "@/src/hooks/useInvoiceConfirm";
import { useAISettings } from "@/src/hooks/useAISettings";
import { SecureKeyService } from "@/src/modules/ai/infrastructure/SecureKeyService";
import { TokenTracker } from "@/src/modules/ai/application/TokenTracker";

import { IdleScreen } from "@/src/components/invoice/IdleScreen";
import { QrScanScreen } from "@/src/components/invoice/QrScanScreen";
import { OcrScanScreen } from "@/src/components/invoice/OcrScanScreen";
import { WebViewScreen } from "@/src/components/invoice/WebViewScreen";
import { ParsedScreen } from "@/src/components/invoice/ParsedScreen";
import { ErrorScreen } from "@/src/components/invoice/ErrorScreen";

type ScreenState = "idle" | "qr" | "ocr" | "webview" | "fetching" | "parsed" | "error";

export default function InvoiceImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme } = useAppState();

  const [state, setState] = useState<ScreenState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showOcrSettingsLink, setShowOcrSettingsLink] = useState(false);
  const [importedData, setImportedData] = useState<InvoiceImportedPayload | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [aiApiKey, setAiApiKey] = useState<string | undefined>();
  const [aiToast, setAiToast] = useState<{ tokens: number; provider: string } | null>(null);
  const aiTokensRef = React.useRef(0);

  const { settings: aiSettings } = useAISettings();
  const accounts = Object.values(domain.accounts);

  // Carregar API key do provedor ativo para classificação por IA
  useEffect(() => {
    if (aiSettings.isEnabled && aiSettings.provider) {
      SecureKeyService.retrieveKey(aiSettings.provider as any).then((key) => {
        setAiApiKey(key ?? undefined);
      });
    } else {
      setAiApiKey(undefined);
    }
  }, [aiSettings.isEnabled, aiSettings.provider]);

  // Carregar dados do Vision OCR (quando vem do ai-chat)
  const params = useLocalSearchParams<{ fromVision?: string }>();
  const visionLoadedRef = useRef(false);
  useEffect(() => {
    if (params.fromVision === "1" && !visionLoadedRef.current) {
      visionLoadedRef.current = true;
      AsyncStorage.getItem("@domus/vision_ocr_result").then((raw) => {
        if (!raw) return;
        AsyncStorage.removeItem("@domus/vision_ocr_result");
        try {
          const payload = JSON.parse(raw) as InvoiceImportedPayload;
          setImportedData(payload);
          setState("parsed");
        } catch {}
      });
    }
  }, [params.fromVision]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]!.id);
    }
  }, [accounts, selectedAccountId]);

  const webview = useInvoiceWebView(
    (payload) => { setImportedData(payload); setState("parsed"); },
    (msg) => { setError(msg); setState("error"); },
  );

  const scanner = useInvoiceScanner(
    (url, chave) => { webview.openInWebView(url, chave); setState("webview"); },
    (payload) => { setImportedData(payload); setState("parsed"); },
    (msg, showOcrSettings) => { setError(msg); setShowOcrSettingsLink(showOcrSettings); setState("error"); },
    () => setState("fetching"),
  );

  const externalLookups = useExternalLookups();

  const items = useEditableItems(importedData, {
    aiEnabled: aiSettings.isEnabled && !!aiApiKey,
    // Flag de consultas: EAN (Open Food Facts, Cosmos) e tabela NCM (Siscomex)
    externalLookups: externalLookups.enabled,
    aiApiKey: aiApiKey,
    aiProvider: aiSettings.provider,
    onTokensUsed: (provider, tokens) => {
      aiTokensRef.current += tokens;
      // Registrar no TokenTracker
      TokenTracker.record(provider as any, tokens, aiSettings.billingDay);
      // Mostrar toast com total acumulado
      setAiToast({ tokens: aiTokensRef.current, provider });
      // Esconder toast após 3s
      setTimeout(() => setAiToast(null), 3000);
    },
  });

  const { confirmImport } = useInvoiceConfirm(
    importedData,
    items.editableItems,
    items.computedTotal,
    items.invoiceDateDisplay,
    selectedAccountId,
  );

  const handleManualEntry = () => {
    const today = new Date();
    const iso = today.toISOString().split("T")[0]!;
    const [y, m, d] = iso.split("-");
    items.setInvoiceDateDisplay(`${d}/${m}/${y}`);
    setImportedData({
      invoiceId: Date.now().toString(36),
      source: "SEFAZ_QR",
      emitter: { name: "Lançamento manual", cnpj: "" },
      date: today.toISOString(),
      items: [],
      totalAmount: 0,
    });
    setState("parsed");
  };

  const handleReset = () => {
    setState("idle");
    setShowOcrSettingsLink(false);
    setError(null);
  };

  // FIX-2026-03-09: loading state ao inves de View vazio durante
  // carregamento de permissao. Ver docs/tour-crash-fixes.md #3
  if (!scanner.permission) {
    return (
      <View style={[s.container, s.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primaryColor} />
      </View>
    );
  }

  const fullscreenState = state === "qr" || state === "webview";

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Shared header — hidden during full-screen states */}
      {!fullscreenState && state !== "ocr" && (
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => { soundManager.play("tap"); router.back(); }} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <Text style={[s.title, { color: theme.textColor }]}>Importar NF</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      {/* AI Usage Toast */}
      {aiToast && (
        <View style={[s.aiToast, { top: insets.top + 56, backgroundColor: theme.primaryColor + "E8" }]}>
          <Feather name="cpu" size={14} color="#FFF" />
          <Text style={s.aiToastText}>
            IA categorizou • {aiToast.tokens} tokens ({aiToast.provider})
          </Text>
        </View>
      )}

      {state === "idle" && (
        <IdleScreen
          theme={theme}
          onQRPress={() => setState("qr")}
          onOCRPress={() => setState("ocr")}
          onManualEntry={handleManualEntry}
        />
      )}

      {state === "qr" && (
        <QrScanScreen
          theme={theme}
          insets={insets}
          permissionGranted={scanner.permission?.granted ?? false}
          manualChave={scanner.manualChave}
          onManualChaveChange={scanner.setManualChave}
          onBarcodeScanned={scanner.handleBarCodeScanned}
          onRequestPermission={scanner.requestPermission}
          onQRFromGallery={scanner.handleQRFromGallery}
          onManualChaveSubmit={scanner.handleManualChave}
          onClose={() => setState("idle")}
        />
      )}

      {state === "ocr" && (
        <OcrScanScreen
          theme={theme}
          insets={insets}
          permissionGranted={scanner.permission?.granted ?? false}
          onRequestPermission={scanner.requestPermission}
          onProcessPhotos={scanner.handleOCRMultiple}
          onClose={() => setState("idle")}
        />
      )}

      {state === "webview" && (
        <WebViewScreen
          theme={theme}
          insets={insets}
          webviewRef={webview.webviewRef}
          webviewUrl={webview.webviewUrl}
          webviewLoading={webview.webviewLoading}
          isEnrichingMode={webview.isEnrichingMode}
          isWaitingUserClick={webview.isWaitingUserClick}
          autoFillScript={webview.autoFillScript}
          onMessage={webview.handleWebViewMessage}
          onLoadStart={webview.onLoadStart}
          onLoadEnd={webview.onLoadEnd}
          onNavigationStateChange={webview.onNavigationStateChange}
          onError={webview.onWebViewError}
          onCapture={webview.handleCaptureData}
          onClose={() => setState("idle")}
        />
      )}

      {state === "fetching" && (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={[s.loadingText, { color: theme.textColor }]}>Processando...</Text>
        </View>
      )}

      {state === "parsed" && importedData && (
        <ParsedScreen
          theme={theme}
          insets={insets}
          importedData={importedData}
          editableItems={items.editableItems}
          editingIdx={items.editingIdx}
          isAddingItem={items.isAddingItem}
          invoiceDateDisplay={items.invoiceDateDisplay}
          computedTotal={items.computedTotal}
          selectedAccountId={selectedAccountId}
          accounts={accounts}
          newItemDesc={items.newItemDesc}
          newItemQty={items.newItemQty}
          newItemUnit={items.newItemUnit}
          newItemUnitPrice={items.newItemUnitPrice}
          newItemEan={items.newItemEan}
          newItemNcm={items.newItemNcm}
          onEditingIdxChange={items.setEditingIdx}
          onIsAddingItemChange={items.setIsAddingItem}
          onInvoiceDateChange={items.setInvoiceDateDisplay}
          onAccountSelect={setSelectedAccountId}
          onNewItemDescChange={items.setNewItemDesc}
          onNewItemQtyChange={items.setNewItemQty}
          onNewItemUnitChange={items.setNewItemUnit}
          onNewItemUnitPriceChange={items.setNewItemUnitPrice}
          onNewItemEanChange={items.setNewItemEan}
          onNewItemNcmChange={items.setNewItemNcm}
          onEditField={items.handleEditField}
          onRemoveItem={items.handleRemoveEditableItem}
          onAddItem={items.handleAddEditableItem}
          onCancel={() => setState("idle")}
          onConfirm={confirmImport}
        />
      )}

      {state === "error" && error && (
        <ErrorScreen
          theme={theme}
          error={error}
          showOcrSettingsLink={showOcrSettingsLink}
          onReset={handleReset}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  aiToast: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  aiToastText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 16, fontSize: 15 },
});
