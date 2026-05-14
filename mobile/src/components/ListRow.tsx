import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}

export function ListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  isLast = false,
}: ListRowProps) {
  const content = (
    <View style={[styles.row, !isLast ? styles.rowBorder : null]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale
        accessibilityRole="button"
        style={styles.pressable}
        onPress={onPress}
      >
        {content}
      </PressableScale>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  pressable: {
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.page,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  leading: {
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  meta: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
