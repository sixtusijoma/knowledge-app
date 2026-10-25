import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, useType } from '@/lib/theme';

type PrimaryProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  icon?: ReactNode;
};

export function PrimaryButton({ label, onPress, disabled, testID, icon }: PrimaryProps) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.primary,
        {
          backgroundColor: disabled ? palette.chip : palette.accent,
          opacity: pressed && !disabled ? 0.86 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: disabled ? palette.textMuted : palette.accentText,
          fontFamily: type.sansSemibold,
          fontSize: 16,
        }}
      >
        {label}
      </Text>
      {icon}
    </Pressable>
  );
}

type IconButtonProps = {
  label: string;
  onPress: () => void;
  testID?: string;
  children: ReactNode;
  badge?: number;
};

export function IconButton({ label, onPress, testID, children, badge }: IconButtonProps) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.icon,
        {
          backgroundColor: palette.chip,
          borderColor: palette.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {children}
      {typeof badge === 'number' && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: palette.accent }]}>
          <Text style={[styles.badgeText, { color: palette.accentText, fontFamily: type.sansSemibold }]}>
            {badge > 9 ? '9+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
  },
});
