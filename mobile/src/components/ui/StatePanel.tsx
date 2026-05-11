import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Surface } from './Surface';

interface StatePanelProps {
  label: string;
  loading?: boolean;
  error?: boolean;
}

export function StatePanel({ label, loading = false, error = false }: StatePanelProps) {
  return (
    <Surface variant="quiet" style={[styles.panel, error ? styles.errorPanel : null]}>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={[styles.text, error ? styles.errorText : null]}>{label}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  panel: {
    minHeight: 152,
    marginHorizontal: spacing.page,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.related,
  },
  errorPanel: {
    borderColor: 'rgba(255,59,48,0.16)',
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
  },
});
