import React, { memo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useResponsive } from '../layout/useResponsive';

interface Props {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  sidebarWidth?: number;
  style?: ViewStyle;
}

export const ResponsiveSidebarLayout = memo(function ResponsiveSidebarLayout({
  children,
  sidebar,
  sidebarWidth = 260,
  style,
}: Props) {
  const { sidebarEnabled } = useResponsive();

  if (!sidebarEnabled) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.sidebar, { width: sidebarWidth }]}>
        {sidebar}
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    height: '100%',
  },
  content: {
    flex: 1,
  },
});
