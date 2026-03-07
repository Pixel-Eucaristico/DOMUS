import React, { memo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useResponsive } from '../layout/useResponsive';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ResponsiveContainer = memo(function ResponsiveContainer({ children, style }: Props) {
  const { isMobile, contentWidth } = useResponsive();

  if (isMobile) {
    return <View style={[styles.mobile, style]}>{children}</View>;
  }

  return (
    <View style={[styles.centered, { maxWidth: contentWidth as number }, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  mobile: {
    width: '100%',
    paddingHorizontal: 0,
  },
  centered: {
    width: '100%',
    alignSelf: 'center',
  },
});
