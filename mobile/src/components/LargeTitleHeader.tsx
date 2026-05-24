import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface LargeTitleHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  accessory?: ReactNode;
}

export function LargeTitleHeader({
  title,
  description,
  eyebrow,
  accessory,
}: LargeTitleHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  title: {
    color: colors.inkBlue,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  accessory: {
    alignItems: 'flex-end',
  },
});
