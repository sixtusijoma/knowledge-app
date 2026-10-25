import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  activityBucketLabel,
  activityCallout,
  type ActivityBucket,
  type ActivityUnit,
} from '@/lib/activity';
import type { DateRange } from '@/lib/filters';
import { formatCount } from '@/lib/format';
import { useTheme, useType } from '@/lib/theme';

const PLOT = 132;
const UNITS: { id: ActivityUnit; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export function ActivityChart({
  buckets,
  unit,
  limit,
  loading,
  error,
  sourceLabel,
  onUnit,
  onRetry,
  onInspect,
  onOpen,
}: {
  buckets: ActivityBucket[] | null;
  unit: ActivityUnit;
  limit: DateRange;
  loading: boolean;
  error: string | null;
  sourceLabel: string | null;
  onUnit: (unit: ActivityUnit) => void;
  onRetry: () => void;
  onInspect: (bucket: ActivityBucket) => void;
  onOpen: (bucket: ActivityBucket) => void;
}) {
  const { palette } = useTheme();
  const type = useType();
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [showChats, setShowChats] = useState(true);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const rows = buckets ?? [];
  const bookmarks = rows.reduce((sum, row) => sum + row.bookmarks, 0);
  const chats = rows.reduce((sum, row) => sum + row.chats, 0);
  const signature = rows.length > 0 ? `${unit}:${rows[0]?.bucket}:${rows[rows.length - 1]?.bucket}:${rows.length}` : unit;

  useEffect(() => {
    scroller.current?.scrollToEnd({ animated: false });
  }, [signature]);

  return (
    <View testID="stats-activity">
      <View style={styles.units}>
        {UNITS.map((item) => {
          const selected = unit === item.id;
          return (
            <Pressable
              key={item.id}
              testID={`stats-activity-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              aria-selected={selected}
              onPress={() => {
                onUnit(item.id);
              }}
              style={[
                styles.unit,
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
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <SeriesToggle
          testID="stats-activity-bookmarks-toggle"
          label="Bookmarks"
          color={palette.xBar}
          selected={showBookmarks}
          onPress={() => {
            setShowBookmarks((current) => !current);
          }}
        />
        <SeriesToggle
          testID="stats-activity-chats-toggle"
          label="Chats"
          color={palette.grokBar}
          selected={showChats}
          onPress={() => {
            setShowChats((current) => !current);
          }}
        />
      </View>
      {sourceLabel ? (
        <Text testID="stats-activity-source" style={[styles.totals, { color: palette.textMuted, fontFamily: type.sans }]}>
          {sourceLabel}
        </Text>
      ) : null}
      {buckets ? (
        <Text style={[styles.totals, { color: palette.textSecondary, fontFamily: type.sans }]}>
          <Text testID="stats-activity-bookmarks">{formatCount(bookmarks)}</Text>
          {' bookmarks · '}
          <Text testID="stats-activity-chats">{formatCount(chats)}</Text>
          {' chats'}
        </Text>
      ) : null}
      {loading && !buckets ? (
        <Text testID="stats-activity-loading" style={[styles.status, { color: palette.textMuted, fontFamily: type.sans }]}>
          Counting this range…
        </Text>
      ) : null}
      {error ? (
        <View style={styles.errorRow}>
          <Text testID="stats-activity-error" style={[styles.status, { color: palette.danger, fontFamily: type.sans }]}>
            {error}
          </Text>
          <Pressable testID="stats-activity-retry" accessibilityRole="button" onPress={onRetry}>
            <Text style={{ color: palette.accent, fontFamily: type.sansSemibold, fontSize: 14 }}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      {buckets && buckets.length === 0 ? (
        <Text testID="stats-activity-empty" style={[styles.status, { color: palette.textSecondary, fontFamily: type.sans }]}>
          No dated entries in this range.
        </Text>
      ) : null}
      {buckets && buckets.length > 0 && !showBookmarks && !showChats ? (
        <Text testID="stats-activity-hidden" style={[styles.status, { color: palette.textSecondary, fontFamily: type.sans }]}>
          Both series are hidden. Tap a legend item to bring one back.
        </Text>
      ) : null}
      {buckets && buckets.length > 0 && (showBookmarks || showChats) ? (
        <ScrollView
          horizontal
          ref={scroller}
          testID="stats-activity-scroll"
          showsHorizontalScrollIndicator
          nestedScrollEnabled
        >
          <View style={styles.columns}>
            {buckets.map((bucket, index) => (
              <ActivityColumn
                key={bucket.bucket}
                bucket={bucket}
                unit={unit}
                limit={limit}
                index={index}
                last={buckets.length - 1}
                max={visibleMax(buckets, showBookmarks, showChats)}
                showBookmarks={showBookmarks}
                showChats={showChats}
                onInspect={onInspect}
                onOpen={onOpen}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function visibleMax(buckets: ActivityBucket[], showBookmarks: boolean, showChats: boolean): number {
  let max = 0;
  for (const bucket of buckets) {
    if (showBookmarks) {
      max = Math.max(max, bucket.bookmarks);
    }
    if (showChats) {
      max = Math.max(max, bucket.chats);
    }
  }
  return Math.max(max, 1);
}

function SeriesToggle({
  testID,
  label,
  color,
  selected,
  onPress,
}: {
  testID: string;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-selected={selected}
      accessibilityLabel={`${selected ? 'Hide' : 'Show'} ${label}`}
      onPress={onPress}
      style={[styles.series, { opacity: selected ? 1 : 0.4 }]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={{ color: palette.text, fontFamily: type.sansMedium, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function ActivityColumn({
  bucket,
  unit,
  limit,
  index,
  last,
  max,
  showBookmarks,
  showChats,
  onInspect,
  onOpen,
}: {
  bucket: ActivityBucket;
  unit: ActivityUnit;
  limit: DateRange;
  index: number;
  last: number;
  max: number;
  showBookmarks: boolean;
  showChats: boolean;
  onInspect: (bucket: ActivityBucket) => void;
  onOpen: (bucket: ActivityBucket) => void;
}) {
  const { palette } = useTheme();
  const type = useType();
  const label = activityBucketLabel(unit, bucket.bucket, index, last);
  const summary = activityCallout(unit, bucket, limit);
  const bookmarkHeight = showBookmarks && bucket.bookmarks > 0 ? Math.max(3, (bucket.bookmarks / max) * (PLOT - 16)) : 0;
  const chatHeight = showChats && bucket.chats > 0 ? Math.max(3, (bucket.chats / max) * (PLOT - 16)) : 0;

  return (
    <Pressable
      testID={`stats-activity-${bucket.bucket}`}
      accessibilityRole="button"
      accessibilityLabel={summary}
      onPress={() => {
        onOpen(bucket);
      }}
      onLongPress={() => {
        onInspect(bucket);
      }}
      delayLongPress={480}
      style={({ pressed }) => [styles.column, { opacity: pressed ? 0.72 : 1 }]}
    >
      <View style={styles.plot}>
        <View style={[styles.baseline, { backgroundColor: palette.border }]} />
        <View style={styles.bars}>
          {showBookmarks ? <View style={[styles.bar, { height: bookmarkHeight, backgroundColor: palette.xBar }]} /> : null}
          {showChats ? <View style={[styles.bar, { height: chatHeight, backgroundColor: palette.grokBar }]} /> : null}
        </View>
      </View>
      <Text style={[styles.primary, { color: palette.textMuted, fontFamily: type.sans }]}>{label.primary}</Text>
      <Text style={[styles.secondary, { color: palette.textMuted, fontFamily: type.sans }]}>{label.secondary}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  units: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  unit: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  series: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  totals: {
    fontSize: 13,
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorRow: {
    gap: 8,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    width: 36,
    alignItems: 'center',
  },
  plot: {
    height: PLOT,
    width: 36,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  baseline: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 0,
    height: 1,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  primary: {
    fontSize: 10,
    marginTop: 4,
  },
  secondary: {
    fontSize: 10,
    minHeight: 12,
  },
});
