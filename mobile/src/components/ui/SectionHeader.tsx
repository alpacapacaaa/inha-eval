import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface SectionHeaderProps {
  title: string;
  caption?: string;
  meta?: string;
}

export function SectionHeader({ title, caption, meta }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: spacing.page,
    paddingTop: 18,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.related,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  caption: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  meta: {
    color: '#9aa2af',
    fontSize: 11,
    fontWeight: '800',
  },
});
