import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { TCard } from "@/src/components/tamagui";
import type { ThemeColors } from "@packages/theme";
import type { BackupPreview } from "@/src/modules/backup/domain/BackupMetadata";
import { soundManager } from "@/src/services/SoundManager";

interface Props {
  visible: boolean;
  preview: BackupPreview | null;
  theme: ThemeColors;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmRestoreModal({
  visible,
  preview,
  theme,
  onConfirm,
  onCancel,
}: Props) {
  if (!preview) return null;

  const dateLabel = (() => {
    try {
      return new Date(preview.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return preview.createdAt;
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <TCard borderRadius={20} padding={24} gap={14} width="100%" borderWidth={0} backgroundColor={theme.cardBackground} borderColor={theme.border}>
          {/* Icon */}
          <View style={styles.iconRow}>
            <View style={styles.iconBg}>
              <Feather name="alert-triangle" size={28} color="#F59E0B" />
            </View>
          </View>

          <Text style={[styles.title, { color: theme.textColor }]}>
            Confirmar restauração
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Todos os dados atuais serão substituídos pelo backup. Esta ação não
            pode ser desfeita.
          </Text>

          {/* Preview */}
          <View
            style={[
              styles.previewBox,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <PreviewRow label="Eventos" value={`${preview.eventCount}`} theme={theme} />
            <PreviewRow label="Data do backup" value={dateLabel} theme={theme} />
            <PreviewRow
              label="Dispositivo"
              value={
                preview.deviceId.length > 14
                  ? preview.deviceId.slice(0, 14) + "…"
                  : preview.deviceId
              }
              theme={theme}
            />
            <PreviewRow label="Versão app" value={preview.version} theme={theme} />
            <PreviewRow
              label="Schema"
              value={`v${preview.schemaVersion}`}
              theme={theme}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, { borderColor: theme.border }]}
              onPress={() => { soundManager.play("tap"); onCancel(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: theme.secondaryText }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={() => { soundManager.play("pop"); onConfirm(); }}
              activeOpacity={0.7}
            >
              <Feather name="refresh-cw" size={15} color="#fff" />
              <Text style={styles.btnDangerText}>Restaurar</Text>
            </TouchableOpacity>
          </View>
        </TCard>
      </View>
    </Modal>
  );
}

function PreviewRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.previewRow}>
      <Text style={[styles.previewLabel, { color: theme.secondaryText }]}>
        {label}
      </Text>
      <Text style={[styles.previewValue, { color: theme.textColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconRow: { alignItems: "center" },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F59E0B20",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  previewLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  previewValue: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    maxWidth: "60%",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  btnDanger: {
    backgroundColor: "#DC2626",
    borderWidth: 0,
    flexDirection: "row",
    gap: 6,
  },
  btnDangerText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
