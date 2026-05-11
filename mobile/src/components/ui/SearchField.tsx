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
        <View style={styles.searchIcon}>
          <View style={styles.searchIconHandle} />
        </View>
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
    gap: 9,
    paddingHorizontal: spacing.page,
  },
  searchBar: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
  },
  searchIcon: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#7b8798',
  },
  searchIconHandle: {
    position: 'absolute',
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#7b8798',
    right: -5,
    bottom: -3,
    transform: [{ rotate: '45deg' }],
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
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
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(18,24,38,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
