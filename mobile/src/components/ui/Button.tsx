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
    minHeight: 54,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: 'rgba(18,24,38,0.90)',
    borderColor: 'rgba(255,255,255,0.24)',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderColor: 'rgba(255,255,255,0.78)',
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.36)',
    borderColor: 'rgba(255,255,255,0.62)',
  },
  danger: {
    backgroundColor: 'rgba(216,79,65,0.92)',
    borderColor: 'rgba(255,255,255,0.24)',
  },
  disabled: {
    opacity: 0.42,
  },
  text: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: colors.text,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: '#ffffff',
  },
});
