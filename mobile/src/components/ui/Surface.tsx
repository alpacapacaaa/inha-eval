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
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  glass: {
    shadowOpacity: 0,
  },
  raised: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  quiet: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0,
  },
});
