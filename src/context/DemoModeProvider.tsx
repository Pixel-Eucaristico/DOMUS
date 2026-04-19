import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const WELCOME_KEY = "domus_welcome_done_v1";

interface DemoModeContextValue {
  /** Always false — demo/tour mode removed. Kept for backward-compat with other hooks. */
  isDemoActive: boolean;
  startDemo: () => void;
  stopDemo: () => void;
  /** Always empty — no fake data injected. */
  demoEvents: SyncEvent[];
  dispatchDemoEvent: (event: { id: string; type: string; payload?: object; timestamp: number }) => void;

  showWelcomeCarousel: boolean;
  completeWelcomeCarousel: () => void;
  restartWithCarousel: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [showWelcomeCarousel, setShowWelcomeCarousel] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY).then((val) => {
      if (val === null) setShowWelcomeCarousel(true);
    });
  }, []);

  const completeWelcomeCarousel = useCallback(() => {
    AsyncStorage.setItem(WELCOME_KEY, "done").catch(() => {});
    setShowWelcomeCarousel(false);
  }, []);

  const restartWithCarousel = useCallback(() => {
    AsyncStorage.removeItem(WELCOME_KEY).catch(() => {});
    setShowWelcomeCarousel(true);
  }, []);

  const noop = useCallback(() => {}, []);

  const value = useMemo(
    () => ({
      isDemoActive: false,
      startDemo: noop,
      stopDemo: noop,
      demoEvents: [] as SyncEvent[],
      dispatchDemoEvent: noop as any,
      showWelcomeCarousel,
      completeWelcomeCarousel,
      restartWithCarousel,
    }),
    [showWelcomeCarousel, completeWelcomeCarousel, restartWithCarousel, noop],
  );

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used within DemoModeProvider");
  return ctx;
}
