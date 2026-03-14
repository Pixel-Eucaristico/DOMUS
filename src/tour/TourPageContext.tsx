import React, { createContext, useContext } from "react";

/** Provides the current page's groupId to child components (e.g. TourGuideTooltip). */
const TourPageContext = createContext<number>(-1);

export const TourPageContextProvider = TourPageContext.Provider;

export function useTourPageGroupId(): number {
  return useContext(TourPageContext);
}
