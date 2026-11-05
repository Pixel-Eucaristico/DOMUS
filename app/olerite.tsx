import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { useOleriteScanner } from "@/src/hooks/useOleriteScanner";
import { OcrScanScreen } from "@/src/components/invoice/OcrScanScreen";
import { OleriteHistoryView } from "@/src/components/olerite/OleriteHistoryView";
import { OleriteCapturePreviewModal } from "@/src/components/olerite/OleriteCapturePreviewModal";

export default function OleriteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { domain, theme } = useAppState();
  const scanner = useOleriteScanner();

  if (scanner.isScanning) {
    return (
      <OcrScanScreen
        theme={theme}
        insets={insets}
        permissionGranted={!!scanner.permission?.granted}
        onRequestPermission={() => {
          scanner.requestPermission();
        }}
        onProcessPhotos={scanner.handleProcessPhotos}
        onClose={scanner.closeCameraScan}
        title="OCR — Leitura de Medidor"
        hintText="Enquadre o visor do medidor na moldura"
        showMeterGuide
      />
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: theme.border,
            backgroundColor: theme.cardBackground,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            soundManager.play("tap");
            router.back();
          }}
          hitSlop={12}
          style={s.backBtn}
        >
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </Pressable>
        <View style={s.headerTitleWrap}>
          <Text style={[s.headerTitle, { color: theme.textColor }]}>
            Leitor de Olerite / Medidor
          </Text>
          <Text style={[s.headerSubtitle, { color: theme.secondaryText }]}>
            Captura por OCR e histórico de consumo
          </Text>
        </View>
        <Pressable
          onPress={() => {
            soundManager.play("tap");
            router.push("/ocr-settings");
          }}
          hitSlop={12}
          style={s.settingsBtn}
        >
          <Feather name="settings" size={20} color={theme.secondaryText} />
        </Pressable>
      </View>

      {/* Processing state */}
      {scanner.isProcessing ? (
        <View style={s.processingWrap}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={[s.processingText, { color: theme.textColor }]}>
            Processando leitura do medidor via OCR...
          </Text>
        </View>
      ) : (
        <OleriteHistoryView
          readings={domain.oleriteReadings ?? {}}
          theme={theme}
          onStartCameraScan={scanner.startCameraScan}
          onOpenManualEntry={scanner.openManualEntry}
        />
      )}

      {/* Preview / Edit Modal */}
      <OleriteCapturePreviewModal
        visible={scanner.draftReading !== null}
        theme={theme}
        draft={scanner.draftReading}
        errorMessage={scanner.errorMessage}
        needsOcrSettings={scanner.needsOcrSettings}
        onChangeValue={scanner.setDraftValueText}
        onChangeUnit={scanner.setDraftUnit}
        onChangeLocation={scanner.setDraftLocation}
        onConfirm={() => {
          scanner.confirmReading();
        }}
        onCancel={scanner.closePreviewModal}
        onOpenOcrSettings={() => {
          scanner.closePreviewModal();
          router.push("/ocr-settings");
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  processingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  processingText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
