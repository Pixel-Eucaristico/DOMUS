import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Modal,
  View,
  Animated,
  Text,
  Pressable,
} from "react-native";
import { KeyboardSheet, useSheetBackdropPress } from "@/src/components/shared/KeyboardSheet";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";
import { TButton, TInput } from "@/src/components/tamagui";

interface Props {
  visible: boolean;
  theme: ThemeColors;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function CreateListModal({ visible, theme, onConfirm, onCancel }: Props) {
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
  }, [visible, fadeAnim, slideAnim]);

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
    soundManager.play("success");
    animateClose(() => {
      onConfirm(name.trim());
      setName("");
    });
  };

  const handleCancel = () => {
    soundManager.play("tap");
    animateClose(() => {
      setName("");
      onCancel();
    });
  };

  const handleBackdropPress = useSheetBackdropPress(handleCancel);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={styles.kav}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={styles.flex} onPress={handleBackdropPress} />
        </Animated.View>

        <KeyboardSheet
          sheetStyle={[
            styles.card,
            {
              backgroundColor: theme.background,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          maxHeightRatio={1}
          basePaddingBottom={24}
          contentContainerStyle={styles.body}
          header={
            <>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
              <Text style={[styles.title, { color: theme.textColor }]}>
                Nova Lista de Desejos
              </Text>
            </>
          }
          footer={
            <TButton
              variant="primary"
              backgroundColor={theme.primaryColor}
              icon={<Feather name="plus" size={16} color="#fff" />}
              onPress={handleConfirm}
              disabled={!isValid}
            >
              Criar Lista
            </TButton>
          }
        >
          <Text style={[styles.label, { color: theme.secondaryText }]}>
            Nome da lista
          </Text>
          <TInput
            placeholder="Ex: Eletrônicos, Casa Nova..."
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
            maxLength={50}
            color={theme.textColor}
            backgroundColor={theme.cardBackground}
            borderColor={theme.border}
          />
          <TButton
            variant="outline"
            borderColor={theme.border}
            color={theme.textColor}
            onPress={handleCancel}
          >
            Cancelar
          </TButton>
        </KeyboardSheet>
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
    width: "100%",
  },
  body: {
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
