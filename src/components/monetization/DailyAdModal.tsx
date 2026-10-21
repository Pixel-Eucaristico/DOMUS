import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { getAdRequestOptions } from "@/src/modules/monetization/adConsent";
import { markFullScreenAdActive, markFullScreenAdClosed } from "./fullScreenAd";
import { AFFILIATE_URLS, DONATION_PIX_KEY } from "./AffiliateLinks";
import { TCard } from "@/src/components/tamagui";

const PIX_COPIED_RESET_DELAY_MS = 2500;

async function openAffiliateUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Erro", "Não foi possível abrir o link.");
  }
}

/** Sem carregar até aqui, desiste nesta abertura (nada de anúncio surpresa depois). */
const LOAD_DEADLINE_MS = 10_000;

interface Props {
  /** Fechou o que foi mostrado (anúncio ou fallback): o dia conta como visto. */
  onClose: () => void;
  /** Não carregou a tempo: some sem fallback e sem gravar o dia. */
  onGiveUp: () => void;
}

/**
 * Intersticial diário. Mostra o anúncio do Google quando carrega; se falhar,
 * mostra o fallback de afiliados. Avisa o pai (`onClose`) só ao fechar o que
 * foi mostrado: é aí que a data do dia é gravada.
 */
export function DailyAdModal({ onClose, onGiveUp }: Props) {
  const [showFallback, setShowFallback] = useState(false);
  // `onClose`/`onGiveUp` novos a cada render do pai não recriam o anúncio
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onGiveUpRef = useRef(onGiveUp);
  onGiveUpRef.current = onGiveUp;
  const closeFallback = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    if (Platform.OS === "web") {
      setShowFallback(true);
      return;
    }

    let interstitial: any = null;
    const unsubscribes: (() => void)[] = [];
    let cancelled = false;
    let adOpen = false;
    let deadline: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      deadline = undefined;
      if (cancelled) return;
      cancelled = true;
      onGiveUpRef.current();
    }, LOAD_DEADLINE_MS);
    const clearDeadline = () => {
      if (deadline !== undefined) clearTimeout(deadline);
      deadline = undefined;
    };
    const closeAd = () => {
      if (!adOpen) return;
      adOpen = false;
      markFullScreenAdClosed();
    };
    const fail = () => {
      clearDeadline();
      closeAd();
      if (!cancelled) setShowFallback(true);
    };

    (async () => {
      try {
        const admob = await import("react-native-google-mobile-ads");
        if (cancelled) return;
        const { InterstitialAd, AdEventType } = admob;

        // Lê o consentimento na hora do pedido: revogar vale para o próximo anúncio
        const requestOptions = await getAdRequestOptions();
        if (cancelled) return;
        interstitial = InterstitialAd.createForAdRequest(ADMOB_IDS.interstitial, requestOptions);

        unsubscribes.push(
          interstitial.addAdEventListener(AdEventType.LOADED, () => {
            clearDeadline();
            if (cancelled) return;
            adOpen = true;
            markFullScreenAdActive();
            try {
              Promise.resolve(interstitial.show()).catch(fail);
            } catch {
              fail();
            }
          }),
        );

        unsubscribes.push(
          interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            closeAd();
            if (!cancelled) onCloseRef.current();
          }),
        );

        unsubscribes.push(interstitial.addAdEventListener(AdEventType.ERROR, fail));

        interstitial.load();
      } catch {
        fail();
      }
    })();

    return () => {
      cancelled = true;
      clearDeadline();
      closeAd();
      unsubscribes.forEach((u) => u());
    };
  }, []);

  // Anúncio carregando ou na tela (é nativo, fora da árvore): nada aqui
  if (!showFallback) return null;

  return <AffiliateFallbackModal onClose={closeFallback} />;
}

function AffiliateFallbackModal({ onClose }: { onClose: () => void }) {
  const { theme } = useAppState();
  const insets = useSafeAreaInsets();
  const [pixCopied, setPixCopied] = useState(false);

  const handleCopyPix = useCallback(async () => {
    soundManager.play("success");
    const ok = await ClipboardService.copy(DONATION_PIX_KEY);
    if (ok) {
      if (Platform.OS !== "web") {
        const Haptics = await import("expo-haptics");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), PIX_COPIED_RESET_DELAY_MS);
    }
  }, []);

  const handlePlayTap = useCallback((action: () => void) => {
    soundManager.play("tap");
    action();
  }, []);

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={st.overlay}>
        <TCard
          borderTopLeftRadius={24}
          borderTopRightRadius={24}
          borderBottomLeftRadius={0}
          borderBottomRightRadius={0}
          paddingHorizontal={24}
          paddingTop={24}
          paddingBottom={insets.bottom + 16}
          gap={12}
          borderWidth={0}
          backgroundColor={theme.cardBackground}
          borderColor={theme.border}
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
            onPress={() => handlePlayTap(() => openAffiliateUrl(AFFILIATE_URLS.amazon))}
            activeOpacity={0.85}
          >
            <Feather name="shopping-cart" size={18} color="#111" />
            <Text style={[st.bigBtnText, { color: "#111" }]}>Comprar na Amazon</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.bigBtn, { backgroundColor: "#FFE600" }]}
            onPress={() => handlePlayTap(() => openAffiliateUrl(AFFILIATE_URLS.mercadoLivre))}
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
              onPress={() => handlePlayTap(() => openAffiliateUrl(AFFILIATE_URLS.kofi))}
              activeOpacity={0.8}
            >
              <Feather name="coffee" size={16} color="#FF5E5B" />
              <Text style={[st.directBtnText, { color: "#FF5E5B" }]}>Ko-fi</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[st.closeBtn, { borderColor: theme.border }]}
            onPress={() => handlePlayTap(onClose)}
            activeOpacity={0.8}
          >
            <Text style={[st.closeBtnText, { color: theme.secondaryText }]}>Fechar</Text>
          </TouchableOpacity>
        </TCard>
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
