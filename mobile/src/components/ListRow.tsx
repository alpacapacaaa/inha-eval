import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

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
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.pressable, pressed ? styles.pressablePressed : null]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  pressable: {
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  pressablePressed: {
    opacity: 0.76,
    transform: [{ scale: 0.996 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
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
    color: colors.inkBlue,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
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
