import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Modal,
  View,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Text,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";

interface Props {
  visible: boolean;
  theme: ThemeColors;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function CreateListModal({ visible, theme, onConfirm, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const isValid = name.trim().length >= 2;

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const animateClose = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(600);
      fadeAnim.setValue(0);
      callback();
    });
  };

  const handleConfirm = () => {
    if (!isValid) return;
    animateClose(() => {
      onConfirm(name.trim());
      setName("");
    });
  };

  const handleCancel = () => {
    animateClose(() => {
      setName("");
      onCancel();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={styles.kav}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={styles.flex} onPress={handleCancel} />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
        >
          <View style={styles.flex} pointerEvents="none" />
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: theme.background,
                transform: [{ translateY: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 24),
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            
            <Text style={[styles.title, { color: theme.textColor }]}>
              Nova Lista de Desejos
            </Text>
            <Text style={[styles.label, { color: theme.secondaryText }]}>
              Nome da lista
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.textColor,
                  borderColor: theme.primaryColor,
                  backgroundColor: theme.cardBackground,
                },
              ]}
              placeholder="Ex: Eletrônicos, Casa Nova..."
              placeholderTextColor={theme.secondaryText}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              maxLength={50}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, { borderColor: theme.border ?? "#E5E7EB" }]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: theme.secondaryText }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  {
                    backgroundColor: isValid
                      ? theme.primaryColor
                      : theme.primaryColor + "50",
                  },
                ]}
                onPress={handleConfirm}
                disabled={!isValid}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.btnTextPrimary}>Criar Lista</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: "flex-end",
  },
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    gap: 12,
    width: "100%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnPrimary: { borderWidth: 0 },
  btnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  btnTextPrimary: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});
