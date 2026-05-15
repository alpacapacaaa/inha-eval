import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface InsetSectionProps {
  title?: string;
  caption?: string;
  children: ReactNode;
}

export function InsetSection({ title, caption, children }: InsetSectionProps) {
  return (
    <View style={styles.wrapper}>
      {title || caption ? (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      ) : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  header: {
    gap: 3,
    paddingHorizontal: 4,
  },
  title: {
    color: colors.inkBlue,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  caption: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    borderRadius: spacing.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
});
