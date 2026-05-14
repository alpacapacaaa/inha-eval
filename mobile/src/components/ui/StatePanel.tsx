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
    minHeight: 132,
    marginHorizontal: 18,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.related,
  },
  errorPanel: {
    backgroundColor: colors.dangerSoft,
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
