import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { SportsIcon } from '@/components/Icons';
import { formatMonthKey } from '@/lib/dates';
import { formatCount, formatEntries, formatPercent, segmentSummary } from '@/lib/format';
import type { MonthBucket, Stats } from '@/lib/stats';
import { useTheme, useType } from '@/lib/theme';
import { isSports } from '@/lib/topics';
import type { Source } from '@/lib/types';

const SLOT = 44;
const BAR = 16;
const PLOT = 136;
const LONG_PRESS = 480;

type Inspect = (text: string) => void;

function Holdable({
  onCommit,
  onHold,
  children,
  ...rest
}: {
  onCommit: () => void;
  onHold: () => void;
  children?: ReactNode;
} & Omit<PressableProps, 'onPress' | 'onLongPress' | 'children'>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  return (
    <Pressable
      {...rest}
      delayLongPress={LONG_PRESS}
      onPressIn={() => {
        held.current = false;
        if (timer.current) {
          clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => {
          held.current = true;
          onHold();
        }, LONG_PRESS);
      }}
      onPressOut={() => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
      }}
      onPress={() => {
        if (held.current) {
          held.current = false;
          return;
        }
        onCommit();
      }}
      onLongPress={() => {
        if (held.current) {
          return;
        }
        held.current = true;
        onHold();
      }}
    >
      {children}
    </Pressable>
  );
}

export function MonthChart({
  stats,
  selectedMonth,
  onToggleMonth,
  onInspect,
}: {
  stats: Stats;
  selectedMonth: string | null;
  onToggleMonth: (month: string) => void;
  onInspect: Inspect;
}) {
  const { palette } = useTheme();
  const type = useType();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const months = stats.months;
  const max = months.reduce((peak, month) => Math.max(peak, month.x + month.grok), 0);
  const series = stats.monthSeriesLabel;

  useEffect(() => {
    scroller.current?.scrollToEnd({ animated: false });
  }, [series]);

  return (
    <View testID="stats-months" accessibilityLabel={`Entries per month. ${series}`}>
      <View style={styles.legend}>
        <LegendDot color={palette.xBar} label="X bookmarks" />
        <LegendDot color={palette.grokBar} label="Grok chats" />
        <Text style={[styles.max, { color: palette.textMuted, fontFamily: type.sans }]}>
          {max > 0 ? `max ${formatCount(max)}` : 'no dated entries'}
        </Text>
      </View>
      {months.length === 0 ? (
        <Text testID="stats-months-empty" style={[styles.empty, { color: palette.textSecondary, fontFamily: type.sans }]}>
          {stats.total === 0 ? 'Nothing in this selection.' : 'No dated entries yet.'}
        </Text>
      ) : (
        <ScrollView
          horizontal
          ref={scroller}
          testID="stats-month-scroll"
          showsHorizontalScrollIndicator
          nestedScrollEnabled
        >
          <View style={styles.columns}>
            {months.map((month) => (
              <MonthColumn
                key={month.month}
                month={month}
                max={Math.max(max, 1)}
                selected={selectedMonth === month.month}
                totalEntries={stats.total}
                onToggle={onToggleMonth}
                onInspect={onInspect}
              />
            ))}
          </View>
        </ScrollView>
      )}
      {stats.peak ? (
        <Text testID="stats-peak" style={[styles.caption, { color: palette.textSecondary, fontFamily: type.sans }]}>
          {`Busiest month is ${stats.peak.label}, with ${formatEntries(stats.peak.count)}.`}
        </Text>
      ) : null}
      {stats.undated > 0 ? (
        <Text style={[styles.caption, { color: palette.textMuted, fontFamily: type.sans }]}>
          {`${formatCount(stats.undated)} entries have no date and are left off this chart.`}
        </Text>
      ) : null}
    </View>
  );
}

function MonthColumn({
  month,
  max,
  selected,
  totalEntries,
  onToggle,
  onInspect,
}: {
  month: MonthBucket;
  max: number;
  selected: boolean;
  totalEntries: number;
  onToggle: (month: string) => void;
  onInspect: Inspect;
}) {
  const { palette } = useTheme();
  const type = useType();
  const total = month.x + month.grok;
  let barHeight = 0;
  if (total > 0) {
    barHeight = Math.max(3, (total / max) * (PLOT - 16));
  }
  const gap = month.x > 0 && month.grok > 0 ? 1.5 : 0;
  const inner = Math.max(barHeight - gap, 0);
  const xDraw = total === 0 ? 0 : (month.x / total) * inner;
  const grokDraw = inner - xDraw;
  const label = formatMonthKey(month.month);
  const summary = segmentSummary(label, total, totalEntries);

  return (
    <Holdable
      testID={`stats-month-${month.month}`}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${formatEntries(total)}.`}
      accessibilityState={{ selected }}
      onCommit={() => {
        onInspect(summary);
        onToggle(month.month);
      }}
      onHold={() => {
        onInspect(summary);
      }}
      style={({ pressed }) => [
        styles.column,
        {
          backgroundColor: selected ? palette.chip : 'transparent',
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View style={styles.plot}>
        <View style={[styles.guide, { borderTopColor: palette.border }]} />
        <View style={[styles.baseline, { backgroundColor: palette.border }]} />
        <View style={styles.barStack}>
          {xDraw > 0 ? (
            <View style={{ height: xDraw, backgroundColor: palette.xBar, borderRadius: 2 }} />
          ) : null}
          {gap > 0 ? <View style={{ height: gap }} /> : null}
          {grokDraw > 0 ? (
            <View style={{ height: grokDraw, backgroundColor: palette.grokBar, borderRadius: 2 }} />
          ) : null}
        </View>
      </View>
      <Text
        style={[
          styles.monthLabel,
          { color: selected ? palette.accent : palette.textMuted, fontFamily: type.sans },
        ]}
      >
        {month.shortLabel}
      </Text>
      <Text style={[styles.yearLabel, { color: palette.textMuted, fontFamily: type.sans }]}>
        {month.showYear ? month.yearLabel : ' '}
      </Text>
    </Holdable>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={{ color: palette.textSecondary, fontFamily: type.sans, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function SourceSplit({
  stats,
  selected,
  onToggle,
  onInspect,
}: {
  stats: Stats;
  selected: Source | null;
  onToggle: (source: Source) => void;
  onInspect: Inspect;
}) {
  const { palette } = useTheme();
  return (
    <View>
      <View style={[styles.track, { backgroundColor: palette.chip }]}>
        {stats.x > 0 ? (
          <Holdable
            accessibilityRole="button"
            accessibilityLabel="X bookmarks bar"
            hitSlop={{ top: 10, bottom: 10 }}
            onCommit={() => {
              onInspect(segmentSummary('X bookmarks', stats.x, stats.total));
              onToggle('X Bookmark');
            }}
            onHold={() => {
              onInspect(segmentSummary('X bookmarks', stats.x, stats.total));
            }}
            style={{ flex: stats.x, backgroundColor: palette.xBar }}
          />
        ) : null}
        {stats.grok > 0 ? (
          <Holdable
            accessibilityRole="button"
            accessibilityLabel="Grok chats bar"
            hitSlop={{ top: 10, bottom: 10 }}
            onCommit={() => {
              onInspect(segmentSummary('Grok chats', stats.grok, stats.total));
              onToggle('Grok Chat');
            }}
            onHold={() => {
              onInspect(segmentSummary('Grok chats', stats.grok, stats.total));
            }}
            style={{ flex: stats.grok, backgroundColor: palette.grokBar }}
          />
        ) : null}
      </View>
      <View style={styles.splitRow}>
        <SourceChoice
          testID="stats-source-x"
          countID="stats-source-x-count"
          label="X bookmarks"
          source="X Bookmark"
          count={stats.x}
          total={stats.total}
          selected={selected === 'X Bookmark'}
          align="left"
          onToggle={onToggle}
          onInspect={onInspect}
        />
        <SourceChoice
          testID="stats-source-grok"
          countID="stats-source-grok-count"
          label="Grok chats"
          source="Grok Chat"
          count={stats.grok}
          total={stats.total}
          selected={selected === 'Grok Chat'}
          align="right"
          onToggle={onToggle}
          onInspect={onInspect}
        />
      </View>
    </View>
  );
}

function SourceChoice({
  testID,
  countID,
  label,
  source,
  count,
  total,
  selected,
  align,
  onToggle,
  onInspect,
}: {
  testID: string;
  countID: string;
  label: string;
  source: Source;
  count: number;
  total: number;
  selected: boolean;
  align: 'left' | 'right';
  onToggle: (source: Source) => void;
  onInspect: Inspect;
}) {
  const { palette } = useTheme();
  const type = useType();
  const summary = segmentSummary(label, count, total);
  return (
    <Holdable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${formatEntries(count)}.`}
      accessibilityState={{ selected }}
      onCommit={() => {
        onInspect(summary);
        onToggle(source);
      }}
      onHold={() => {
        onInspect(summary);
      }}
      style={({ pressed }) => [
        styles.sourceButton,
        align === 'right' ? styles.sourceRight : null,
        {
          opacity: pressed ? 0.72 : 1,
          backgroundColor: selected ? palette.chip : 'transparent',
          borderColor: selected ? palette.accent : 'transparent',
        },
      ]}
    >
      <Text testID={countID} style={[styles.splitValue, { color: palette.text, fontFamily: type.serif }]}>
        {formatCount(count)}
      </Text>
      <Text style={[styles.splitLabel, { color: palette.textMuted, fontFamily: type.sans }]}>
        {`${label} · ${formatPercent(count, total)}`}
      </Text>
    </Holdable>
  );
}

export function TopicBars({
  stats,
  selected,
  onToggle,
  onInspect,
}: {
  stats: Stats;
  selected: string | null;
  onToggle: (topic: string) => void;
  onInspect: Inspect;
}) {
  const { palette } = useTheme();
  const type = useType();
  const max = stats.topics.reduce((peak, topic) => Math.max(peak, topic.count), 0);
  if (stats.topics.length === 0) {
    return (
      <Text testID="stats-topics-empty" style={{ color: palette.textSecondary, fontFamily: type.sans }}>
        {stats.total === 0 ? 'Nothing in this selection.' : 'No topics yet.'}
      </Text>
    );
  }
  return (
    <View style={styles.topics}>
      {stats.topics.map((topic) => {
        let width = 0;
        if (max > 0 && topic.count > 0) {
          width = Math.max(2, (topic.count / max) * 100);
        }
        const isSelected = selected === topic.topic;
        const summary = segmentSummary(topic.topic, topic.count, stats.total);
        const sports = isSports(topic.topic);
        const tone = sports ? palette.sports : palette.accent;
        return (
          <Holdable
            key={topic.topic}
            testID={`stats-topic-bar-${topic.topic}`}
            accessibilityRole="button"
            accessibilityLabel={`${topic.topic}. ${formatEntries(topic.count)}.`}
            accessibilityState={{ selected: isSelected }}
            onCommit={() => {
              onInspect(summary);
              onToggle(topic.topic);
            }}
            onHold={() => {
              onInspect(summary);
            }}
            style={({ pressed }) => [
              styles.topicRow,
              {
                opacity: pressed ? 0.72 : 1,
                backgroundColor: isSelected ? palette.chip : 'transparent',
                borderColor: isSelected ? palette.accent : 'transparent',
              },
            ]}
          >
            <View style={styles.topicMeta}>
              {sports ? <SportsIcon color={palette.sports} size={14} /> : null}
              <Text
                numberOfLines={1}
                style={[styles.topicName, { color: sports ? palette.sports : palette.text, fontFamily: type.sansMedium }]}
              >
                {topic.topic}
              </Text>
              <Text
                testID={`stats-topic-${topic.topic}`}
                style={[styles.topicCount, { color: palette.textSecondary, fontFamily: type.sans }]}
              >
                {formatCount(topic.count)}
              </Text>
            </View>
            <View style={[styles.topicTrack, { backgroundColor: palette.chip }]}>
              <View style={[styles.topicFill, { width: `${width}%`, backgroundColor: tone }]} />
            </View>
          </Holdable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  max: {
    marginLeft: 'auto',
    fontSize: 12,
  },
  columns: {
    flexDirection: 'row',
  },
  column: {
    width: SLOT,
    alignItems: 'center',
    borderRadius: 10,
  },
  plot: {
    height: PLOT,
    width: SLOT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  guide: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
  barStack: {
    width: BAR,
  },
  monthLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  yearLabel: {
    fontSize: 10,
    minHeight: 12,
  },
  caption: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    fontSize: 14,
  },
  track: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  sourceButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 64,
  },
  sourceRight: {
    alignItems: 'flex-end',
  },
  splitValue: {
    fontSize: 28,
  },
  splitLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  topics: {
    gap: 8,
  },
  topicRow: {
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  topicMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  topicName: {
    flex: 1,
    fontSize: 14,
  },
  topicCount: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  topicTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  topicFill: {
    height: 7,
    borderRadius: 4,
  },
});
