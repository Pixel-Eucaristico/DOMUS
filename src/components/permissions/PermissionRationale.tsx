import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";

export interface PermissionRationaleProps {
  visible: boolean;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
  allowLabel?: string;
  denyLabel?: string;
  onAllow: () => void;
  onDeny: () => void;
}

/**
 * Modal shown before requesting a sensitive permission.
 * Explains why the permission is needed so the user can make an informed decision.
 * Play Store requirement: rationale must be shown before requesting Camera, Storage,
 * Biometric, etc.
 */
export function PermissionRationale({
  visible,
  icon,
  title,
  description,
  allowLabel = "Permitir",
  denyLabel = "Agora não",
  onAllow,
  onDeny,
}: PermissionRationaleProps) {
  const { theme } = useAppState();
  const s = styles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDeny}
    >
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
          {/* Icon */}
          <View
            style={[
              s.iconContainer,
              { backgroundColor: `${theme.primaryColor}18` },
            ]}
          >
            <Feather name={icon} size={32} color={theme.primaryColor} />
          </View>

          {/* Title */}
          <Text
            style={[s.title, { color: theme.textColor }]}
            accessibilityRole="header"
          >
            {title}
          </Text>

          {/* Description */}
          <Text
            style={[s.description, { color: theme.secondaryText }]}
            accessibilityRole="text"
          >
            {description}
          </Text>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.denyBtn, { borderColor: theme.border }]}
              onPress={onDeny}
              accessibilityLabel={denyLabel}
              accessibilityRole="button"
            >
              <Text style={[s.denyText, { color: theme.secondaryText }]}>
                {denyLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.allowBtn, { backgroundColor: theme.primaryColor }]}
              onPress={onAllow}
              accessibilityLabel={allowLabel}
              accessibilityRole="button"
            >
              <Text style={s.allowText}>{allowLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Preset configs ──────────────────────────────────────────────────────────

export const CAMERA_RATIONALE = {
  icon: "camera" as const,
  title: "Acesso à câmera",
  description:
    "O DOMUS precisa da câmera para escanear QR Codes e tirar fotos de notas fiscais. " +
    "As imagens são processadas no dispositivo e não são armazenadas permanentemente.",
};

export const PHOTOS_RATIONALE = {
  icon: "image" as const,
  title: "Acesso às fotos",
  description:
    "O DOMUS precisa acessar suas fotos para importar imagens de notas fiscais. " +
    "As imagens são lidas localmente e não são enviadas a servidores do DOMUS.",
};

// ─── Styles ──────────────────────────────────────────────────────────────────

function styles(theme: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      gap: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontFamily: "DMSans_700Bold",
      textAlign: "center",
    },
    description: {
      fontSize: 14,
      fontFamily: "DMSans_400Regular",
      lineHeight: 22,
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
      marginTop: 4,
    },
    denyBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    denyText: {
      fontSize: 14,
      fontFamily: "DMSans_600SemiBold",
    },
    allowBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    allowText: {
      fontSize: 14,
      fontFamily: "DMSans_700Bold",
      color: "#fff",
    },
  });
}
