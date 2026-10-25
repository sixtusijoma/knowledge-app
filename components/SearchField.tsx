import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CloseIcon, SearchIcon } from '@/components/Icons';
import { useTheme, useType } from '@/lib/theme';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchField({ value, onChange }: Props) {
  const { palette, name } = useTheme();
  const type = useType();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.field,
        {
          backgroundColor: palette.input,
          borderColor: focused ? palette.accent : palette.border,
        },
      ]}
    >
      <SearchIcon color={palette.textMuted} />
      <TextInput
        testID="search-input"
        value={value}
        onChangeText={onChange}
        placeholder="Search titles, notes, authors"
        placeholderTextColor={palette.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        keyboardAppearance={name}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        accessibilityLabel="Search titles, notes, and authors"
        style={[styles.input, { color: palette.text, fontFamily: type.sans }]}
      />
      {value.length > 0 ? (
        <Pressable
          testID="search-clear"
          onPress={() => {
            onChange('');
          }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
        >
          <CloseIcon color={palette.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
});
