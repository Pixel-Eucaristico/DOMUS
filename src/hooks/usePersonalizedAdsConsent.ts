import { useCallback, useEffect, useState } from "react";
import {
  getCachedPersonalizedAdsConsent,
  loadPersonalizedAdsConsent,
  setPersonalizedAdsConsent,
  subscribePersonalizedAdsConsent,
} from "@/src/modules/monetization/adConsent";

export interface UsePersonalizedAdsConsentResult {
  /** Consentimento atual. Enquanto carrega, é false (não personalizado). */
  consent: boolean;
  loaded: boolean;
  setConsent: (consent: boolean) => Promise<void>;
}

/** Consentimento de anúncio personalizado para as telas e os anúncios. */
export function usePersonalizedAdsConsent(): UsePersonalizedAdsConsentResult {
  const [state, setState] = useState<boolean | null>(() => getCachedPersonalizedAdsConsent());

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribePersonalizedAdsConsent((c) => {
      if (active) setState(c);
    });
    loadPersonalizedAdsConsent()
      .then((c) => {
        if (active) setState(c);
      })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const setConsent = useCallback(async (consent: boolean) => {
    await setPersonalizedAdsConsent(consent);
  }, []);

  return { consent: state === true, loaded: state !== null, setConsent };
}
