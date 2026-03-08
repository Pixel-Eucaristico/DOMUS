import React, { createContext, useContext, useRef, useCallback, useSyncExternalStore } from "react";

export interface TourControlContextValue {
  handleNext: () => void;
  handlePrev: () => void;
  handleSkip: () => void;
  handleMinimize: () => void;
  currentTourStep: number;
  isTourMinimized: boolean;
  isDemoActive: boolean;
  /** Inline card registers/unregisters visibility */
  registerInlineCard: () => () => void;
  inlineCardVisible: boolean;
}

const TourControlContext = createContext<TourControlContextValue | null>(null);

export const TourControlProvider = TourControlContext.Provider;

export function useTourControl(): TourControlContextValue | null {
  return useContext(TourControlContext);
}

/**
 * Tracks how many inline cards are currently mounted/visible.
 * Returns { registerInlineCard, subscribe, getSnapshot } for use in TourOverlay.
 */
export function useInlineCardTracker() {
  const countRef = useRef(0);
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  const getSnapshot = useCallback(() => countRef.current > 0, []);

  const registerInlineCard = useCallback(() => {
    countRef.current++;
    listenersRef.current.forEach((cb) => cb());
    return () => {
      countRef.current--;
      listenersRef.current.forEach((cb) => cb());
    };
  }, []);

  const inlineCardVisible = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { registerInlineCard, inlineCardVisible };
}
