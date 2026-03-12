/**
 * AdMob Native Advanced banner.
 * Rendered inline above the tab bar — blends with the app's visual style.
 *
 * Requires react-native-google-mobile-ads:
 *   npx expo install react-native-google-mobile-ads
 *   + add androidAppId to app.json plugins
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { ADMOB_IDS } from "./AdMobConfig";

interface Props {
  onDismiss: () => void;
}

export function NativeAdBanner({ onDismiss }: Props) {
  const { theme } = useAppState();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 49 + insets.bottom;
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  if (Platform.OS === "web") return null;

  // Lazy-load the AdMob NativeAd component to avoid crashes when SDK not installed
  let NativeAd: React.ComponentType<any> | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admob = require("react-native-google-mobile-ads");
    NativeAd = admob.NativeAd ?? admob.default?.NativeAd ?? null;
  } catch {
    // SDK not installed yet
  }

  if (!NativeAd || adError) {
    // Fallback: affiliate banner while AdMob SDK not configured
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
