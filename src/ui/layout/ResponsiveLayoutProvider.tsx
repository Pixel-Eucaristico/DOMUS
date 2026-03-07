import React, { createContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { SPACING, type DeviceType } from '../constants/breakpoints';
import { getDeviceType, getColumns, getContentMaxWidth, isSidebarEnabled } from './LayoutManager';

export interface ResponsiveContextValue {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  columns: number;
  contentWidth: number | string;
  sidebarEnabled: boolean;
  screenWidth: number;
  screenHeight: number;
  spacing: typeof SPACING;
}

export const ResponsiveContext = createContext<ResponsiveContextValue | null>(null);

export function ResponsiveLayoutProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  const value = useMemo<ResponsiveContextValue>(() => {
    const deviceType = getDeviceType(width);
    return {
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      columns: getColumns(deviceType),
      contentWidth: getContentMaxWidth(deviceType),
      sidebarEnabled: isSidebarEnabled(deviceType),
      screenWidth: width,
      screenHeight: height,
      spacing: SPACING,
    };
  }, [width, height]);

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}
