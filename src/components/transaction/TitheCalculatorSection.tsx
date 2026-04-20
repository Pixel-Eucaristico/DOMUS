import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { TInput } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { soundManager } from "@/src/services/SoundManager";
import type { ThemeColors } from "@packages/theme";

interface TitheResult {
  amount: number;
  base: number;
}

interface Props {
  theme: ThemeColors;
  percentage: string;
  setPercentage: (v: string) => void;
  baseType: "gross" | "net";
  setBaseType: (v: "gross" | "net") => void;
  periodType: "previous_month" | "current_month" | "custom";
  setPeriodType: (v: "previous_month" | "current_month" | "custom") => void;
  customDays: string;
  setCustomDays: (v: string) => void;
  result: TitheResult | null;
}

export function TitheCalculatorSection({
  theme,
  percentage,
  setPercentage,
  baseType,
  setBaseType,
  periodType,
  setPeriodType,
  customDays,
  setCustomDays,
  result,
}: Props) {
  return (
    <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
      <View style={s.titheHeader}>
        <Feather name="gift" size={15} color="#A78BFA" />
        <Text style={[s.label, { color: "#A78BFA", marginBottom: 0 }]}>
          Calculadora de Dizimo
        </Text>
      </View>

      <Text style={[s.label, { color: theme.secondaryText, marginTop: 10 }]}>
        Percentual (%)
      </Text>
      <TInput
        defaultValue={percentage}
        onChangeText={setPercentage}
        onEndEditing={(e: any) => setPercentage(e.nativeEvent.text)}
        placeholder="10"
        keyboardType="decimal-pad"
        color={theme.textColor}
        backgroundColor={theme.cardBackground}
        borderColor={theme.border}
      />

      <Text style={[s.label, { color: theme.secondaryText, marginTop: 10 }]}>
        Base de calculo
      </Text>
      <View style={s.titheChipRow}>
        {(
          [
            { key: "gross" as const, label: "Renda bruta" },
            { key: "net" as const, label: "Renda liquida" },
          ]
        ).map(({ key, label }) => (
          <Pressable
            key={key}
            style={[
              s.titheChip,
              baseType === key
                ? { backgroundColor: "#A78BFA", borderColor: "#A78BFA" }
                : { backgroundColor: "#A78BFA18", borderColor: "#A78BFA60" },
            ]}
            onPress={() => {
              soundManager.play("tap");
              setBaseType(key);
            }}
          >
            <Text style={{ color: baseType === key ? "#FFF" : "#A78BFA", fontFamily: "DMSans_500Medium", fontSize: 13 }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[s.label, { color: theme.secondaryText, marginTop: 10 }]}>
        Periodo de calculo
      </Text>
      <View style={s.titheChipRow}>
        {(
          [
            { key: "previous_month" as const, label: "Mes anterior" },
            { key: "current_month" as const, label: "Mes atual" },
            { key: "custom" as const, label: "Personalizado" },
          ]
        ).map(({ key, label }) => (
          <Pressable
            key={key}
            style={[
              s.titheChip,
              periodType === key
                ? { backgroundColor: "#A78BFA", borderColor: "#A78BFA" }
                : { backgroundColor: "#A78BFA18", borderColor: "#A78BFA60" },
            ]}
            onPress={() => {
              soundManager.play("tap");
              setPeriodType(key);
            }}
          >
            <Text style={{ color: periodType === key ? "#FFF" : "#A78BFA", fontFamily: "DMSans_500Medium", fontSize: 12 }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {periodType === "custom" && (
        <>
          <Text style={[s.label, { color: theme.secondaryText, marginTop: 10, fontSize: 12 }]}>
            Últimos quantos dias?
          </Text>
          <TInput
            defaultValue={customDays}
            onChangeText={setCustomDays}
            onEndEditing={(e: any) => setCustomDays(e.nativeEvent.text)}
            placeholder="30"
            keyboardType="number-pad"
            color={theme.textColor}
            backgroundColor={theme.cardBackground}
            borderColor={theme.border}
          />
        </>
      )}

      <View style={s.titheResult}>
        <Feather name="zap" size={14} color="#A78BFA" />
        <Text style={s.titheResultText}>
          {result
            ? result.base > 0
              ? `R$ ${result.amount.toFixed(2).replace(".", ",")}  (base: R$ ${result.base.toFixed(2).replace(".", ",")})`
              : "Base R$ 0,00 — sem receitas confirmadas no período"
            : "—"}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 20, padding: 20 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 10 },
  titheHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 2,
  },
  titheChipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  titheChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  titheResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#A78BFA18",
  },
  titheResultText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#A78BFA",
  },
});
