import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface FeatureCardProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function FeatureCard({ eyebrow, title, description }: FeatureCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{eyebrow}</Text>
        </View>
        <Text style={styles.linkText}>적용 완료</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    backgroundColor: 'rgba(255,255,255,0.58)',
    padding: 22,
    gap: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.74)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
});
