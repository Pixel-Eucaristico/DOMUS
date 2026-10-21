import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { ADMOB_IDS } from "./AdMobConfig";
import { adRequestOptions } from "@/src/modules/monetization/adConsent";
import { usePersonalizedAdsConsent } from "@/src/hooks/usePersonalizedAdsConsent";

interface Props {
  enabled: boolean;
}

export function AppOpenAdHost({ enabled }: Props) {
  const appOpenAdRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  const { consent, loaded } = usePersonalizedAdsConsent();

  useEffect(() => {
    // Só pede anúncio depois de ler o consentimento; mudar o consentimento
    // descarta o anúncio já carregado e pede um novo com a escolha atual.
    if (!enabled || !loaded || Platform.OS === "web") return;

    let AppOpenAd: any = null;
    const unsubscribes: (() => void)[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admob = require("react-native-google-mobile-ads");
      AppOpenAd = admob.AppOpenAd ?? admob.default?.AppOpenAd ?? null;
      const { AdEventType } = admob;

      if (!AppOpenAd) return;

      const ad = AppOpenAd.createForAdRequest(ADMOB_IDS.appOpen, adRequestOptions(consent));

      unsubscribes.push(
        ad.addAdEventListener(AdEventType.LOADED, () => {
          appOpenAdRef.current = ad;
        }),
      );

      unsubscribes.push(
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          appOpenAdRef.current = null;
          ad.load();
        }),
      );

      unsubscribes.push(
        ad.addAdEventListener(AdEventType.ERROR, () => {
          appOpenAdRef.current = null;
        }),
      );

      ad.load();
    } catch {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      const isReturningToForeground =
        appStateRef.current.match(/inactive|background/) && nextState === "active";

      if (isReturningToForeground && appOpenAdRef.current) {
        appOpenAdRef.current.show();
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
      unsubscribes.forEach((u) => {
        try {
          u?.();
        } catch {
          // best-effort
        }
      });
      appOpenAdRef.current = null;
    };
  }, [enabled, loaded, consent]);

  return null;
}
