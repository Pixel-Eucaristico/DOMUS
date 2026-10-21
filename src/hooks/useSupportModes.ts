import { useEffect, useRef, useState, useCallback } from "react";
import {
  getCachedSupportModes,
  loadSupportModes,
  saveSupportModes,
  subscribeSupportModes,
  type SupportMode,
} from "@/src/modules/monetization/MonetizationSettingsStore";
import { soundManager } from "@/src/services/SoundManager";

const EXCLUSIVE_MODE: SupportMode = "links";

function computeNextModes(prev: Set<SupportMode>, toggled: SupportMode): Set<SupportMode> {
  if (toggled === EXCLUSIVE_MODE) {
    return new Set([EXCLUSIVE_MODE]);
  }
  const next = new Set(prev);
  if (next.has(toggled)) {
    next.delete(toggled);
    if (next.size === 0) next.add(EXCLUSIVE_MODE);
  } else {
    next.delete(EXCLUSIVE_MODE);
    next.add(toggled);
  }
  return next;
}

interface UseSupportModesResult {
  modes: Set<SupportMode>;
  toggleMode: (mode: SupportMode) => void;
}

/**
 * Modos de apoio escolhidos. Assina a fonte única em
 * `MonetizationSettingsStore`: o seletor e os anúncios veem a mesma escolha.
 */
export function useSupportModes(onChange?: (modes: SupportMode[]) => void): UseSupportModesResult {
  const [modes, setModes] = useState<Set<SupportMode>>(
    () => new Set(getCachedSupportModes() ?? [EXCLUSIVE_MODE]),
  );
  const modesRef = useRef(modes);
  modesRef.current = modes;

  useEffect(() => {
    let active = true;
    const apply = (ms: SupportMode[]) => {
      if (!active) return;
      const next = new Set(ms);
      modesRef.current = next;
      setModes(next);
    };
    const unsubscribe = subscribeSupportModes(apply);
    loadSupportModes().then(apply).catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const toggleMode = useCallback(
    (mode: SupportMode) => {
      soundManager.play("tap");
      const next = computeNextModes(modesRef.current, mode);
      const arr = Array.from(next);
      modesRef.current = next;
      setModes(next);
      // Publica para os assinantes (anúncios) na hora e grava
      void saveSupportModes(arr);
      onChange?.(arr);
    },
    [onChange],
  );

  return { modes, toggleMode };
}
