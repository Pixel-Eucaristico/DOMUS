import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { InvoiceImportedPayload } from "@packages/parsers";

import { useInvoiceWebView } from "@/src/hooks/useInvoiceWebView";
import { useInvoiceScanner } from "@/src/hooks/useInvoiceScanner";
import { useEditableItems } from "@/src/hooks/useEditableItems";
import { useInvoiceConfirm } from "@/src/hooks/useInvoiceConfirm";

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

  const accounts = Object.values(domain.accounts);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]!.id);
    }
  }, [accounts]);

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

  const items = useEditableItems(importedData);

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

  if (!scanner.permission) return <View />;

  const fullscreenState = state === "qr" || state === "webview";

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Shared header — hidden during full-screen states */}
      {!fullscreenState && state !== "ocr" && (
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={theme.textColor} />
          </Pressable>
          <Text style={[s.title, { color: theme.textColor }]}>Importar NF</Text>
          <View style={{ width: 24 }} />
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 16, fontSize: 15 },
});
