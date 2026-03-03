import { useState, useEffect, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { UserSecuritySettings } from "@/src/modules/security/domain/UserSecuritySettings";
import { SecurityService } from "@/src/modules/security/application/SecurityService";

/**
 * In-memory session flag.
 * Lives for the duration of the JS process — survives re-renders but resets
 * when the app is fully killed or sent to background.
 */
let _sessionUnlocked = false;

export function useSecurityLock() {
  const [settings, setSettings] =
    useState<UserSecuritySettings | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAndCheck = useCallback(async () => {
    const s = await SecurityService.loadSettings();
    setSettings(s);
    if (s.enabled && !_sessionUnlocked) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAndCheck();
  }, [loadAndCheck]);

  // Re-lock when app moves to background
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "background" || state === "inactive") {
          _sessionUnlocked = false;
        }
      },
    );
    return () => sub.remove();
  }, []);

  const unlock = useCallback(() => {
    _sessionUnlocked = true;
    setIsLocked(false);
  }, []);

  const reloadSettings = useCallback(async () => {
    const s = await SecurityService.loadSettings();
    setSettings(s);
  }, []);

  return { settings, isLocked, isLoading, unlock, reloadSettings };
}
