import { useCallback, useEffect, useState } from "react";
import {
  getCachedExternalLookups,
  loadExternalLookups,
  setExternalLookupsEnabled,
  subscribeExternalLookups,
} from "@/src/modules/privacy/externalLookups";

export interface UseExternalLookupsResult {
  /** Flag ligada. Enquanto carrega, é false (nenhum envio antes de ler a escolha). */
  enabled: boolean;
  loaded: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
}

/** Flag "Consultas de itens, preços e ícones" para as telas. */
export function useExternalLookups(): UseExternalLookupsResult {
  const [state, setState] = useState(() => getCachedExternalLookups());

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeExternalLookups((s) => {
      if (active) setState(s);
    });
    loadExternalLookups()
      .then((s) => {
        if (active) setState(s);
      })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    await setExternalLookupsEnabled(enabled);
  }, []);

  return {
    enabled: state?.enabled === true,
    loaded: state !== null,
    setEnabled,
  };
}
