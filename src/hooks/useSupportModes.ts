import { useEffect, useState, useCallback } from "react";
import {
  loadSupportModes,
  saveSupportModes,
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

export function useSupportModes(onChange?: (modes: SupportMode[]) => void): UseSupportModesResult {
  const [modes, setModes] = useState<Set<SupportMode>>(new Set([EXCLUSIVE_MODE]));

  useEffect(() => {
    loadSupportModes().then((saved) => setModes(new Set(saved)));
  }, []);

  const toggleMode = useCallback(
    (mode: SupportMode) => {
      soundManager.play("tap");
      setModes((prev) => {
        const next = computeNextModes(prev, mode);
        const arr = Array.from(next);
        saveSupportModes(arr);
        onChange?.(arr);
        return next;
      });
    },
    [onChange],
  );

  return { modes, toggleMode };
}
