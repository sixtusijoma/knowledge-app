import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityChart } from '@/components/ActivityChart';
import { PrimaryButton } from '@/components/Buttons';
import { DateRangeField } from '@/components/DateRangeField';
import { MonthChart, SourceSplit, TopicBars } from '@/components/Charts';
import { CloseIcon } from '@/components/Icons';
import { Banner, ErrorState, StatsSkeleton } from '@/components/StateViews';
import {
  activityCallout,
  bucketBounds,
  bucketsFromRows,
  clipRange,
  defaultActivityUnit,
  type ActivityBucket,
  type ActivityUnit,
} from '@/lib/activity';
import { formatClock, formatMonthKey } from '@/lib/dates';
import { useFeedFilters } from '@/lib/feed-filters';
import { EMPTY_FILTERS, rangeLabel, resolveDateRange, type DateRange } from '@/lib/filters';
import { formatCount, formatEntries, sourcePlural } from '@/lib/format';
import {
  appliedStatsRange,
  chartSelectionActive,
  EMPTY_SELECTION,
  filteredStats,
  filtersFromStats,
  toggleSelection,
  withSelectedTopic,
  type RangePreset,
  type Stats,
  type StatsSelection,
} from '@/lib/stats';
import { isSampleMode } from '@/lib/sample-mode';
import { useTheme, useType } from '@/lib/theme';
import type { Source } from '@/lib/types';
import { useActivity } from '@/lib/use-activity';
import { useStats } from '@/lib/use-stats';

const PRESETS: { id: RangePreset; label: string; testID: string }[] = [
  { id: 'all', label: 'All time', testID: 'stats-range-all' },
  { id: '7', label: '7 days', testID: 'stats-range-7' },
  { id: '30', label: '30 days', testID: 'stats-range-30' },
  { id: '90', label: '90 days', testID: 'stats-range-90' },
  { id: 'year', label: 'This year', testID: 'stats-range-year' },
  { id: 'custom', label: 'Custom', testID: 'stats-range-custom' },
];

export default function StatsScreen() {
  const { palette } = useTheme();
  const type = useType();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { applyFilters } = useFeedFilters();
  const { rows, updatedAt, loading, refreshing, error, refresh, retry } = useStats();
  const [now] = useState(() => new Date());
  const [selection, setSelection] = useState<StatsSelection>(EMPTY_SELECTION);
  const [preset, setPreset] = useState<RangePreset>('all');
  const [unit, setUnit] = useState<ActivityUnit>('month');
  const [draftFrom, setDraftFrom] = useState<string | null>(null);
  const [draftTo, setDraftTo] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openTimer.current) {
        clearTimeout(openTimer.current);
      }
    };
  }, []);

  const views = useMemo(() => {
    if (!rows || !updatedAt) {
      return null;
    }
    const applied = appliedStatsRange(preset, now, draftFrom, draftTo);
    const totals = filteredStats(rows, selection, applied.range, null, now);
    const months = filteredStats(rows, selection, applied.range, 'month', now);
    const sources = filteredStats(rows, selection, applied.range, 'source', now);
    const topics = withSelectedTopic(
      filteredStats(rows, selection, applied.range, 'topic', now),
      selection.topic,
    );
    return { ...applied, totals, months, sources, topics };
  }, [rows, updatedAt, preset, draftFrom, draftTo, selection, now]);

  const activityLimit = useMemo(() => {
    const applied = appliedStatsRange(preset, now, draftFrom, draftTo);
    return resolveDateRange({
      ...EMPTY_FILTERS,
      from: applied.range.from,
      to: applied.range.to,
      month: selection.month,
    });
  }, [preset, now, draftFrom, draftTo, selection.month]);

  const activity = useActivity({
    unit,
    range: activityLimit,
    source: selection.source,
    topic: selection.topic,
  });
  const phoneBuckets = useMemo(() => {
    if (activity.buckets || !activity.error || !rows) {
      return null;
    }
    return bucketsFromRows(rows, unit, activityLimit, selection.source, selection.topic);
  }, [activity.buckets, activity.error, rows, unit, activityLimit, selection.source, selection.topic]);
  const shownActivity = {
    buckets: activity.buckets ?? phoneBuckets,
    loading: activity.loading && phoneBuckets === null,
    error: phoneBuckets ? null : activity.error,
    retry: activity.retry,
    sourceLabel: activitySourceLabel(Boolean(activity.buckets), Boolean(phoneBuckets)),
  };

  const chartOn = chartSelectionActive(selection);
  const rangeChip = views ? rangeChipLabel(preset, views.range) : null;

  function choosePreset(next: RangePreset) {
    if (next !== preset) {
      setUnit(defaultActivityUnit(next));
    }
    setPreset(next);
    setTooltip(null);
  }

  function clearRange() {
    setPreset('all');
    setDraftFrom(null);
    setDraftTo(null);
    setTooltip(null);
  }

  function clearAll() {
    setSelection(EMPTY_SELECTION);
    clearRange();
  }

  function openFeed() {
    if (!views) {
      return;
    }
    applyFilters(filtersFromStats(selection, views.range));
    router.navigate('/');
  }

  function inspectBucket(bucket: ActivityBucket) {
    setTooltip(activityCallout(unit, bucket, activityLimit));
  }

  function openBucket(bucket: ActivityBucket) {
    const bounds = clipRange(bucketBounds(unit, bucket.bucket), activityLimit);
    inspectBucket(bucket);
    if (openTimer.current) {
      clearTimeout(openTimer.current);
    }
    openTimer.current = setTimeout(() => {
      applyFilters({
        source: selection.source ?? 'all',
        topics: selection.topic ? [selection.topic] : [],
        month: null,
        from: bounds.from,
        to: bounds.to,
      });
      router.navigate('/');
    }, 700);
  }

  const rangeActive = Boolean(views && (views.range.from || views.range.to));
  let deck = 'Live counts from every saved entry.';
  if (isSampleMode()) {
    deck = 'Counts from the sample library.';
  }
  if (rangeActive) {
    deck = 'Every chart is limited to this date range.';
  }

  return (
    <ScrollView
      testID="stats-screen"
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            refresh().catch(() => undefined);
          }}
          tintColor={palette.accent}
          colors={[palette.accent]}
          progressBackgroundColor={palette.card}
        />
      }
    >
      <Text style={[styles.kicker, { color: palette.textMuted, fontFamily: type.sans }]}>Library</Text>
      <Text style={[styles.title, { color: palette.text, fontFamily: type.serifItalic }]}>Stats</Text>
      <Text style={[styles.deck, { color: palette.textSecondary, fontFamily: type.sans }]}>{deck}</Text>

      <View style={styles.presets}>
        {PRESETS.map((item) => (
          <PresetPill
            key={item.id}
            label={item.label}
            testID={item.testID}
            selected={preset === item.id}
            onPress={() => {
              choosePreset(item.id);
            }}
          />
        ))}
      </View>
      {views ? (
        <Text
          testID="stats-range-label"
          accessibilityLabel={rangeAccessLabel(views.range)}
          style={[styles.rangeLabel, { color: palette.textMuted, fontFamily: type.sans }]}
        >
          {describeRange(views.range)}
        </Text>
      ) : null}
      {preset === 'custom' ? (
        <View style={styles.dates}>
          <DateRangeField
            label="From"
            testID="stats-from"
            value={draftFrom}
            onChange={(value) => {
              setDraftFrom(value);
              setTooltip(null);
            }}
          />
          <DateRangeField
            label="To"
            testID="stats-to"
            value={draftTo}
            onChange={(value) => {
              setDraftTo(value);
              setTooltip(null);
            }}
          />
        </View>
      ) : null}
      {views?.hint ? (
        <Text testID="stats-range-hint" style={[styles.hint, { color: palette.danger, fontFamily: type.sans }]}>
          {views.hint}
        </Text>
      ) : null}

      {rangeChip || chartOn ? (
        <View style={styles.chips}>
          {rangeChip ? (
            <Chip
              testID="stats-chip-range"
              label={rangeChip}
              onPress={clearRange}
            />
          ) : null}
          {selection.source ? (
            <Chip
              testID="stats-chip-source"
              label={sourcePlural(selection.source)}
              onPress={() => {
                setSelection({ ...selection, source: null });
                setTooltip(null);
              }}
            />
          ) : null}
          {selection.topic ? (
            <Chip
              testID="stats-chip-topic"
              label={selection.topic}
              onPress={() => {
                setSelection({ ...selection, topic: null });
                setTooltip(null);
              }}
            />
          ) : null}
          {selection.month ? (
            <Chip
              testID="stats-chip-month"
              label={formatMonthKey(selection.month)}
              onPress={() => {
                setSelection({ ...selection, month: null });
                setTooltip(null);
              }}
            />
          ) : null}
          <Pressable
            testID="stats-clear"
            onPress={clearAll}
            accessibilityRole="button"
            accessibilityLabel="Clear all"
            style={styles.clear}
          >
            <Text style={{ color: palette.accent, fontFamily: type.sansSemibold, fontSize: 13 }}>Clear all</Text>
          </Pressable>
        </View>
      ) : null}
      {chartOn ? (
        <Text testID="stats-cross-note" style={[styles.note, { color: palette.textSecondary, fontFamily: type.sans }]}>
          The chart you tapped stays open. Totals and the other charts follow the chips.
        </Text>
      ) : null}
      {tooltip ? (
        <View style={[styles.tooltip, { backgroundColor: palette.card, borderColor: palette.accent }]}>
          <Text testID="stats-tooltip" style={{ color: palette.text, fontFamily: type.sansMedium, fontSize: 14 }}>
            {tooltip}
          </Text>
        </View>
      ) : null}

      <PrimaryButton
        testID="stats-see-entries"
        label="See entries"
        disabled={!views}
        accessibilityLabel={views ? `See ${formatEntries(views.totals.total)}` : 'See entries'}
        onPress={openFeed}
      />

      {error && rows ? (
        <Banner
          message={error}
          busy={refreshing}
          onRetry={() => {
            refresh().catch(() => undefined);
          }}
        />
      ) : null}
      {loading && !rows ? <StatsSkeleton /> : null}
      {!loading && error && !rows ? (
        <ErrorState
          title="Couldn’t load stats"
          message={error}
          onRetry={() => {
            retry().catch(() => undefined);
          }}
        />
      ) : null}
      {views ? (
        <StatsBody
          totals={views.totals}
          months={views.months}
          sources={views.sources}
          topics={views.topics}
          selection={selection}
          updatedAt={updatedAt}
          unit={unit}
          activityLimit={activityLimit}
          activity={shownActivity}
          onUnit={setUnit}
          onInspect={setTooltip}
          onInspectBucket={inspectBucket}
          onOpenBucket={openBucket}
          onToggleSource={(source) => {
            setSelection((current) => toggleSelection(current, 'source', source));
          }}
          onToggleTopic={(topic) => {
            setSelection((current) => toggleSelection(current, 'topic', topic));
          }}
          onToggleMonth={(month) => {
            setSelection((current) => toggleSelection(current, 'month', month));
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function updatedLabel(updatedAt: Date): string {
  if (isSampleMode()) {
    return 'Sample rows only. Nothing was loaded from Supabase.';
  }
  return `Counted from Supabase at ${formatClock(updatedAt)}`;
}

function activitySourceLabel(fromDatabase: boolean, fromPhone: boolean): string | null {
  if (fromDatabase) {
    if (isSampleMode()) {
      return 'Counted from the sample library.';
    }
    return 'Counted in the database.';
  }
  if (fromPhone) {
    return 'Counted on this phone.';
  }
  return null;
}

function rangeChipLabel(preset: RangePreset, range: DateRange): string | null {
  if (preset === 'all') {
    return null;
  }
  if (preset === '7') {
    return 'Last 7 days';
  }
  if (preset === '30') {
    return 'Last 30 days';
  }
  if (preset === '90') {
    return 'Last 90 days';
  }
  if (preset === 'year') {
    return 'This year';
  }
  if (!range.from && !range.to) {
    return 'Custom dates';
  }
  return rangeLabel(range);
}

function describeRange(range: DateRange): string {
  if (!range.from && !range.to) {
    return 'All dates';
  }
  return rangeLabel(range);
}

function rangeAccessLabel(range: DateRange): string {
  if (!range.from && !range.to) {
    return 'all';
  }
  return `${range.from ?? ''}..${range.to ?? ''}`;
}

function StatsBody({
  totals,
  months,
  sources,
  topics,
  selection,
  updatedAt,
  unit,
  activityLimit,
  activity,
  onUnit,
  onInspect,
  onInspectBucket,
  onOpenBucket,
  onToggleSource,
  onToggleTopic,
  onToggleMonth,
}: {
  totals: Stats;
  months: Stats;
  sources: Stats;
  topics: Stats;
  selection: StatsSelection;
  updatedAt: Date | null;
  unit: ActivityUnit;
  activityLimit: DateRange;
  activity: {
    buckets: ActivityBucket[] | null;
    loading: boolean;
    error: string | null;
    retry: () => void;
    sourceLabel: string | null;
  };
  onUnit: (unit: ActivityUnit) => void;
  onInspect: (text: string) => void;
  onInspectBucket: (bucket: ActivityBucket) => void;
  onOpenBucket: (bucket: ActivityBucket) => void;
  onToggleSource: (source: Source) => void;
  onToggleTopic: (topic: string) => void;
  onToggleMonth: (month: string) => void;
}) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View style={styles.body}>
      <View style={styles.tiles}>
        <Tile label="Entries" value={formatCount(totals.total)} testID="stats-total" />
        <Tile
          label="This month"
          value={formatCount(totals.thisMonth)}
          testID="stats-this-month"
          caption={totals.thisMonthLabel}
          captionTestID="stats-this-month-label"
        />
        <Tile label="X bookmarks" value={formatCount(totals.x)} testID="stats-x" />
        <Tile label="Grok chats" value={formatCount(totals.grok)} testID="stats-grok" />
      </View>
      <Panel
        eyebrow="Over time"
        title="Activity"
        note="Bookmarks use the post date. Chats use the chat date. Days with nothing saved are left off."
      >
        <ActivityChart
          buckets={activity.buckets}
          unit={unit}
          limit={activityLimit}
          loading={activity.loading}
          error={activity.error}
          sourceLabel={activity.sourceLabel}
          onUnit={onUnit}
          onRetry={activity.retry}
          onInspect={onInspectBucket}
          onOpen={onOpenBucket}
        />
      </Panel>
      <Panel
        eyebrow="By month"
        title="Entries"
        note={
          months.months.length > 8
            ? 'Dated entries, split by source. Swipe the chart for earlier months.'
            : 'Dated entries, split by source.'
        }
      >
        <MonthChart
          stats={months}
          selectedMonth={selection.month}
          onToggleMonth={onToggleMonth}
          onInspect={onInspect}
        />
      </Panel>
      <Panel eyebrow="Sources" title="Where they came from" note="Each entry has one source.">
        <SourceSplit
          stats={sources}
          selected={selection.source}
          onToggle={onToggleSource}
          onInspect={onInspect}
        />
      </Panel>
      <Panel
        eyebrow="Topics"
        title="What they cover"
        note="An entry can sit in more than one topic, so these counts can add up to more than the total."
      >
        <TopicBars stats={topics} selected={selection.topic} onToggle={onToggleTopic} onInspect={onInspect} />
      </Panel>
      {updatedAt ? (
        <Text testID="stats-updated" style={[styles.footnote, { color: palette.textMuted, fontFamily: type.sans }]}>
          {updatedLabel(updatedAt)}
        </Text>
      ) : null}
    </View>
  );
}

function PresetPill({
  label,
  testID,
  selected,
  onPress,
}: {
  label: string;
  testID: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? palette.accent : palette.chip,
          borderColor: selected ? palette.accent : palette.border,
          opacity: pressed ? 0.8 : 1,
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
}

function Chip({ label, testID, onPress }: { label: string; testID: string; onPress: () => void }) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label}`}
      style={[styles.chip, { backgroundColor: palette.chip, borderColor: palette.border }]}
    >
      <Text style={[styles.chipText, { color: palette.chipText, fontFamily: type.sansMedium }]}>{label}</Text>
      <CloseIcon color={palette.textMuted} size={12} />
    </Pressable>
  );
}

function Tile({
  label,
  value,
  testID,
  caption,
  captionTestID,
}: {
  label: string;
  value: string;
  testID: string;
  caption?: string;
  captionTestID?: string;
}) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View style={[styles.tile, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.tileLabel, { color: palette.textMuted, fontFamily: type.sansMedium }]}>{label}</Text>
      <Text testID={testID} style={[styles.tileValue, { color: palette.text, fontFamily: type.serif }]}>
        {value}
      </Text>
      {caption ? (
        <Text
          testID={captionTestID}
          style={[styles.tileCaption, { color: palette.textSecondary, fontFamily: type.sans }]}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function Panel({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.eyebrow, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>{eyebrow}</Text>
      <Text style={[styles.panelTitle, { color: palette.text, fontFamily: type.serif }]}>{title}</Text>
      {note ? <Text style={[styles.note, { color: palette.textSecondary, fontFamily: type.sans }]}>{note}</Text> : null}
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 10,
  },
  kicker: {
    fontSize: 13,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    marginTop: 2,
  },
  deck: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeLabel: {
    fontSize: 13,
  },
  dates: {
    flexDirection: 'row',
    gap: 8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
  },
  clear: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tooltip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    gap: 12,
    marginTop: 6,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 96,
  },
  tileLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  tileValue: {
    fontSize: 30,
    marginTop: 6,
  },
  tileCaption: {
    fontSize: 12,
    marginTop: 2,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  panelTitle: {
    fontSize: 22,
    marginTop: 4,
  },
  panelBody: {
    marginTop: 14,
  },
  footnote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
