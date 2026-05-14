import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { PressableScale } from './PressableScale';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  compact = false,
  onPress,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      disabled={isDisabled}
      style={[
        styles.base,
        compact ? styles.compact : null,
        styles[variant],
        isDisabled ? styles.disabled : null,
        style,
      ]}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.primary : '#ffffff'} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.fill,
    borderColor: colors.fill,
  },
  ghost: {
    backgroundColor: '#ffffff',
    borderColor: colors.line,
  },
  danger: {
    backgroundColor: 'rgba(216,79,65,0.92)',
    borderColor: 'rgba(255,255,255,0.24)',
  },
  disabled: {
    backgroundColor: '#C8D2E1',
    borderColor: '#C8D2E1',
    opacity: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: colors.textMuted,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: '#ffffff',
  },
});
