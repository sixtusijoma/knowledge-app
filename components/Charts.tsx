import { useRef, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { formatCount, formatEntries, formatPercent } from '@/lib/format';
import type { MonthBucket, Stats } from '@/lib/stats';
import { useTheme, useType } from '@/lib/theme';

const SLOT = 36;
const BAR = 14;
const PLOT = 136;

export function MonthChart({ stats }: { stats: Stats }) {
  const { palette } = useTheme();
  const type = useType();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const didScroll = useRef(false);
  const months = stats.months;
  const max = months.reduce((peak, month) => Math.max(peak, month.x + month.grok), 0);
  const width = Math.max(months.length * SLOT, SLOT);

  return (
    <View
      testID="stats-months"
      accessibilityLabel={`Entries per month. ${stats.monthSeriesLabel}`}
    >
      <View style={styles.legend}>
        <LegendDot color={palette.xBar} label="X bookmarks" />
        <LegendDot color={palette.grokBar} label="Grok chats" />
        <Text style={[styles.max, { color: palette.textMuted, fontFamily: type.sans }]}>
          {max > 0 ? `max ${formatCount(max)}` : 'no dated entries'}
        </Text>
      </View>
      {months.length === 0 ? (
        <Text style={[styles.empty, { color: palette.textSecondary, fontFamily: type.sans }]}>
          No dated entries yet.
        </Text>
      ) : (
        <ScrollView
          horizontal
          ref={scroller}
          showsHorizontalScrollIndicator
          onContentSizeChange={() => {
            if (didScroll.current) {
              return;
            }
            didScroll.current = true;
            scroller.current?.scrollToEnd({ animated: false });
          }}
        >
          <View>
            <Svg width={width} height={PLOT}>
              <Line
                x1={0}
                y1={8}
                x2={width}
                y2={8}
                stroke={palette.border}
                strokeDasharray="3 4"
                strokeWidth={1}
              />
              <Line x1={0} y1={PLOT - 0.5} x2={width} y2={PLOT - 0.5} stroke={palette.border} strokeWidth={1} />
              {months.map((month, index) => (
                <MonthBars key={month.month} month={month} index={index} max={Math.max(max, 1)} />
              ))}
            </Svg>
            <View style={[styles.labels, { width }]}>
              {months.map((month) => (
                <View key={month.month} style={styles.labelSlot}>
                  <Text style={[styles.monthLabel, { color: palette.textMuted, fontFamily: type.sans }]}>
                    {month.shortLabel}
                  </Text>
                  <Text style={[styles.yearLabel, { color: palette.textMuted, fontFamily: type.sans }]}>
                    {month.showYear ? month.yearLabel : ' '}
                  </Text>
                </View>
              ))}
            </View>
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

function MonthBars({ month, index, max }: { month: MonthBucket; index: number; max: number }) {
  const { palette } = useTheme();
  const total = month.x + month.grok;
  let barHeight = 0;
  if (total > 0) {
    barHeight = Math.max(3, (total / max) * (PLOT - 16));
  }
  const gap = month.x > 0 && month.grok > 0 ? 1.5 : 0;
  const inner = Math.max(barHeight - gap, 0);
  const xDraw = total === 0 ? 0 : (month.x / total) * inner;
  const grokDraw = inner - xDraw;
  const xPos = index * SLOT + (SLOT - BAR) / 2;
  const grokY = PLOT - grokDraw;
  const xY = grokY - gap - xDraw;
  return (
    <G>
      {grokDraw > 0 ? (
        <Rect x={xPos} y={grokY} width={BAR} height={grokDraw} rx={2} fill={palette.grokBar} />
      ) : null}
      {xDraw > 0 ? <Rect x={xPos} y={xY} width={BAR} height={xDraw} rx={2} fill={palette.xBar} /> : null}
    </G>
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

export function SourceSplit({ stats }: { stats: Stats }) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View>
      <View style={[styles.track, { backgroundColor: palette.chip }]}>
        {stats.x > 0 ? <View style={{ flex: stats.x, backgroundColor: palette.xBar }} /> : null}
        {stats.grok > 0 ? <View style={{ flex: stats.grok, backgroundColor: palette.grokBar }} /> : null}
      </View>
      <View style={styles.splitRow}>
        <View>
          <Text style={[styles.splitValue, { color: palette.text, fontFamily: type.serif }]}>
            {formatCount(stats.x)}
          </Text>
          <Text style={[styles.splitLabel, { color: palette.textMuted, fontFamily: type.sans }]}>
            {`X bookmarks · ${formatPercent(stats.x, stats.total)}`}
          </Text>
        </View>
        <View style={styles.splitRight}>
          <Text style={[styles.splitValue, { color: palette.text, fontFamily: type.serif }]}>
            {formatCount(stats.grok)}
          </Text>
          <Text style={[styles.splitLabel, { color: palette.textMuted, fontFamily: type.sans }]}>
            {`Grok chats · ${formatPercent(stats.grok, stats.total)}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
  testID: string;
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

export function ImportanceDonut({ stats }: { stats: Stats }) {
  const { palette } = useTheme();
  const type = useType();
  const slices: Slice[] = [
    { key: 'high', label: 'High', value: stats.importance.high, color: palette.high, testID: 'stats-importance-high' },
    {
      key: 'medium',
      label: 'Medium',
      value: stats.importance.medium,
      color: palette.medium,
      testID: 'stats-importance-medium',
    },
    { key: 'low', label: 'Low', value: stats.importance.low, color: palette.low, testID: 'stats-importance-low' },
  ];
  if (stats.importance.unset > 0) {
    slices.push({
      key: 'unset',
      label: 'Unset',
      value: stats.importance.unset,
      color: palette.unset,
      testID: 'stats-importance-unset',
    });
  }
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const size = 132;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
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

  return (
    <View style={styles.donutRow}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={cx} cy={cy} r={radius} stroke={palette.chip} strokeWidth={stroke} fill="none" />
          {arcs.map((arc) => (
            <Path
              key={arc.key}
              d={arc.d}
              stroke={arc.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
        </Svg>
        <Text style={[styles.donutTotal, { color: palette.text, fontFamily: type.serif }]}>{formatCount(total)}</Text>
        <Text style={{ color: palette.textMuted, fontFamily: type.sans, fontSize: 11 }}>entries</Text>
      </View>
      <View style={styles.donutLegend}>
        {slices.map((slice) => (
          <View key={slice.key} style={styles.legendLine}>
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <Text style={[styles.legendName, { color: palette.text, fontFamily: type.sansMedium }]}>{slice.label}</Text>
            <Text
              testID={slice.testID}
              style={[styles.legendCount, { color: palette.textSecondary, fontFamily: type.sans }]}
            >
              {formatCount(slice.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TopicBars({ stats }: { stats: Stats }) {
  const { palette } = useTheme();
  const type = useType();
  const max = stats.topics.reduce((peak, topic) => Math.max(peak, topic.count), 0);
  if (stats.topics.length === 0) {
    return (
      <Text style={{ color: palette.textSecondary, fontFamily: type.sans }}>No topics yet.</Text>
    );
  }
  return (
    <View style={styles.topics}>
      {stats.topics.map((topic) => {
        const width = max === 0 ? 0 : Math.max(2, (topic.count / max) * 100);
        return (
          <View key={topic.topic} style={styles.topicRow}>
            <View style={styles.topicMeta}>
              <Text style={[styles.topicName, { color: palette.text, fontFamily: type.sansMedium }]}>{topic.topic}</Text>
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
          </View>
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
  labels: {
    flexDirection: 'row',
  },
  labelSlot: {
    width: SLOT,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 10,
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
    marginTop: 14,
    gap: 12,
  },
  splitRight: {
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
  donutTotal: {
    fontSize: 22,
  },
  donutLegend: {
    flex: 1,
    gap: 10,
  },
  legendLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 12,
  },
  topicRow: {
    gap: 6,
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
