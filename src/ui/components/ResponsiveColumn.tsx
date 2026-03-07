import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useResponsive } from '../layout/useResponsive';

interface Props {
  children: React.ReactNode;
  span?: number;
  style?: ViewStyle;
}

export const ResponsiveColumn = memo(function ResponsiveColumn({ children, span = 1, style }: Props) {
  const { columns } = useResponsive();
  
  // Calculate percentage width based on the desired span out of total grid columns
  const spanValue = Math.min(Math.max(1, span), columns);
  
  // We subtract a small amount if we want to ensure gap doesn't force wrap when not needed,
  // but row handles gap via Flex gap property usually, so exact percentage is often fine.
  // Actually, gap in Flex `row` wrapping might require a calc() on Web.
  // For React Native Web, using flexBasis % works best when gap is used if shrinking is allowed.
  const percentage = `${(spanValue / columns) * 100}%`;

  return (
    <View style={[{ 
      flexBasis: percentage as any, 
      maxWidth: percentage as any,
      minWidth: 0, 
      flexGrow: 1, 
      flexShrink: 1 
    }, style]}>
      {children}
    </View>
  );
});
