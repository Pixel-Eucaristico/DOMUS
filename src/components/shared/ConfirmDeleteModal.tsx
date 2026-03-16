import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";

const { height } = Dimensions.get("window");

interface ConfirmDeleteModalProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme: ThemeColors;
}

export function ConfirmDeleteModal({
  visible,
  title,
  description,
  confirmLabel = "Excluir",
  onConfirm,
  onCancel,
  theme,
}: ConfirmDeleteModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={s.container}>
        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={onCancel}>
            <View style={s.flex} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: theme.cardBackground,
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: theme.secondaryText + "40" }]} />

          {/* Icon */}
          <View style={[s.iconCircle, { backgroundColor: (theme.danger ?? "#DC2626") + "15" }]}>
            <Feather name="trash-2" size={28} color={theme.danger ?? "#DC2626"} />
          </View>

          {/* Title */}
          <Text style={[s.title, { color: theme.textColor }]}>{title}</Text>

          {/* Description */}
          <Text style={[s.description, { color: theme.secondaryText }]}>{description}</Text>

          {/* Buttons */}
          <View style={s.buttons}>
            <Pressable
              style={[s.btn, s.cancelBtn, { borderColor: theme.border }]}
              onPress={() => { soundManager.play("tap"); onCancel(); }}
            >
              <Text style={[s.cancelText, { color: theme.textColor }]}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={[s.btn, s.deleteBtn, { backgroundColor: theme.danger ?? "#DC2626" }]}
              onPress={() => { soundManager.play("trash"); onConfirm(); }}
            >
              <Feather name="trash-2" size={16} color="#FFF" />
              <Text style={s.deleteText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
  },
  deleteBtn: {},
  deleteText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#FFF",
  },
});
