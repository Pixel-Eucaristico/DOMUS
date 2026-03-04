import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";

const { height } = Dimensions.get("window");

export interface SelectionOption {
  label: string;
  onPress: () => void;
  icon?: string;
  color?: string;
}

interface SelectionModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: SelectionOption[];
  onCancel: () => void;
  theme: ThemeColors;
}

export function SelectionModal({
  visible,
  title,
  subtitle,
  options,
  onCancel,
  theme,
}: SelectionModalProps) {
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
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableWithoutFeedback onPress={onCancel}>
            <View style={styles.flex} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.cardBackground,
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border + "40" }]} />
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textColor }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
            )}
          </View>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionBtn,
                  { borderBottomColor: index === options.length - 1 ? "transparent" : theme.border + "40" },
                ]}
                onPress={() => {
                  soundManager.play("tap");
                  onCancel();
                  option.onPress();
                }}
                activeOpacity={0.7}
              >
                {option.icon && (
                  <View style={[styles.iconWrapper, { backgroundColor: (option.color || theme.primaryColor) + "15" }]}>
                    <Feather name={option.icon as any} size={18} color={option.color || theme.primaryColor} />
                  </View>
                )}
                <Text style={[styles.optionLabel, { color: theme.textColor }]}>{option.label}</Text>
                <Feather name="chevron-right" size={16} color={theme.secondaryText} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: theme.background }]}
            onPress={() => {
              soundManager.play("tap");
              onCancel();
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelText, { color: theme.secondaryText }]}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  flex: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "DMSans_500Medium",
  },
  cancelBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
  },
});
