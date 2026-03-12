/**
 * DailyAdModal — AdMob Interstitial (ca-app-pub-8693115758199908/6825035120)
 * Shown once per day when user opens the app (supportMode === "daily_ad").
 * Falls back to affiliate links modal if SDK not available.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/src/context/AppStateProvider";
import { ClipboardService } from "@/src/modules/security/application/ClipboardService";
import { soundManager } from "@/src/services/SoundManager";
import { ADMOB_IDS } from "./AdMobConfig";

const AMAZON_URL = "https://www.amazon.com.br?tag=willianquinti-20";
const ML_URL = "https://meli.la/2oDNho4";
const PIX_KEY = "55.075.291/0001-79";
const KOFI_URL = "https://ko-fi.com/willianquintino33618";

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Erro", "Não foi possível abrir o link.");
  }
}

interface Props {
  onClose: () => void;
}

export function DailyAdModal({ onClose }: Props) {
  const [adReady, setAdReady] = useState(false);
  const [adShown, setAdShown] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      setShowFallback(true);
      return;
    }

    let interstitial: any = null;
    let unsubscribes: Array<() => void> = [];

    (async () => {
      try {
        const admob = await import("react-native-google-mobile-ads");
        const { InterstitialAd, AdEventType } = admob;

        interstitial = InterstitialAd.createForAdRequest(ADMOB_IDS.interstitial, {
          requestNonPersonalizedAdsOnly: false,
        });

        unsubscribes.push(
          interstitial.addAdEventListener(AdEventType.LOADED, () => {
            setAdReady(true);
            interstitial.show();
          }),
        );

        unsubscribes.push(
          interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            setAdShown(true);
            onClose();
          }),
        );

        unsubscribes.push(
          interstitial.addAdEventListener(AdEventType.ERROR, () => {
            // AdMob failed — show affiliate fallback
            setShowFallback(true);
          }),
        );

        interstitial.load();
      } catch {
        // SDK not installed or error
        setShowFallback(true);
      }
    })();

    return () => {
      unsubscribes.forEach((u) => u());
    };
  }, [onClose]);

  // AdMob interstitial was shown and closed — nothing to render
  if (adShown) return null;

  // Waiting for AdMob to load — don't show fallback yet (give it a moment)
  if (!showFallback && !adReady) return null;

  // Fallback: affiliate + donation modal
  return <AffiliateFallbackModal onClose={onClose} />;
}

function AffiliateFallbackModal({ onClose }: { onClose: () => void }) {
  const { theme } = useAppState();
  const insets = useSafeAreaInsets();
  const [pixCopied, setPixCopied] = useState(false);

  const handleCopyPix = useCallback(async () => {
    soundManager.play("success");
    const ok = await ClipboardService.copy(PIX_KEY);
    if (ok) {
      if (Platform.OS !== "web") {
        const Haptics = await import("expo-haptics");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    }
  }, []);

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={st.overlay}>
        <View
          style={[
            st.sheet,
            {
              backgroundColor: theme.cardBackground,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={st.header}>
            <Text style={{ fontSize: 28 }}>☕</Text>
            <View style={{ flex: 1 }}>
              <Text style={[st.title, { color: theme.textColor }]}>Apoie o DOMUS hoje</Text>
              <Text style={[st.subtitle, { color: theme.secondaryText }]}>
                Comprar pelos links abaixo gera uma pequena comissão — sem custo extra pra você.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[st.bigBtn, { backgroundColor: "#FF9900" }]}
            onPress={() => { soundManager.play("tap"); openUrl(AMAZON_URL); }}
            activeOpacity={0.85}
          >
            <Feather name="shopping-cart" size={18} color="#111" />
            <Text style={[st.bigBtnText, { color: "#111" }]}>Comprar na Amazon</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.bigBtn, { backgroundColor: "#FFE600" }]}
            onPress={() => { soundManager.play("tap"); openUrl(ML_URL); }}
            activeOpacity={0.85}
          >
            <Feather name="shopping-bag" size={18} color="#333" />
            <Text style={[st.bigBtnText, { color: "#333" }]}>Comprar no Mercado Livre</Text>
          </TouchableOpacity>

          <View style={st.dividerRow}>
            <View style={[st.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[st.dividerText, { color: theme.secondaryText }]}>ou apoie direto</Text>
            <View style={[st.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <View style={st.directRow}>
            <TouchableOpacity
              style={[
                st.directBtn,
                {
                  backgroundColor: pixCopied ? "#10B981" : `${theme.primaryColor}15`,
                  borderColor: pixCopied ? "#10B981" : theme.border,
                },
              ]}
              onPress={handleCopyPix}
              activeOpacity={0.8}
            >
              <Feather name={pixCopied ? "check" : "copy"} size={16} color={pixCopied ? "#FFF" : theme.primaryColor} />
              <Text style={[st.directBtnText, { color: pixCopied ? "#FFF" : theme.primaryColor }]}>
                {pixCopied ? "Copiado!" : "Pix"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[st.directBtn, { backgroundColor: "#FF5E5B18", borderColor: "#FF5E5B40" }]}
              onPress={() => { soundManager.play("tap"); openUrl(KOFI_URL); }}
              activeOpacity={0.8}
            >
              <Feather name="coffee" size={16} color="#FF5E5B" />
              <Text style={[st.directBtnText, { color: "#FF5E5B" }]}>Ko-fi</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[st.closeBtn, { borderColor: theme.border }]}
            onPress={() => { soundManager.play("tap"); onClose(); }}
            activeOpacity={0.8}
          >
            <Text style={[st.closeBtnText, { color: theme.secondaryText }]}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 4,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  bigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  bigBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  directRow: {
    flexDirection: "row",
    gap: 10,
  },
  directBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 7,
  },
  directBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  closeBtn: {
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 4,
  },
  closeBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
});
