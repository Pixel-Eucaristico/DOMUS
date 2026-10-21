import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeAd as NativeAdInstance } from "react-native-google-mobile-ads";
import { useAppState } from "@/src/context/AppStateProvider";
import { ADMOB_IDS } from "./AdMobConfig";
import { adRequestOptions } from "@/src/modules/monetization/adConsent";
import { usePersonalizedAdsConsent } from "@/src/hooks/usePersonalizedAdsConsent";

const TAB_BAR_BASE_HEIGHT = 49;
/** O Google pede a mídia com pelo menos 120×120 dp. */
const MEDIA_SIZE = 120;

type AdmobModule = typeof import("react-native-google-mobile-ads");

function loadAdmob(): AdmobModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-google-mobile-ads") as AdmobModule;
  } catch {
    // SDK ausente (ex.: Expo Go)
    return null;
  }
}

interface Props {
  onDismiss: () => void;
}

/**
 * Anúncio nativo do Google (API `NativeAd` + `NativeAdView`, compatível com a
 * nova arquitetura). Título, anunciante, mídia e botão do anunciante, com o
 * selo "Anúncio" sempre visível. Se falhar, não mostra nada.
 */
export function NativeAdBanner({ onDismiss }: Props) {
  "use no memo";
  const { theme } = useAppState();
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const [nativeAd, setNativeAd] = useState<NativeAdInstance | null>(null);
  const [adError, setAdError] = useState(false);
  const { consent, loaded } = usePersonalizedAdsConsent();

  useEffect(() => {
    // Nenhum pedido antes de ler o consentimento; mudar o consentimento
    // descarta o anúncio e pede outro com a escolha atual
    if (Platform.OS === "web" || !loaded) return;
    const admob = loadAdmob();
    if (!admob?.NativeAd) {
      setAdError(true);
      return;
    }

    let cancelled = false;
    let current: NativeAdInstance | null = null;
    setAdError(false);

    admob.NativeAd.createForAdRequest(ADMOB_IDS.nativeAdvanced, {
      ...adRequestOptions(consent),
      // AdChoices sobre a mídia, longe do botão de fechar (canto superior direito)
      adChoicesPlacement: admob.NativeAdChoicesPlacement.TOP_LEFT,
    })
      .then((ad) => {
        if (cancelled) {
          ad.destroy();
          return;
        }
        current = ad;
        setNativeAd(ad);
      })
      .catch(() => {
        if (!cancelled) setAdError(true);
      });

    return () => {
      cancelled = true;
      setNativeAd(null);
      try {
        current?.destroy();
      } catch {
        // best-effort
      }
    };
  }, [loaded, consent]);

  if (Platform.OS === "web" || adError || !nativeAd) return null;

  const admob = loadAdmob();
  if (!admob) return null;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = admob;

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
      <NativeAdView nativeAd={nativeAd} style={st.adView}>
        {nativeAd.mediaContent ? (
          <NativeMediaView resizeMode="cover" style={st.media} />
        ) : nativeAd.icon ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={st.icon} />
          </NativeAsset>
        ) : null}
        <View style={st.info}>
          <View style={[st.badge, { borderColor: theme.secondaryText }]}>
            <Text style={[st.badgeText, { color: theme.secondaryText }]}>Anúncio</Text>
          </View>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={[st.headline, { color: theme.textColor }]} numberOfLines={2}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
          {!!nativeAd.advertiser && (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={[st.advertiser, { color: theme.secondaryText }]} numberOfLines={1}>
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          )}
          {!!nativeAd.callToAction && (
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <Text style={[st.cta, { backgroundColor: theme.primaryColor }]} numberOfLines={1}>
                {nativeAd.callToAction}
              </Text>
            </NativeAsset>
          )}
        </View>
      </NativeAdView>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={12}
        style={st.close}
        accessibilityRole="button"
        accessibilityLabel="Fechar anúncio"
      >
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
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 900,
    elevation: 10,
  },
  adView: {
    flexDirection: "row",
    padding: 8,
    gap: 10,
  },
  media: {
    width: MEDIA_SIZE,
    height: MEDIA_SIZE,
    borderRadius: 8,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignSelf: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
    // Espaço para o botão de fechar (canto superior direito)
    paddingRight: 24,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
  },
  headline: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    lineHeight: 18,
  },
  advertiser: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  cta: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
    color: "#FFF",
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  close: {
    position: "absolute",
    top: 6,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
});
