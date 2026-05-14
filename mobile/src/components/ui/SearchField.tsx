import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { PressableScale } from './PressableScale';

interface SearchFieldProps extends TextInputProps {
  buttonLabel?: string;
  onButtonPress?: () => void;
  rightAccessory?: ReactNode;
  onRightAccessoryPress?: () => void;
}

export function SearchField({
  buttonLabel = '검색',
  onButtonPress,
  rightAccessory,
  onRightAccessoryPress,
  style,
  ...inputProps
}: SearchFieldProps) {
  return (
    <View style={styles.searchDock}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#7b8798" />
        <TextInput
          placeholderTextColor="#a0a0a7"
          style={[styles.searchInput, style]}
          returnKeyType="search"
          {...inputProps}
        />
        {rightAccessory ? (
          <PressableScale style={styles.rightAccessory} onPress={onRightAccessoryPress ?? (() => {})}>
            {rightAccessory}
          </PressableScale>
        ) : null}
      </View>
      {onButtonPress ? (
        <PressableScale style={styles.searchButton} onPress={onButtonPress}>
          <Text style={styles.searchButtonText}>{buttonLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.page,
  },
  searchBar: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  rightAccessory: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
