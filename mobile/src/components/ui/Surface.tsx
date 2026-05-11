import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type SurfaceVariant = 'glass' | 'raised' | 'quiet';

interface SurfaceProps {
  children: ReactNode;
  variant?: SurfaceVariant;
  style?: StyleProp<ViewStyle>;
}

export function Surface({ children, variant = 'glass', style }: SurfaceProps) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  glass: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  raised: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 34,
    elevation: 4,
  },
  quiet: {
    backgroundColor: 'rgba(255,255,255,0.42)',
    shadowOpacity: 0,
  },
});
