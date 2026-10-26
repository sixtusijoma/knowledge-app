import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatItemDate, isIsoDate, isoDate } from '@/lib/dates';
import { useTheme, useType } from '@/lib/theme';

type Props = {
  label: string;
  testID: string;
  value: string | null;
  onChange: (value: string | null) => void;
};

function dateFromIso(value: string | null): Date {
  const today = new Date();
  if (!isIsoDate(value)) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function DateRangePicker({ label, testID, value, onChange }: Props) {
  const { palette, name } = useTheme();
  const type = useType();
  const [open, setOpen] = useState(false);
  const shown = useMemo(() => dateFromIso(value), [value]);

  function commit(date: Date) {
    onChange(isoDate(date));
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: shown,
        mode: 'date',
        display: 'calendar',
        onValueChange: (_event, date) => {
          commit(date);
        },
      });
      return;
    }
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
  }

  const selected = isIsoDate(value);

  return (
    <>
      <Pressable
        testID={testID}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={selected ? `${label} date, ${formatItemDate(value)}` : `${label} date`}
        style={[
          styles.input,
          {
            borderColor: open ? palette.accent : palette.border,
            backgroundColor: palette.input,
          },
        ]}
      >
        <Text
          style={{
            color: selected ? palette.text : palette.textMuted,
            fontFamily: type.sans,
            fontSize: 15,
          }}
        >
          {selected ? formatItemDate(value) : 'Select date'}
        </Text>
      </Pressable>
      {open && Platform.OS !== 'android' ? (
        <Modal visible transparent animationType="slide" onRequestClose={closePicker}>
          <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closePicker}
              accessibilityRole="button"
              accessibilityLabel="Dismiss date picker"
            />
            <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <DateTimePicker
                value={shown}
                mode="date"
                display="inline"
                themeVariant={name}
                accentColor={palette.accent}
                onValueChange={(_event, date) => {
                  commit(date);
                }}
              />
              <Pressable
                testID={`${testID}-done`}
                onPress={closePicker}
                accessibilityRole="button"
                accessibilityLabel={`Done choosing ${label}`}
                style={styles.done}
              >
                <Text style={{ color: palette.accent, fontFamily: type.sansSemibold, fontSize: 16 }}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingTop: 8,
    paddingBottom: 24,
  },
  done: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
