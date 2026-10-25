import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { availableYears, isMonthSelectable, MONTH_SHORT, monthKey } from '@/lib/dates';
import { activeFilterCount, EMPTY_FILTERS, rangeHint } from '@/lib/filters';
import { formatEntries } from '@/lib/format';
import { useTheme, useType } from '@/lib/theme';
import { TOPICS } from '@/lib/topics';
import type { ImportanceFilter, ItemFilters, SourceFilter } from '@/lib/types';

type Props = {
  visible: boolean;
  filters: ItemFilters;
  total: number | null;
  onChange: (filters: ItemFilters) => void;
  onClose: () => void;
};

const SOURCES: { value: SourceFilter; label: string; testID: string }[] = [
  { value: 'all', label: 'All', testID: 'filter-source-all' },
  { value: 'X Bookmark', label: 'X Bookmarks', testID: 'filter-source-x' },
  { value: 'Grok Chat', label: 'Grok Chats', testID: 'filter-source-grok' },
];

const LEVELS: { value: ImportanceFilter; label: string; testID: string }[] = [
  { value: 'all', label: 'All', testID: 'filter-importance-all' },
  { value: 'High', label: 'High', testID: 'filter-importance-high' },
  { value: 'Medium', label: 'Medium', testID: 'filter-importance-medium' },
  { value: 'Low', label: 'Low', testID: 'filter-importance-low' },
];

export function FilterSheet({ visible, filters, total, onChange, onClose }: Props) {
  const { palette } = useTheme();
  const type = useType();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [now] = useState(() => new Date());
  const initialYear = filters.month ? Number(filters.month.slice(0, 4)) : now.getFullYear();
  const [year, setYear] = useState(initialYear);
  const years = availableYears(now);
  const hint = rangeHint(filters.from, filters.to);
  const sheetHeight = Math.min(Math.round(height * 0.92), height - 12);

  function updateDate(field: 'from' | 'to', value: string) {
    const from = field === 'from' ? value : (filters.from ?? '');
    const to = field === 'to' ? value : (filters.to ?? '');
    const ready = rangeHint(from, to) === null && from.length === 10 && to.length === 10;
    let month = filters.month;
    if (ready) {
      month = null;
    }
    onChange({
      ...filters,
      from: from.length === 0 ? null : from,
      to: to.length === 0 ? null : to,
      month,
    });
  }

  const doneLabel = total === null ? 'Updating…' : `Show ${formatEntries(total)}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close filters" />
        <View
          testID="filter-sheet"
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: palette.bg,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: palette.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text, fontFamily: type.serif }]}>Filters</Text>
            <Pressable
              testID="filter-clear"
              disabled={activeFilterCount(filters) === 0}
              onPress={() => {
                onChange(EMPTY_FILTERS);
              }}
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: activeFilterCount(filters) === 0 ? palette.textMuted : palette.accent,
                  fontFamily: type.sansSemibold,
                  fontSize: 15,
                }}
              >
                Clear
              </Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>Source</Text>
            <View style={styles.choices}>
              {SOURCES.map((option) => {
                const selected = filters.source === option.value;
                return (
                  <Pressable
                    key={option.value}
                    testID={option.testID}
                    onPress={() => {
                      onChange({ ...filters, source: option.value });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.choice,
                      {
                        backgroundColor: selected ? palette.accent : palette.chip,
                        borderColor: selected ? palette.accent : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? palette.accentText : palette.chipText,
                        fontFamily: type.sansMedium,
                        fontSize: 13,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>
              Importance
            </Text>
            <View style={styles.choices}>
              {LEVELS.map((option) => {
                const selected = filters.importance === option.value;
                return (
                  <Pressable
                    key={option.value}
                    testID={option.testID}
                    onPress={() => {
                      onChange({ ...filters, importance: option.value });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.choice,
                      {
                        backgroundColor: selected ? palette.accent : palette.chip,
                        borderColor: selected ? palette.accent : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? palette.accentText : palette.chipText,
                        fontFamily: type.sansMedium,
                        fontSize: 13,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>Topics</Text>
            <Text style={[styles.hint, { color: palette.textMuted, fontFamily: type.sans }]}>
              Match any selected topic.
            </Text>
            <View style={styles.topics}>
              {TOPICS.map((topic) => {
                const selected = filters.topics.includes(topic);
                return (
                  <Pressable
                    key={topic}
                    testID={`filter-topic-${topic}`}
                    onPress={() => {
                      const topics = selected
                        ? filters.topics.filter((item) => item !== topic)
                        : [...filters.topics, topic];
                      onChange({ ...filters, topics });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.topic,
                      {
                        backgroundColor: selected ? palette.accent : palette.chip,
                        borderColor: selected ? palette.accent : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? palette.accentText : palette.chipText,
                        fontFamily: type.sansMedium,
                        fontSize: 13,
                      }}
                    >
                      {topic}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>When</Text>
            <Text style={[styles.hint, { color: palette.textMuted, fontFamily: type.sans }]}>
              Pick a month, or enter a start and end date.
            </Text>
            <View style={styles.years}>
              {years.map((option) => {
                const selected = option === year;
                return (
                  <Pressable
                    key={option}
                    testID={`filter-year-${option}`}
                    onPress={() => {
                      setYear(option);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.year,
                      {
                        backgroundColor: selected ? palette.text : 'transparent',
                        borderColor: selected ? palette.text : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? palette.bg : palette.text,
                        fontFamily: type.sansMedium,
                        fontSize: 13,
                      }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.months}>
              {MONTH_SHORT.map((label, index) => {
                const monthNumber = index + 1;
                const key = monthKey(year, monthNumber);
                const enabled = isMonthSelectable(year, monthNumber, now);
                const selected = filters.month === key;
                return (
                  <Pressable
                    key={key}
                    testID={`filter-month-${key}`}
                    disabled={!enabled}
                    onPress={() => {
                      if (filters.month === key) {
                        onChange({ ...filters, month: null });
                        return;
                      }
                      onChange({ ...filters, month: key, from: null, to: null });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !enabled }}
                    style={[
                      styles.month,
                      {
                        backgroundColor: selected ? palette.accent : palette.chip,
                        borderColor: selected ? palette.accent : palette.border,
                        opacity: enabled ? 1 : 0.35,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? palette.accentText : palette.chipText,
                        fontFamily: type.sansMedium,
                        fontSize: 13,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>
              Custom range
            </Text>
            <View style={styles.dates}>
              <TextInput
                testID="filter-from"
                value={filters.from ?? ''}
                onChangeText={(value) => {
                  updateDate('from', value);
                }}
                placeholder="From YYYY-MM-DD"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.dateInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
                    backgroundColor: palette.input,
                    fontFamily: type.sans,
                  },
                ]}
              />
              <TextInput
                testID="filter-to"
                value={filters.to ?? ''}
                onChangeText={(value) => {
                  updateDate('to', value);
                }}
                placeholder="To YYYY-MM-DD"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.dateInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
                    backgroundColor: palette.input,
                    fontFamily: type.sans,
                  },
                ]}
              />
            </View>
            {hint ? (
              <Text style={[styles.hint, { color: palette.danger, fontFamily: type.sans }]}>{hint}</Text>
            ) : null}
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <PrimaryButton label={doneLabel} onPress={onClose} testID="filter-done" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismiss: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    zIndex: 2,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  title: {
    fontSize: 28,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  section: {
    marginTop: 16,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topic: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  years: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  year: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  months: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  month: {
    width: '22%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dates: {
    gap: 8,
    marginTop: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
