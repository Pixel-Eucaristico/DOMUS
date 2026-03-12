/**
 * AdMob App Open Ad.
 * Shown when the user opens or returns to the app — overlays the splash/loading screen.
 *
 * Requires react-native-google-mobile-ads:
 *   npx expo install react-native-google-mobile-ads
 *   + add androidAppId to app.json plugins
 */
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { ADMOB_IDS } from "./AdMobConfig";

interface Props {
  /** Only show if supportMode === "app_open" */
  enabled: boolean;
}

export function AppOpenAdHost({ enabled }: Props) {
  const appOpenAd = useRef<any>(null);
  const appState = useRef(AppState.currentState);

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
        appOpenAd.current = ad;
      });

      ad.addAdEventListener(AdEventType.CLOSED, () => {
        appOpenAd.current = null;
        // Preload next ad
        ad.load();
      });

      ad.addAdEventListener(AdEventType.ERROR, () => {
        appOpenAd.current = null;
      });

      ad.load();
    } catch {
      // SDK not installed yet
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active" &&
        appOpenAd.current
      ) {
        appOpenAd.current.show();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [enabled]);

  // Renders nothing — side-effect only
  return null;
}
