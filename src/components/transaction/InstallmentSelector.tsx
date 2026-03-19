import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { TInput } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import type { InstallmentAmountMode } from "@packages/events/src/types";
import { soundManager } from "@/src/services/SoundManager";

const QUICK_OPTIONS = [1, 2, 3, 6, 12];

interface Props {
  theme: ThemeColors;
  count: number;
  onChangeCount: (n: number) => void;
  amountMode: InstallmentAmountMode;
  onChangeAmountMode: (m: InstallmentAmountMode) => void;
  startFrom: number;
  onChangeStartFrom: (n: number) => void;
  totalAmount: number;
  disabled?: boolean;
}

export function InstallmentSelector({
  theme,
  count,
  onChangeCount,
  amountMode,
  onChangeAmountMode,
  startFrom,
  onChangeStartFrom,
  totalAmount,
  disabled,
}: Props) {
  const [showCustom, setShowCustom] = useState(
    !QUICK_OPTIONS.includes(count) && count > 1,
  );
  const [customText, setCustomText] = useState(
    !QUICK_OPTIONS.includes(count) && count > 1 ? count.toString() : "",
  );

  const handleQuickSelect = (n: number) => {
    if (disabled) return;
    soundManager.play("tap");
    setShowCustom(false);
    onChangeCount(n);
    if (startFrom > n) onChangeStartFrom(1);
  };

  const handleCustomToggle = () => {
    if (disabled) return;
    soundManager.play("tap");
    setShowCustom(true);
    setCustomText("");
  };

  const handleCustomChange = (text: string) => {
    const clean = text.replace(/\D/g, "");
    setCustomText(clean);
    const num = parseInt(clean, 10);
    if (num >= 1) {
      onChangeCount(num);
      if (startFrom > num) onChangeStartFrom(1);
    }
  };

  const perInstallment =
    amountMode === "per_installment"
      ? totalAmount
      : count > 0
        ? Math.round((totalAmount / count) * 100) / 100
        : 0;

  const total =
    amountMode === "per_installment" ? totalAmount * count : totalAmount;

  const handleStepperMinus = () => {
    if (disabled || startFrom <= 1) return;
    soundManager.play("tap");
    onChangeStartFrom(startFrom - 1);
  };

  const handleStepperPlus = () => {
    if (disabled || startFrom >= count) return;
    soundManager.play("tap");
    onChangeStartFrom(startFrom + 1);
  };

  return (
    <View style={[s.card, { backgroundColor: theme.cardBackground }]}>
      <Text style={[s.label, { color: theme.secondaryText }]}>Parcelas</Text>

      {/* Quick chips */}
      <View style={s.chipRow}>
        {QUICK_OPTIONS.map((n) => {
          const active = count === n && !showCustom;
          return (
            <Pressable
              key={n}
              style={[
                s.chip,
                {
                  backgroundColor: active ? theme.primaryColor : theme.background,
                  borderColor: active ? theme.primaryColor : theme.border,
                },
              ]}
              onPress={() => handleQuickSelect(n)}
            >
              <Text style={[s.chipText, { color: active ? "#FFF" : theme.textColor }]}>
                {n}x
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[
            s.chip,
            {
              backgroundColor: showCustom ? theme.primaryColor : theme.background,
              borderColor: showCustom ? theme.primaryColor : theme.border,
            },
          ]}
          onPress={handleCustomToggle}
        >
          <Text style={[s.chipText, { color: showCustom ? "#FFF" : theme.textColor }]}>
            Outro
          </Text>
        </Pressable>
      </View>

      {/* Custom input */}
      {showCustom && (
        <TInput
          value={customText}
          onChangeText={handleCustomChange}
          placeholder="Numero de parcelas"
          keyboardType="number-pad"
          autoFocus
          editable={!disabled}
          marginTop={12}
          color={theme.textColor}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
        />
      )}

      {/* Amount mode + preview (only when count > 1) */}
      {count > 1 && (
        <>
          <View style={s.modeRow}>
            <Pressable
              style={[
                s.modeBtn,
                {
                  backgroundColor:
                    amountMode === "total" ? `${theme.primaryColor}18` : theme.background,
                  borderColor: amountMode === "total" ? theme.primaryColor : theme.border,
                },
              ]}
              onPress={() => {
                if (!disabled) {
                  soundManager.play("tap");
                  onChangeAmountMode("total");
                }
              }}
            >
              <Text
                style={[
                  s.modeText,
                  { color: amountMode === "total" ? theme.primaryColor : theme.textColor },
                ]}
              >
                Valor total
              </Text>
            </Pressable>
            <Pressable
              style={[
                s.modeBtn,
                {
                  backgroundColor:
                    amountMode === "per_installment"
                      ? `${theme.primaryColor}18`
                      : theme.background,
                  borderColor:
                    amountMode === "per_installment" ? theme.primaryColor : theme.border,
                },
              ]}
              onPress={() => {
                if (!disabled) {
                  soundManager.play("tap");
                  onChangeAmountMode("per_installment");
                }
              }}
            >
              <Text
                style={[
                  s.modeText,
                  {
                    color:
                      amountMode === "per_installment"
                        ? theme.primaryColor
                        : theme.textColor,
                  },
                ]}
              >
                Valor da parcela
              </Text>
            </Pressable>
          </View>

          {/* Preview */}
          {totalAmount > 0 && (
            <Text style={[s.preview, { color: theme.secondaryText }]}>
              {amountMode === "total"
                ? `${count}x de R$ ${perInstallment.toFixed(2).replace(".", ",")} (total R$ ${total.toFixed(2).replace(".", ",")})`
                : `${count}x de R$ ${perInstallment.toFixed(2).replace(".", ",")} (total R$ ${total.toFixed(2).replace(".", ",")})`}
            </Text>
          )}

          {/* Start from stepper */}
          <View style={s.startFromRow}>
            <Text style={[s.startFromLabel, { color: theme.secondaryText }]}>
              Comecar da parcela
            </Text>
            <View style={s.stepper}>
              <Pressable
                style={[s.stepBtn, { borderColor: theme.border }]}
                onPress={handleStepperMinus}
              >
                <Feather
                  name="minus"
                  size={16}
                  color={startFrom <= 1 ? theme.border : theme.primaryColor}
                />
              </Pressable>
              <Text style={[s.stepValue, { color: theme.textColor }]}>
                {startFrom}/{count}
              </Text>
              <Pressable
                style={[s.stepBtn, { borderColor: theme.border }]}
                onPress={handleStepperPlus}
              >
                <Feather
                  name="plus"
                  size={16}
                  color={startFrom >= count ? theme.border : theme.primaryColor}
                />
              </Pressable>
            </View>
          </View>
          {startFrom > 1 && (
            <Text style={[s.startFromHelper, { color: theme.secondaryText }]}>
              Serao criadas {count - startFrom + 1} parcelas ({startFrom}/{count} ate{" "}
              {count}/{count})
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 20, padding: 20 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 48,
  },
  chipText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  modeRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeText: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  preview: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  startFromRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  startFromLabel: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontFamily: "DMSans_600SemiBold", fontSize: 14, minWidth: 40, textAlign: "center" },
  startFromHelper: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
});
