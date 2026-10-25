import { useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { SportsIcon } from '@/components/Icons';
import { availableYears, isMonthSelectable, MONTH_SHORT, monthKey } from '@/lib/dates';
import { activeFilterCount, customRange, EMPTY_FILTERS, rangeHint } from '@/lib/filters';
import { formatEntries } from '@/lib/format';
import { useTheme, useType } from '@/lib/theme';
import { isSports, TOPICS } from '@/lib/topics';
import type { ItemFilters, SourceFilter } from '@/lib/types';
import { usePresentTopics } from '@/lib/use-topics';

type Props = {
  visible: boolean;
  filters: ItemFilters;
  total: number | null;
  loading: boolean;
  onChange: (filters: ItemFilters) => void;
  onClose: () => void;
};

const SOURCES: { value: SourceFilter; label: string; testID: string }[] = [
  { value: 'all', label: 'All', testID: 'filter-source-all' },
  { value: 'X Bookmark', label: 'X Bookmarks', testID: 'filter-source-x' },
  { value: 'Grok Chat', label: 'Grok Chats', testID: 'filter-source-grok' },
];

export function FilterSheet({ visible, filters, total, loading, onChange, onClose }: Props) {
  const { palette } = useTheme();
  const type = useType();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [now] = useState(() => new Date());
  const [year, setYear] = useState(() => (filters.month ? Number(filters.month.slice(0, 4)) : now.getFullYear()));
  const hint = rangeHint(filters.from, filters.to);
  const dirty = activeFilterCount(filters) > 0 || filters.from !== null || filters.to !== null;
  const present = usePresentTopics();
  const listedTopics = TOPICS.filter((topic) => {
    if (filters.topics.includes(topic)) {
      return true;
    }
    return present.ready && present.topics.includes(topic);
  });

  function updateDate(field: 'from' | 'to', value: string) {
    const next: ItemFilters = { ...filters, [field]: value.length === 0 ? null : value };
    if (customRange(next)) {
      next.month = null;
    }
    onChange(next);
  }

  function doneLabel(): string {
    if (loading) {
      return 'Updating…';
    }
    if (total === null) {
      return 'Done';
    }
    return `Show ${formatEntries(total)}`;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close filters" />
        <View
          testID="filter-sheet"
          style={[
            styles.sheet,
            {
              height: Math.min(Math.round(height * 0.92), height - 12),
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
              disabled={!dirty}
              onPress={() => {
                onChange(EMPTY_FILTERS);
              }}
              accessibilityRole="button"
              hitSlop={10}
            >
              <Text
                style={{
                  color: dirty ? palette.accent : palette.textMuted,
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
            keyboardDismissMode="on-drag"
          >
            <Section title="Source">
              <View style={styles.wrap}>
                {SOURCES.map((option) => (
                  <Pill
                    key={option.value}
                    testID={option.testID}
                    label={option.label}
                    selected={filters.source === option.value}
                    onPress={() => {
                      onChange({ ...filters, source: option.value });
                    }}
                  />
                ))}
              </View>
            </Section>

            <Section title="Topics" hint="Match any selected topic. Topics with nothing saved are hidden.">
              {present.ready ? null : (
                <Text testID="filter-topics-loading" style={[styles.hint, { color: palette.textMuted, fontFamily: type.sans }]}>
                  Checking which topics have entries…
                </Text>
              )}
              <View testID="filter-topics" style={styles.wrap}>
                {listedTopics.map((topic) => {
                  const selected = filters.topics.includes(topic);
                  const sports = isSports(topic);
                  return (
                    <Pill
                      key={topic}
                      testID={`filter-topic-${topic}`}
                      label={topic}
                      tone={sports ? 'sports' : 'accent'}
                      icon={
                        sports ? (
                          <SportsIcon color={selected ? palette.accentText : palette.sports} size={14} />
                        ) : undefined
                      }
                      selected={selected}
                      onPress={() => {
                        const topics = selected
                          ? filters.topics.filter((item) => item !== topic)
                          : [...filters.topics, topic];
                        onChange({ ...filters, topics });
                      }}
                    />
                  );
                })}
              </View>
            </Section>

            <Section title="Month">
              <View style={styles.row}>
                {availableYears(now).map((option) => (
                  <Pill
                    key={option}
                    testID={`filter-year-${option}`}
                    label={String(option)}
                    variant="tab"
                    selected={option === year}
                    onPress={() => {
                      setYear(option);
                    }}
                  />
                ))}
              </View>
              <View style={styles.months}>
                {MONTH_SHORT.map((label, index) => {
                  const key = monthKey(year, index + 1);
                  return (
                    <Pill
                      key={key}
                      testID={`filter-month-${key}`}
                      label={label}
                      style={styles.month}
                      disabled={!isMonthSelectable(year, index + 1, now)}
                      selected={filters.month === key}
                      onPress={() => {
                        if (filters.month === key) {
                          onChange({ ...filters, month: null });
                          return;
                        }
                        onChange({ ...filters, month: key, from: null, to: null });
                      }}
                    />
                  );
                })}
              </View>
            </Section>

            <Section title="Date range" hint="Leave either end open. A range replaces the month.">
              <View style={styles.row}>
                <DateField
                  label="From"
                  testID="filter-from"
                  value={filters.from}
                  onChange={(value) => {
                    updateDate('from', value);
                  }}
                />
                <DateField
                  label="To"
                  testID="filter-to"
                  value={filters.to}
                  onChange={(value) => {
                    updateDate('to', value);
                  }}
                />
              </View>
              {hint ? (
                <Text testID="filter-range-hint" style={[styles.hint, { color: palette.danger, fontFamily: type.sans }]}>
                  {hint}
                </Text>
              ) : null}
            </Section>
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <PrimaryButton label={doneLabel()} onPress={onClose} testID="filter-done" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>{title}</Text>
      {hint ? <Text style={[styles.hint, { color: palette.textMuted, fontFamily: type.sans }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

type PillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
  variant?: 'choice' | 'tab';
  tone?: 'accent' | 'sports';
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function Pill({
  label,
  selected,
  onPress,
  testID,
  disabled = false,
  variant = 'choice',
  tone = 'accent',
  icon,
  style,
}: PillProps) {
  const { palette } = useTheme();
  const type = useType();
  let colors = { background: palette.chip, border: palette.border, text: palette.chipText };
  if (selected && variant === 'choice' && tone === 'sports') {
    colors = { background: palette.sports, border: palette.sports, text: palette.accentText };
  } else if (selected && variant === 'choice') {
    colors = { background: palette.accent, border: palette.accent, text: palette.accentText };
  } else if (selected) {
    colors = { background: palette.text, border: palette.text, text: palette.bg };
  } else if (tone === 'sports') {
    colors = { background: palette.sportsBg, border: palette.border, text: palette.sports };
  } else if (variant === 'tab') {
    colors = { background: 'transparent', border: palette.border, text: palette.text };
  }
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[
        styles.pill,
        style,
        { backgroundColor: colors.background, borderColor: colors.border, opacity: disabled ? 0.35 : 1 },
      ]}
    >
      {icon}
      <Text style={[styles.pillText, { color: colors.text, fontFamily: type.sansMedium }]}>{label}</Text>
    </Pressable>
  );
}

function DateField({
  label,
  testID,
  value,
  onChange,
}: {
  label: string;
  testID: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  const { palette, name } = useTheme();
  const type = useType();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.dateField}>
      <Text style={[styles.dateLabel, { color: palette.textSecondary, fontFamily: type.sansMedium }]}>{label}</Text>
      <TextInput
        testID={testID}
        value={value ?? ''}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={palette.textMuted}
        accessibilityLabel={`${label} date, YYYY-MM-DD`}
        keyboardType="numbers-and-punctuation"
        keyboardAppearance={name}
        maxLength={10}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        style={[
          styles.dateInput,
          {
            color: palette.text,
            borderColor: focused ? palette.accent : palette.border,
            backgroundColor: palette.input,
            fontFamily: type.sans,
          },
        ]}
      />
    </View>
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
    paddingBottom: 24,
    gap: 22,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
  },
  months: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  month: {
    width: '22%',
    flexGrow: 1,
    borderRadius: 12,
    minHeight: 40,
  },
  dateField: {
    flex: 1,
    gap: 6,
  },
  dateLabel: {
    fontSize: 13,
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
