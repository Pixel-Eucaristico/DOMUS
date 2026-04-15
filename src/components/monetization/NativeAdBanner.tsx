import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { ADMOB_IDS } from "./AdMobConfig";

const TAB_BAR_BASE_HEIGHT = 49;

// NativeAd class component is incompatible with new React architecture — disabled for now
const NativeAdComponent: React.ComponentType<any> | null = null;

interface Props {
  onDismiss: () => void;
}

export function NativeAdBanner({ onDismiss }: Props) {
  "use no memo";
  const { theme } = useAppState();
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  if (Platform.OS === "web") return null;

  const NativeAd = NativeAdComponent;

  if (!NativeAd || adError) {
    return null;
  }

  return (
    <View
      style={[
        st.container,
        {
          bottom: tabBarHeight,
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        },
      ]}
    >
      <NativeAd
        adUnitId={ADMOB_IDS.nativeAdvanced}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={() => setAdError(true)}
        style={st.nativeAd}
      />
      {!adLoaded && (
        <View style={[st.placeholder, { backgroundColor: theme.cardBackground }]}>
          <Text style={[st.placeholderText, { color: theme.secondaryText }]}>Carregando anúncio...</Text>
        </View>
      )}
      <TouchableOpacity onPress={onDismiss} hitSlop={12} style={st.close}>
        <Feather name="x" size={14} color={theme.secondaryText} />
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    minHeight: 80,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 900,
    elevation: 10,
  },
  nativeAd: {
    flex: 1,
    minHeight: 80,
  },
  placeholder: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  close: {
    position: "absolute",
    top: 6,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
});
