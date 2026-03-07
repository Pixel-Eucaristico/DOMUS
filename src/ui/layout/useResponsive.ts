import { useContext } from 'react';
import { ResponsiveContext, type ResponsiveContextValue } from './ResponsiveLayoutProvider';

export function useResponsive(): ResponsiveContextValue {
  const ctx = useContext(ResponsiveContext);
  if (!ctx) {
    throw new Error('useResponsive must be used within a ResponsiveLayoutProvider');
  }
  return ctx;
}
