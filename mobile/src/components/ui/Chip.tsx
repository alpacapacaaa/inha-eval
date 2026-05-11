import { StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { PressableScale } from './PressableScale';

type ChipTone = 'dark' | 'blue' | 'green' | 'red' | 'neutral';

const toneColor: Record<ChipTone, string> = {
  dark: colors.text,
  blue: colors.primary,
  green: '#226d68',
  red: '#d84f41',
  neutral: '#53627e',
};

interface ChipProps {
  label: string;
  active?: boolean;
  tone?: ChipTone;
  compact?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({
  label,
  active = false,
  tone = 'neutral',
  compact = false,
  onPress,
  style,
}: ChipProps) {
  const color = toneColor[tone];

  return (
    <PressableScale
      accessibilityState={{ selected: active }}
      disabled={!onPress}
      style={[
        styles.chip,
        compact ? styles.chipCompact : null,
        {
          backgroundColor: active ? color : 'rgba(255,255,255,0.58)',
          borderColor: active ? color : 'rgba(255,255,255,0.78)',
        },
        style,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, compact ? styles.textCompact : null, { color: active ? '#ffffff' : color }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipCompact: {
    minHeight: 30,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  textCompact: {
    fontSize: 11,
    fontWeight: '700',
  },
});
