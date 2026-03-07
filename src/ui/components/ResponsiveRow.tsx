import React, { memo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useResponsive } from '../layout/useResponsive';

interface Props {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
  collapseOnMobile?: boolean;
}

export const ResponsiveRow = memo(function ResponsiveRow({ children, gap = 12, style, collapseOnMobile = true }: Props) {
  const { isMobile } = useResponsive();

  const direction = collapseOnMobile && isMobile ? 'column' : 'row';

  return (
    <View style={[styles.row, { flexDirection: direction, gap, paddingHorizontal: isMobile ? 0 : 16 }, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexWrap: 'wrap',
  },
});
