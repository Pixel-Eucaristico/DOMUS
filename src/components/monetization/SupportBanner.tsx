import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { EdgeInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import type { ThemeColors } from "@packages/theme";
import { ADMOB_IDS } from "./AdMobConfig";
import { AFFILIATE_URLS } from "./AffiliateLinks";

async function openAffiliatUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Erro", "Não foi possível abrir o link.");
  }
}

interface Props {
  onDismiss: () => void;
}

export function SupportBanner({ onDismiss }: Props) {
  const { theme } = useAppState();
  const insets = useSafeAreaInsets();
  const [adError, setAdError] = useState(false);

  if (Platform.OS === "web") {
    return <AffiliateBanner onDismiss={onDismiss} insets={insets} theme={theme} />;
  }

  let BannerAd: React.ComponentType<any> | null = null;
  let BannerAdSize: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admob = require("react-native-google-mobile-ads");
    BannerAd = admob.BannerAd ?? null;
    BannerAdSize = admob.BannerAdSize ?? null;
  } catch {
    // SDK not installed
  }

  if (!BannerAd || !BannerAdSize || adError) {
    return <AffiliateBanner onDismiss={onDismiss} insets={insets} theme={theme} />;
  }

  return (
    <View style={[st.container, { bottom: 0, paddingBottom: insets.bottom, backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <BannerAd
        unitId={ADMOB_IDS.banner}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={() => setAdError(true)}
      />
      <TouchableOpacity onPress={onDismiss} hitSlop={12} style={st.close}>
        <Feather name="x" size={14} color={theme.secondaryText} />
      </TouchableOpacity>
    </View>
  );
}

interface AffiliateBannerProps {
  onDismiss: () => void;
  insets: EdgeInsets;
  theme: ThemeColors;
}

function AffiliateBanner({ onDismiss, insets, theme }: AffiliateBannerProps) {
  return (
    <View style={[st.container, { bottom: 0, paddingBottom: insets.bottom, backgroundColor: `${theme.primaryColor}14`, borderColor: `${theme.primaryColor}30` }]}>
      <Feather name="shopping-bag" size={14} color={theme.primaryColor} />
      <Text style={[st.label, { color: theme.primaryColor }]} numberOfLines={1}>
        Apoie o DOMUS
      </Text>
      <TouchableOpacity
        style={[st.pill, { backgroundColor: "#FF9900" }]}
        onPress={() => openAffiliatUrl(AFFILIATE_URLS.amazon)}
        activeOpacity={0.8}
        hitSlop={8}
      >
        <Text style={st.pillText}>Amazon</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[st.pill, { backgroundColor: "#FFE600" }]}
        onPress={() => openAffiliatUrl(AFFILIATE_URLS.mercadoLivre)}
        activeOpacity={0.8}
        hitSlop={8}
      >
        <Text style={[st.pillText, { color: "#333" }]}>Mercado Livre</Text>
      </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 8,
    borderTopWidth: 1,
    zIndex: 0,
    elevation: 0,
  },
  label: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    flex: 1,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#111",
  },
  close: {
    padding: 2,
  },
});
