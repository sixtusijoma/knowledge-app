import { useState } from 'react';

import { isIsoDate } from '@/lib/dates';
import { useTheme, useType } from '@/lib/theme';

type Props = {
  label: string;
  testID: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

// Web has no native module for the community picker. The browser date input
// opens the platform calendar (Chrome, Safari, Firefox) instead of a text keyboard.
export function DateRangePicker({ label, testID, value, onChange }: Props) {
  const { palette, name } = useTheme();
  const type = useType();
  const [focused, setFocused] = useState(false);
  const selected = isIsoDate(value) ? value : '';

  return (
    <input
      type="date"
      data-testid={testID}
      aria-label={`${label} date`}
      value={selected}
      onChange={(event) => {
        const next = event.currentTarget.value;
        if (next.length === 0) {
          onChange(null);
          return;
        }
        onChange(next);
      }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
      }}
      style={{
        color: palette.text,
        backgroundColor: palette.input,
        borderColor: focused ? palette.accent : palette.border,
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 12,
        minHeight: 46,
        paddingLeft: 12,
        paddingRight: 8,
        fontSize: 15,
        fontFamily: type.sans,
        width: '100%',
        boxSizing: 'border-box',
        colorScheme: name,
      }}
    />
  );
}
