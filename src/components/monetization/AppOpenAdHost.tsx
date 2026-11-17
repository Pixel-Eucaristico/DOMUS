import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { ADMOB_IDS } from "./AdMobConfig";
import { adRequestOptions, shouldRequestAd } from "@/src/modules/monetization/adConsent";
import { usePersonalizedAdsConsent } from "@/src/hooks/usePersonalizedAdsConsent";
import {
  isFullScreenAdBlocking,
  markFullScreenAdActive,
  markFullScreenAdClosed,
} from "./fullScreenAd";

interface Props {
  enabled: boolean;
}

const RETRY_DELAY_MS = 60_000;

export function AppOpenAdHost({ enabled }: Props) {
  const appOpenAdRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  const { consent, loaded } = usePersonalizedAdsConsent();

  useEffect(() => {
    // Só pede anúncio depois de ler o consentimento; mudar o consentimento
    // descarta o anúncio já carregado e pede um novo com a escolha atual.
    if (!shouldRequestAd(enabled, loaded, Platform.OS === "web")) return;

    let disposed = false;
    let adOpen = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribes: (() => void)[] = [];

    const cleanupListeners = () => {
      unsubscribes.forEach((u) => {
        try {
          u?.();
        } catch {
          // best-effort
        }
      });
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admob = require("react-native-google-mobile-ads");
      const AppOpenAd = admob.AppOpenAd ?? admob.default?.AppOpenAd ?? null;
      const { AdEventType } = admob;

      if (!AppOpenAd) return;

      const ad = AppOpenAd.createForAdRequest(ADMOB_IDS.appOpen, adRequestOptions(consent));

      unsubscribes.push(
        ad.addAdEventListener(AdEventType.LOADED, () => {
          if (!disposed) appOpenAdRef.current = ad;
        }),
      );

      unsubscribes.push(
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          if (adOpen) {
            adOpen = false;
            markFullScreenAdClosed();
          }
          appOpenAdRef.current = null;
          if (!disposed) {
            try {
              ad.load();
            } catch {
              // best-effort
            }
          }
        }),
      );

      unsubscribes.push(
        ad.addAdEventListener(AdEventType.ERROR, () => {
          if (adOpen) {
            adOpen = false;
            markFullScreenAdClosed();
          }
          appOpenAdRef.current = null;
          if (!disposed && !retryTimer) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              if (!disposed) {
                try {
                  ad.load();
                } catch {
                  // best-effort
                }
              }
            }, RETRY_DELAY_MS);
          }
        }),
      );

      ad.load();
    } catch {
      cleanupListeners();
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      const isReturningFromBackground =
        appStateRef.current === "background" && nextState === "active";
      appStateRef.current = nextState;

      // Não emenda com outro anúncio de tela cheia nem repete o mesmo anúncio
      if (isReturningFromBackground && appOpenAdRef.current && !isFullScreenAdBlocking()) {
        const adToShow = appOpenAdRef.current;
        appOpenAdRef.current = null;
        adOpen = true;
        markFullScreenAdActive();
        try {
          Promise.resolve(adToShow.show()).catch(() => {
            if (adOpen) {
              adOpen = false;
              markFullScreenAdClosed();
            }
          });
        } catch {
          if (adOpen) {
            adOpen = false;
            markFullScreenAdClosed();
          }
        }
      }
    });

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (adOpen) {
        adOpen = false;
        markFullScreenAdClosed();
      }
      subscription.remove();
      cleanupListeners();
      appOpenAdRef.current = null;
    };
  }, [enabled, loaded, consent]);

  return null;
}
