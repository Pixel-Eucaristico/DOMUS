export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1200,
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const CONTENT_MAX_WIDTH = {
  mobile: '100%' as const,
  tablet: 900,
  desktop: 1200,
} as const;

export const GRID_COLUMNS = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
} as const;
