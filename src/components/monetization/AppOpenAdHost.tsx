import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { ADMOB_IDS } from "./AdMobConfig";

interface Props {
  enabled: boolean;
}

export function AppOpenAdHost({ enabled }: Props) {
  const appOpenAdRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    let AppOpenAd: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admob = require("react-native-google-mobile-ads");
      AppOpenAd = admob.AppOpenAd ?? admob.default?.AppOpenAd ?? null;
      const { AdEventType } = admob;

      if (!AppOpenAd) return;

      const ad = AppOpenAd.createForAdRequest(ADMOB_IDS.appOpen, {
        requestNonPersonalizedAdsOnly: false,
      });

      ad.addAdEventListener(AdEventType.LOADED, () => {
        appOpenAdRef.current = ad;
      });

      ad.addAdEventListener(AdEventType.CLOSED, () => {
        appOpenAdRef.current = null;
        ad.load();
      });

      ad.addAdEventListener(AdEventType.ERROR, () => {
        appOpenAdRef.current = null;
      });

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

    return () => subscription.remove();
  }, [enabled]);

  return null;
}
