import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  PRIVACY_FLAG_TEXTS,
  type PrivacyFlagId,
} from "@/src/constants/privacyFlagTexts";

interface Props {
  flag: PrivacyFlagId;
  color: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mostra, junto de uma flag, o que ela envia e o que se perde sem ela
 * (Story 12.7). As frases vêm de `PRIVACY_FLAG_TEXTS`, iguais às da política.
 */
export function PrivacyFlagNote({ flag, color, style }: Props) {
  const t = PRIVACY_FLAG_TEXTS[flag];
  return (
    <View style={[st.box, style]}>
      <Text style={[st.text, { color }]}>
        <Text style={st.label}>Envia: </Text>
        {t.sends}
      </Text>
      <Text style={[st.text, { color }]}>
        <Text style={st.label}>Sem isso: </Text>
        {t.loses}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  box: { gap: 4, marginTop: 4 },
  text: { fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17 },
  label: { fontFamily: "DMSans_600SemiBold" },
});
