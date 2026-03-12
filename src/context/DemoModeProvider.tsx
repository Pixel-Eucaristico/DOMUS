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
import { DEMO_SEED_EVENTS } from "@/src/constants/mockDemoEvents";

const TOUR_SHOWN_KEY = "domus_tour_shown_v1";
const TOUR_STEP_KEY = "domus_tour_step_v1";
const WELCOME_KEY = "domus_welcome_v2";

interface DemoModeContextValue {
  isDemoActive: boolean;
  startDemo: () => void;
  stopDemo: () => void;
  demoEvents: SyncEvent[];
  dispatchDemoEvent: (event: { id: string; type: string; payload?: object; timestamp: number }) => void;
  currentTourStep: number;
  setTourStep: (step: number) => void;
  isTourMinimized: boolean;
  setTourMinimized: (minimized: boolean) => void;
  showWelcomeCarousel: boolean;
  completeWelcomeCarousel: () => void;
  restartWithCarousel: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoEvents, setDemoEvents] = useState<SyncEvent[]>([]);
  const [currentTourStep, setCurrentTourStepState] = useState(0);
  const [isTourMinimized, setTourMinimized] = useState(false);
  const [showWelcomeCarousel, setShowWelcomeCarousel] = useState(false);

  const setTourStep = useCallback((step: number) => {
    setCurrentTourStepState(step);
    AsyncStorage.setItem(TOUR_STEP_KEY, String(step)).catch(() => {});
  }, []);

  const startDemo = useCallback(() => {
    setDemoEvents(DEMO_SEED_EVENTS);
    setIsDemoActive(true);
    setCurrentTourStepState(0);
    setTourMinimized(false);
    AsyncStorage.setItem(TOUR_STEP_KEY, "0").catch(() => {});
  }, []);

  const stopDemo = useCallback(() => {
    setIsDemoActive(false);
    setDemoEvents([]);
    setTourMinimized(false);
    AsyncStorage.removeItem(TOUR_STEP_KEY).catch(() => {});
  }, []);

  const completeWelcomeCarousel = useCallback(() => {
    AsyncStorage.setItem(WELCOME_KEY, "done").catch(() => {});
    setShowWelcomeCarousel(false);
    // startDemo is called by WelcomeCarousel's onComplete handler
  }, []);

  const restartWithCarousel = useCallback(() => {
    AsyncStorage.removeItem(WELCOME_KEY).catch(() => {});
    setShowWelcomeCarousel(true);
  }, []);

  const dispatchDemoEvent = useCallback(
    (event: { id: string; type: string; payload?: object; timestamp: number }) => {
      const syncEvt: SyncEvent = {
        id: event.id,
        type: event.type,
        payload: event.payload ?? {},
        timestamp: event.timestamp,
        deviceId: "demo",
        signature: "",
      };
      setDemoEvents((prev) => [...prev, syncEvt]);
    },
    [],
  );

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(TOUR_SHOWN_KEY),
      AsyncStorage.getItem(TOUR_STEP_KEY),
      AsyncStorage.getItem(WELCOME_KEY),
    ]).then(([shown, savedStep, welcomeDone]) => {
      if (shown === null) {
        // First launch ever
        AsyncStorage.setItem(TOUR_SHOWN_KEY, "shown").catch(() => {});
        if (welcomeDone === null) {
          // Show welcome carousel first
          setShowWelcomeCarousel(true);
        } else {
          // Welcome done but tour never started (edge case)
          startDemo();
        }
      } else if (savedStep !== null) {
        // Resume interrupted tour
        const step = parseInt(savedStep, 10);
        if (!isNaN(step) && step >= 0) {
          setCurrentTourStepState(step);
          setDemoEvents(DEMO_SEED_EVENTS);
          setIsDemoActive(true);
        }
      }
    });
  }, [startDemo]);

  const value = useMemo(
    () => ({
      isDemoActive,
      startDemo,
      stopDemo,
      demoEvents,
      dispatchDemoEvent,
      currentTourStep,
      setTourStep,
      isTourMinimized,
      setTourMinimized,
      showWelcomeCarousel,
      completeWelcomeCarousel,
      restartWithCarousel,
    }),
    [isDemoActive, startDemo, stopDemo, demoEvents, dispatchDemoEvent, currentTourStep, setTourStep, isTourMinimized, showWelcomeCarousel, completeWelcomeCarousel, restartWithCarousel],
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
