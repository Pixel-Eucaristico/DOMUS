import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { TCard } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { AI_DATA_PERMISSION_LABELS } from "@/src/modules/ai/domain/AISettings";
import type { AIDataPermissions } from "@/src/modules/ai/domain/AISettings";

interface DataPermissionModalProps {
  visible: boolean;
  permissionKey: keyof AIDataPermissions | null;
  onAllow: () => void;
  onDeny: () => void;
}

export function DataPermissionModal({
  visible,
  permissionKey,
  onAllow,
  onDeny,
}: DataPermissionModalProps) {
  const { theme } = useAppState();

  if (!permissionKey) return null;

  const label = AI_DATA_PERMISSION_LABELS[permissionKey];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDeny}
    >
      <View style={styles.overlay}>
        <TCard borderRadius={20} padding={24} width="100%" maxWidth={360} gap={16} backgroundColor={theme.cardBackground} borderColor={theme.border}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.primaryColor}20` }]}>
              <Feather name="database" size={24} color={theme.primaryColor} />
            </View>
          </View>

          <Text style={[styles.title, { color: theme.textColor }]}>
            Permitir acesso: {label.title}
          </Text>

          <Text style={[styles.description, { color: theme.secondaryText }]}>
            Para responder melhor, o DOMUS precisa acessar:{"\n\n"}
            <Text style={{ fontWeight: "600", color: theme.textColor }}>
              {label.description}
            </Text>
            {"\n\n"}
            Voce pode desativar a qualquer momento em Configuracoes &gt; IA.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onDeny}
              style={[styles.btn, styles.btnSecondary, { borderColor: theme.border }]}
            >
              <Text style={[styles.btnText, { color: theme.secondaryText }]}>
                Agora nao
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAllow}
              style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.primaryColor }]}
            >
              <Feather name="check" size={16} color="#fff" />
              <Text style={[styles.btnText, { color: "#fff", fontWeight: "600" }]}>
                Permitir
              </Text>
            </TouchableOpacity>
          </View>
        </TCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconRow: {
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnSecondary: {
    borderWidth: 1,
  },
  btnPrimary: {},
  btnText: {
    fontSize: 15,
  },
});
