import React, { memo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useResponsive } from '../layout/useResponsive';

interface Props {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  style?: ViewStyle;
}

export const ResponsiveGrid = memo(function ResponsiveGrid({ children, columns: columnsProp, gap = 12, style }: Props) {
  const { columns: defaultColumns } = useResponsive();
  const cols = columnsProp ?? defaultColumns;

  const items = React.Children.toArray(children);

  return (
    <View style={[styles.grid, { gap }, style]}>
      {items.map((child, index) => (
        <View
          key={index}
          style={{
            width: cols === 1 ? '100%' : `${(100 - (gap * (cols - 1)) / 3.5) / cols}%` as any,
            flexBasis: cols === 1 ? '100%' : `${(100 - (gap * (cols - 1)) / 3.5) / cols}%` as any,
            flexGrow: 0,
            flexShrink: 0,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
