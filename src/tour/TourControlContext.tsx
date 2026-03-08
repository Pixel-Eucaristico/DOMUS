import React, { createContext, useContext } from "react";

export interface TourControlContextValue {
  handleNext: () => void;
  handlePrev: () => void;
  handleSkip: () => void;
  handleMinimize: () => void;
  currentTourStep: number;
  isTourMinimized: boolean;
  isDemoActive: boolean;
}

const TourControlContext = createContext<TourControlContextValue | null>(null);

export const TourControlProvider = TourControlContext.Provider;

export function useTourControl(): TourControlContextValue | null {
  return useContext(TourControlContext);
}
