import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { formatMonthKey } from '@/lib/dates';
import { formatCount, formatEntries, formatPercent, segmentSummary } from '@/lib/format';
import type { MonthBucket, Stats } from '@/lib/stats';
import { useTheme, useType } from '@/lib/theme';
import type { Importance, Source } from '@/lib/types';

const SLOT = 44;
const BAR = 16;
const PLOT = 136;
const LONG_PRESS = 480;
const DONUT = 132;
const DONUT_STROKE = 16;

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

type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
  testID: string;
  importance: Importance | null;
};

function ringPoint(cx: number, cy: number, radius: number, turns: number) {
  const angle = (turns - 0.25) * Math.PI * 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function donutPaths(cx: number, cy: number, radius: number, start: number, sweep: number) {
  if (sweep <= 0) {
    return [];
  }
  const segments = sweep >= 0.999 ? [0.5, sweep - 0.5] : [sweep];
  let cursor = start;
  return segments.map((segment) => {
    const from = ringPoint(cx, cy, radius, cursor);
    const to = ringPoint(cx, cy, radius, cursor + segment);
    const large = segment > 0.5 ? 1 : 0;
    cursor += segment;
    return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y}`;
  });
}

function turnsFromTouch(event: GestureResponderEvent): number | null {
  const native = event.nativeEvent as GestureResponderEvent['nativeEvent'] & {
    offsetX?: number;
    offsetY?: number;
  };
  const x = typeof native.locationX === 'number' ? native.locationX : native.offsetX;
  const y = typeof native.locationY === 'number' ? native.locationY : native.offsetY;
  if (typeof x !== 'number' || typeof y !== 'number') {
    return null;
  }
  const cx = DONUT / 2;
  const cy = DONUT / 2;
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.hypot(dx, dy);
  const radius = (DONUT - DONUT_STROKE) / 2;
  if (distance < radius - DONUT_STROKE || distance > radius + DONUT_STROKE) {
    return null;
  }
  let turns = Math.atan2(dy, dx) / (Math.PI * 2) + 0.25;
  if (turns < 0) {
    turns += 1;
  }
  return turns;
}

function sliceAt(turns: number, slices: Slice[], total: number): Slice | null {
  if (total <= 0) {
    return null;
  }
  let cursor = 0;
  for (const slice of slices) {
    const fraction = slice.value / total;
    if (slice.value > 0 && turns >= cursor && turns < cursor + fraction) {
      return slice;
    }
    cursor += fraction;
  }
  return null;
}

export function ImportanceDonut({
  stats,
  selected,
  onToggle,
  onInspect,
}: {
  stats: Stats;
  selected: Importance | null;
  onToggle: (importance: Importance) => void;
  onInspect: Inspect;
}) {
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const point = useRef<GestureResponderEvent | null>(null);
  const { palette } = useTheme();
  const type = useType();
  const slices: Slice[] = [
    {
      key: 'high',
      label: 'High',
      value: stats.importance.high,
      color: palette.high,
      testID: 'stats-importance-high',
      importance: 'High',
    },
    {
      key: 'medium',
      label: 'Medium',
      value: stats.importance.medium,
      color: palette.medium,
      testID: 'stats-importance-medium',
      importance: 'Medium',
    },
    {
      key: 'low',
      label: 'Low',
      value: stats.importance.low,
      color: palette.low,
      testID: 'stats-importance-low',
      importance: 'Low',
    },
  ];
  if (stats.importance.unset > 0) {
    slices.push({
      key: 'unset',
      label: 'Unset',
      value: stats.importance.unset,
      color: palette.unset,
      testID: 'stats-importance-unset',
      importance: null,
    });
  }
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (DONUT - DONUT_STROKE) / 2;
  const cx = DONUT / 2;
  const cy = DONUT / 2;
  let consumed = 0;
  const arcs = slices.flatMap((slice) => {
    const fraction = total === 0 ? 0 : slice.value / total;
    const gap = fraction > 0.035 ? 0.012 : 0;
    const sweep = Math.max(fraction - gap, 0);
    const start = consumed;
    consumed += fraction;
    return donutPaths(cx, cy, radius, start, sweep).map((d, index) => ({
      key: index === 0 ? slice.key : `${slice.key}-${index}`,
      color: slice.color,
      d,
    }));
  });

  function choose(slice: Slice, inspectOnly: boolean) {
    onInspect(segmentSummary(slice.label, slice.value, total));
    if (inspectOnly || !slice.importance) {
      return;
    }
    onToggle(slice.importance);
  }

  function fromEvent(event: GestureResponderEvent, inspectOnly: boolean) {
    const turns = turnsFromTouch(event);
    if (turns === null) {
      return;
    }
    const slice = sliceAt(turns, slices, total);
    if (!slice) {
      return;
    }
    choose(slice, inspectOnly);
  }

  return (
    <View style={styles.donutRow}>
      <Pressable
        testID="stats-donut"
        accessibilityRole="button"
        accessibilityLabel="Importance chart"
        delayLongPress={LONG_PRESS}
        onPressIn={(event) => {
          held.current = false;
          point.current = event;
          if (timer.current) {
            clearTimeout(timer.current);
          }
          timer.current = setTimeout(() => {
            held.current = true;
            if (point.current) {
              fromEvent(point.current, true);
            }
          }, LONG_PRESS);
        }}
        onPressOut={() => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
        }}
        onPress={(event) => {
          if (held.current) {
            held.current = false;
            return;
          }
          fromEvent(event, false);
        }}
        onLongPress={(event) => {
          if (held.current) {
            return;
          }
          held.current = true;
          fromEvent(event, true);
        }}
        style={({ pressed }) => [{ width: DONUT, height: DONUT, opacity: pressed ? 0.82 : 1 }]}
      >
        <Svg width={DONUT} height={DONUT} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Circle cx={cx} cy={cy} r={radius} stroke={palette.chip} strokeWidth={DONUT_STROKE} fill="none" />
          {arcs.map((arc) => (
            <Path
              key={arc.key}
              d={arc.d}
              stroke={arc.color}
              strokeWidth={DONUT_STROKE}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
        </Svg>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.donutCenter]}>
          <Text style={[styles.donutTotal, { color: palette.text, fontFamily: type.serif }]}>{formatCount(total)}</Text>
          <Text style={{ color: palette.textMuted, fontFamily: type.sans, fontSize: 11 }}>entries</Text>
        </View>
      </Pressable>
      <View style={styles.donutLegend}>
        {slices.map((slice) => {
          const isSelected = slice.importance !== null && selected === slice.importance;
          return (
            <Holdable
              key={slice.key}
              testID={`stats-slice-${slice.key}`}
              accessibilityRole="button"
              accessibilityLabel={`${slice.label}. ${formatEntries(slice.value)}.`}
              accessibilityState={{ selected: isSelected }}
              onCommit={() => {
                choose(slice, false);
              }}
              onHold={() => {
                choose(slice, true);
              }}
              style={({ pressed }) => [
                styles.legendLine,
                {
                  opacity: pressed ? 0.72 : 1,
                  backgroundColor: isSelected ? palette.chip : 'transparent',
                  borderColor: isSelected ? palette.accent : 'transparent',
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: slice.color }]} />
              <Text style={[styles.legendName, { color: palette.text, fontFamily: type.sansMedium }]}>
                {slice.label}
              </Text>
              <Text
                testID={slice.testID}
                style={[styles.legendCount, { color: palette.textSecondary, fontFamily: type.sans }]}
              >
                {formatCount(slice.value)}
              </Text>
            </Holdable>
          );
        })}
      </View>
    </View>
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
              <Text
                numberOfLines={1}
                style={[styles.topicName, { color: palette.text, fontFamily: type.sansMedium }]}
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
              <View style={[styles.topicFill, { width: `${width}%`, backgroundColor: palette.accent }]} />
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
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotal: {
    fontSize: 22,
  },
  donutLegend: {
    flex: 1,
    gap: 6,
  },
  legendLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  legendName: {
    flex: 1,
    fontSize: 14,
  },
  legendCount: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
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
