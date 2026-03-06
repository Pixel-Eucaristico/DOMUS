import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import type { ThemeColors } from "@packages/theme";
import { soundManager } from "@/src/services/SoundManager";
import { PIN_LENGTH } from "@/src/modules/security/domain/UserSecuritySettings";

const KEYS: readonly string[] = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "",  "0", "⌫",
];

interface PinPadProps {
  onComplete: (pin: string) => void;
  theme: ThemeColors;
  disabled?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
}

export function PinPad({
  onComplete,
  theme,
  disabled = false,
  error,
  title,
  subtitle,
}: PinPadProps) {
  const [pin, setPin] = useState("");

  const handleKey = useCallback(
    async (key: string) => {
      if (disabled || key === "") return;

      if (Platform.OS !== "web") {
        await Haptics.selectionAsync().catch(() => {});
      }

      if (key === "⌫") {
        soundManager.play("tap");
        setPin((p) => p.slice(0, -1));
        return;
      }

      soundManager.play("tap");
      const next = pin + key;
      setPin(next);

      if (next.length === PIN_LENGTH) {
        // Reset immediately before callback so UI is clean
        setPin("");
        onComplete(next);
      }
    },
    [pin, disabled, onComplete],
  );

  return (
    <View style={styles.container}>
      {title != null && (
        <Text style={[styles.title, { color: theme.textColor }]}>{title}</Text>
      )}
      {subtitle != null && (
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          {subtitle}
        </Text>
      )}

      {/* PIN dots */}
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i < pin.length ? theme.primaryColor : "transparent",
                borderColor:
                  error != null
                    ? theme.danger
                    : i < pin.length
                      ? theme.primaryColor
                      : theme.border,
              },
            ]}
          />
        ))}
      </View>

      {error != null && (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      )}

      {/* Numpad */}
      <View style={styles.grid}>
        {KEYS.map((key, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.key,
              {
                backgroundColor:
                  key === "" ? "transparent" : theme.cardBackground,
              },
              (disabled || key === "") && styles.keyDisabled,
            ]}
            onPress={() => handleKey(key)}
            disabled={disabled || key === ""}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.keyText,
                {
                  color:
                    key === "⌫" ? theme.secondaryText : theme.textColor,
                },
                disabled && styles.keyTextDisabled,
              ]}
            >
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 20,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: -8,
  },
  dots: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 4,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  error: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginTop: -8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 276,
    gap: 12,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 24,
  },
  keyTextDisabled: {
    opacity: 0.4,
  },
});
