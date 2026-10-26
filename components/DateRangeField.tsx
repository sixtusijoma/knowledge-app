import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateRangePicker } from '@/components/DateRangePicker';
import { isIsoDate } from '@/lib/dates';
import { useTheme, useType } from '@/lib/theme';

type Props = {
  label: string;
  testID: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

export function DateRangeField({ label, testID, value, onChange }: Props) {
  const { palette } = useTheme();
  const type = useType();
  const selected = isIsoDate(value) ? value : null;

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: palette.textSecondary, fontFamily: type.sansMedium }]}>{label}</Text>
        {selected ? (
          <Pressable
            testID={`${testID}-clear`}
            onPress={() => {
              onChange(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            hitSlop={8}
          >
            <Text style={{ color: palette.accent, fontFamily: type.sansMedium, fontSize: 12 }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <DateRangePicker label={label} testID={testID} value={selected} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  label: {
    fontSize: 13,
  },
});
