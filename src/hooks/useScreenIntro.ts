import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "domus_screen_intro_v1_";

export function useScreenIntro(screenKey: string) {
  const [showIntro, setShowIntro] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFIX + screenKey).then((val) => {
      if (val === null) setShowIntro(true);
      setChecked(true);
    });
  }, [screenKey]);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    AsyncStorage.setItem(PREFIX + screenKey, "1").catch(() => {});
  }, [screenKey]);

  const resetIntro = useCallback(() => {
    AsyncStorage.removeItem(PREFIX + screenKey).catch(() => {});
    setShowIntro(true);
  }, [screenKey]);

  return { showIntro: checked && showIntro, dismissIntro, resetIntro };
}

/** Reset all screen intros (e.g. from Settings). */
export async function resetAllScreenIntros(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const introKeys = keys.filter((k) => k.startsWith(PREFIX));
  if (introKeys.length > 0) await AsyncStorage.multiRemove(introKeys);
}
