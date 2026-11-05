import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { KeyboardSheet, useSheetBackdropPress } from "@/src/components/shared/KeyboardSheet";
import { Feather } from "@expo/vector-icons";
import { ThemeColors } from "@packages/theme";
import { TButton, TInput } from "@/src/components/tamagui";
import { soundManager } from "@/src/services/SoundManager";
import type { OleriteDraftReading } from "@/src/hooks/useOleriteScanner";

const AVAILABLE_UNITS = ["L", "ml", "m³", "kWh"] as const;

interface Props {
  visible: boolean;
  theme: ThemeColors;
  draft: OleriteDraftReading | null;
  errorMessage: string | null;
  needsOcrSettings: boolean;
  onChangeValue: (val: string) => void;
  onChangeUnit: (unit: string) => void;
  onChangeLocation: (location: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onOpenOcrSettings: () => void;
}

export function OleriteCapturePreviewModal({
  visible,
  theme,
  draft,
  errorMessage,
  needsOcrSettings,
  onChangeValue,
  onChangeUnit,
  onChangeLocation,
  onConfirm,
  onCancel,
  onOpenOcrSettings,
}: Props) {
  const handleBackdropPress = useSheetBackdropPress(() => {
    soundManager.play("tap");
    onCancel();
  });

  if (!draft) return null;

  const confidencePct = Math.round((draft.confidence ?? 0) * 100);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={s.modalRoot}>
        <View style={s.backdrop}>
          <Pressable style={s.flex} onPress={handleBackdropPress} />
        </View>

        <KeyboardSheet
          sheetStyle={[
            s.sheet,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
          basePaddingBottom={20}
          header={
            <View style={s.header}>
              <View style={s.headerTitleRow}>
                <Feather name="activity" size={20} color={theme.primaryColor} />
                <Text style={[s.title, { color: theme.textColor }]}>
                  Confirmar Leitura do Medidor
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  soundManager.play("tap");
                  onCancel();
                }}
                hitSlop={10}
              >
                <Feather name="x" size={20} color={theme.secondaryText} />
              </Pressable>
            </View>
          }
          footer={
            <TButton
              variant="primary"
              backgroundColor={theme.primaryColor}
              onPress={onConfirm}
            >
              Salvar Leitura
            </TButton>
          }
        >
          {/* Thumbnail + OCR confidence */}
          {draft.imageUri ? (
            <View style={[s.previewRow, { borderColor: theme.border }]}>
              <Image source={{ uri: draft.imageUri }} style={s.thumbnail} />
              <View style={s.previewInfo}>
                <Text style={[s.previewLabel, { color: theme.secondaryText }]}>
                  Captura por OCR
                </Text>
                <Text style={[s.confidenceText, { color: theme.textColor }]}>
                  {confidencePct > 0
                    ? `Confiança do OCR: ${confidencePct}%`
                    : "Revisão manual necessária"}
                </Text>
                <Text style={[s.timestampText, { color: theme.secondaryText }]}>
                  {draft.timestamp.toLocaleString("pt-BR")}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Error / Warning message */}
          {errorMessage ? (
            <View
              style={[
                s.errorBox,
                {
                  backgroundColor: `${theme.danger}18`,
                  borderColor: theme.danger,
                },
              ]}
            >
              <Feather name="alert-circle" size={16} color={theme.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[s.errorText, { color: theme.textColor }]}>
                  {errorMessage}
                </Text>
                {needsOcrSettings ? (
                  <Pressable
                    onPress={() => {
                      soundManager.play("tap");
                      onOpenOcrSettings();
                    }}
                    style={s.ocrSettingsLink}
                  >
                    <Text
                      style={[
                        s.ocrSettingsLinkText,
                        { color: theme.primaryColor },
                      ]}
                    >
                      Abrir Configurações de OCR
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Valor Lido */}
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: theme.secondaryText }]}>
              Valor do Medidor *
            </Text>
            <TInput
              value={draft.valueText}
              onChangeText={onChangeValue}
              placeholder="Ex: 1234,5"
              keyboardType="decimal-pad"
              backgroundColor={theme.background}
              borderColor={theme.border}
              color={theme.textColor}
            />
          </View>

          {/* Unidade */}
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: theme.secondaryText }]}>
              Unidade
            </Text>
            <View style={s.unitsRow}>
              {AVAILABLE_UNITS.map((unitOption) => {
                const selected = draft.unit === unitOption;
                return (
                  <Pressable
                    key={unitOption}
                    onPress={() => {
                      soundManager.play("tap");
                      onChangeUnit(unitOption);
                    }}
                    style={[
                      s.unitChip,
                      {
                        backgroundColor: selected
                          ? theme.primaryColor
                          : theme.background,
                        borderColor: selected
                          ? theme.primaryColor
                          : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.unitChipText,
                        { color: selected ? "#FFFFFF" : theme.textColor },
                      ]}
                    >
                      {unitOption}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Local opcional */}
          <View style={s.fieldGroup}>
            <Text style={[s.label, { color: theme.secondaryText }]}>
              Local / Identificação (opcional)
            </Text>
            <TInput
              value={draft.location}
              onChangeText={onChangeLocation}
              placeholder="Ex: Tanque principal, Gerador, Cozinha"
              backgroundColor={theme.background}
              borderColor={theme.border}
              color={theme.textColor}
            />
          </View>

          <View style={{ marginTop: 12, marginBottom: 8 }}>
            <TButton
              variant="outline"
              borderColor={theme.border}
              color={theme.textColor}
              onPress={() => {
                soundManager.play("tap");
                onCancel();
              }}
            >
              Cancelar
            </TButton>
          </View>
        </KeyboardSheet>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  flex: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  previewInfo: {
    flex: 1,
    gap: 2,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  timestampText: {
    fontSize: 11,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  ocrSettingsLink: {
    marginTop: 6,
  },
  ocrSettingsLinkText: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  unitsRow: {
    flexDirection: "row",
    gap: 10,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
