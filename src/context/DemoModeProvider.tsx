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

interface DemoModeContextValue {
  isDemoActive: boolean;
  startDemo: () => void;
  stopDemo: () => void;
  /** In-memory events for the sandbox — empty when demo is inactive. */
  demoEvents: SyncEvent[];
  /** Append an event to the sandbox without touching SQLite. */
  dispatchDemoEvent: (event: { id: string; type: string; payload?: object; timestamp: number }) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

/**
 * Gerenciador de Sandboxing para o Tur Guiado.
 *
 * SRP: Responsável apenas por controlar o estado do modo demo e detectar
 *      o primeiro acesso (para exibir o tour automaticamente).
 * OCP: Novos tipos de seed events podem ser adicionados em mockDemoEvents.ts
 *      sem alterar este provider.
 */
export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoEvents, setDemoEvents] = useState<SyncEvent[]>([]);

  const startDemo = useCallback(() => {
    setDemoEvents(DEMO_SEED_EVENTS);
    setIsDemoActive(true);
  }, []);

  const stopDemo = useCallback(() => {
    setIsDemoActive(false);
    setDemoEvents([]); // Dados voláteis — cleanup automático
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

  /** Detecta o primeiro acesso ao app e inicia o tour automaticamente. */
  useEffect(() => {
    AsyncStorage.getItem(TOUR_SHOWN_KEY).then((value) => {
      if (value === null) {
        AsyncStorage.setItem(TOUR_SHOWN_KEY, "shown");
        startDemo();
      }
    });
  }, [startDemo]);

  const value = useMemo(
    () => ({ isDemoActive, startDemo, stopDemo, demoEvents, dispatchDemoEvent }),
    [isDemoActive, startDemo, stopDemo, demoEvents, dispatchDemoEvent],
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
