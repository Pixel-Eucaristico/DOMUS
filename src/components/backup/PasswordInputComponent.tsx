import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: ThemeColors;
  error?: string;
  placeholder?: string;
  editable?: boolean;
}

export function PasswordInputComponent({
  label,
  value,
  onChange,
  theme,
  error,
  placeholder = "Senha do backup",
  editable = true,
}: Props) {
  const [secure, setSecure] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            borderColor: error ? "#DC2626" : theme.border,
            backgroundColor: theme.cardBackground,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.textColor }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.secondaryText}
          secureTextEntry={secure}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
        <TouchableOpacity onPress={() => setSecure((v) => !v)} hitSlop={12}>
          <Feather
            name={secure ? "eye" : "eye-off"}
            size={18}
            color={theme.secondaryText}
          />
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
  },
  errorText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#DC2626",
  },
});
