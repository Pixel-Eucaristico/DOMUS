import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";

// ─── Types ──────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof Feather>["name"];

type InputVariant = "default" | "password" | "underline" | "search";

interface AppTextInputProps extends TextInputProps {
  /** Label displayed above the input */
  label?: string;
  /** Error message displayed below the input (turns border red) */
  error?: string;
  /** Visual variant */
  variant?: InputVariant;
  /** Feather icon name for the left side */
  leftIcon?: IconName;
  /** Feather icon name for the right side */
  rightIcon?: IconName;
  /** Callback when right icon is pressed */
  onRightIconPress?: () => void;
  /** Container style override */
  containerStyle?: ViewStyle;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const AppTextInput = React.forwardRef<TextInput, AppTextInputProps>(
  (
    {
      label,
      error,
      variant = "default",
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      style,
      editable = true,
      multiline,
      secureTextEntry,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const { theme } = useAppState();
    const [isFocused, setIsFocused] = useState(false);
    const [secureVisible, setSecureVisible] = useState(false);

    const isPassword = variant === "password";
    const isUnderline = variant === "underline";
    const isSearch = variant === "search";
    const disabled = !editable;

    const handleFocus = useCallback(
      (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    // ─── Border color logic ─────────────────────────────────────────────
    const borderColor = error
      ? theme.danger ?? "#DC2626"
      : isFocused
      ? theme.primaryColor
      : theme.border;

    // ─── Input row styles ───────────────────────────────────────────────
    // StyleProp<ViewStyle> (não `as const`): tupla readonly não é aceita pelo RN
    const inputRowStyle: StyleProp<ViewStyle> = [
      s.inputRow,
      isUnderline
        ? { borderBottomWidth: 1, borderBottomColor: borderColor, borderRadius: 0, paddingHorizontal: 0 }
        : { borderWidth: 1, borderColor, borderRadius: 12, backgroundColor: theme.cardBackground, paddingHorizontal: 14 },
      disabled && { opacity: 0.5 },
    ];

    // ─── Effective left icon ────────────────────────────────────────────
    const effectiveLeftIcon: IconName | undefined = isSearch ? "search" : leftIcon;

    // ─── Effective right icon ───────────────────────────────────────────
    let effectiveRightIcon: IconName | undefined = rightIcon;
    let effectiveRightIconPress = onRightIconPress;

    if (isPassword) {
      effectiveRightIcon = secureVisible ? "eye-off" : "eye";
      effectiveRightIconPress = () => setSecureVisible((v) => !v);
    }

    return (
      <View style={[s.container, containerStyle]}>
        {label != null && (
          <Text style={[s.label, { color: theme.secondaryText }]}>{label}</Text>
        )}

        <View style={inputRowStyle}>
          {effectiveLeftIcon != null && (
            <Feather
              name={effectiveLeftIcon}
              size={16}
              color={theme.secondaryText}
              style={s.iconLeft}
            />
          )}

          <TextInput
            ref={ref}
            style={[
              s.input,
              {
                color: theme.textColor,
                minHeight: multiline ? 80 : 44,
                textAlignVertical: multiline ? "top" : "center",
              },
              style,
            ]}
            placeholderTextColor={theme.secondaryText + "90"}
            editable={editable}
            multiline={multiline}
            secureTextEntry={isPassword && !secureVisible}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCapitalize={isPassword ? "none" : rest.autoCapitalize}
            autoCorrect={isPassword ? false : rest.autoCorrect}
            {...rest}
          />

          {effectiveRightIcon != null && (
            <TouchableOpacity
              onPress={effectiveRightIconPress}
              hitSlop={12}
              disabled={!effectiveRightIconPress}
              style={s.iconRight}
            >
              <Feather
                name={effectiveRightIcon}
                size={18}
                color={theme.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>

        {error != null && (
          <Text style={[s.error, { color: theme.danger ?? "#DC2626" }]}>
            {error}
          </Text>
        )}
      </View>
    );
  },
);

AppTextInput.displayName = "AppTextInput";

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    paddingVertical: 10,
  },
  iconLeft: {
    marginLeft: 0,
  },
  iconRight: {
    padding: 4,
  },
  error: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
});
