import { addDays, formatMonthKey, isoDate, monthKeyFromDate, nextMonth, shortMonth, shortYear } from '@/lib/dates';
import { customRange, EMPTY_FILTERS, rangeHint, type DateRange } from '@/lib/filters';
import type { ItemFilters, Source, StatRow } from '@/lib/types';

export type MonthBucket = {
  month: string;
  shortLabel: string;
  yearLabel: string;
  showYear: boolean;
  x: number;
  grok: number;
};

export type TopicBucket = {
  topic: string;
  count: number;
};

export type Stats = {
  total: number;
  x: number;
  grok: number;
  undated: number;
  topics: TopicBucket[];
  months: MonthBucket[];
  thisMonth: number;
  thisMonthKey: string;
  thisMonthLabel: string;
  peak: { label: string; count: number } | null;
  monthSeriesLabel: string;
};

function emptyBucket(): { x: number; grok: number } {
  return { x: 0, grok: 0 };
}

export function buildStats(rows: StatRow[], now: Date): Stats {
  let x = 0;
  let grok = 0;
  let undated = 0;
  const topicCounts = new Map<string, number>();
  const monthCounts = new Map<string, { x: number; grok: number }>();

  for (const row of rows) {
    if (row.source === 'X Bookmark') {
      x += 1;
    } else if (row.source === 'Grok Chat') {
      grok += 1;
    }
    for (const topic of row.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
    const month = monthKeyFromDate(row.item_date);
    if (!month) {
      undated += 1;
    } else {
      const bucket = monthCounts.get(month) ?? emptyBucket();
      if (row.source === 'X Bookmark') {
        bucket.x += 1;
      } else if (row.source === 'Grok Chat') {
        bucket.grok += 1;
      }
      monthCounts.set(month, bucket);
    }
  }

  const topics = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((left, right) => right.count - left.count || left.topic.localeCompare(right.topic));

  const months = fillMonths(monthCounts);
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisBucket = monthCounts.get(thisMonthKey);
  const thisMonth = thisBucket ? thisBucket.x + thisBucket.grok : 0;
  const peak = peakMonth(months);
  const monthSeriesLabel = months
    .map((month) => `${month.month} ${month.x} X, ${month.grok} Grok`)
    .join('. ');

  return {
    total: rows.length,
    x,
    grok,
    undated,
    topics,
    months,
    thisMonth,
    thisMonthKey,
    thisMonthLabel: formatMonthKey(thisMonthKey),
    peak,
    monthSeriesLabel,
  };
}

function fillMonths(counts: Map<string, { x: number; grok: number }>): MonthBucket[] {
  if (counts.size === 0) {
    return [];
  }
  const keys = [...counts.keys()].sort();
  const start = keys[0];
  const end = keys[keys.length - 1];
  if (!start || !end) {
    return [];
  }
  const months: MonthBucket[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 600) {
    const bucket = counts.get(cursor) ?? emptyBucket();
    months.push({
      month: cursor,
      shortLabel: shortMonth(cursor),
      yearLabel: shortYear(cursor),
      showYear: false,
      x: bucket.x,
      grok: bucket.grok,
    });
    cursor = nextMonth(cursor);
    guard += 1;
  }
  for (let index = 0; index < months.length; index += 1) {
    const month = months[index];
    if (!month) {
      continue;
    }
    month.showYear = index === 0 || month.month.endsWith('-01') || index === months.length - 1;
  }
  return months;
}

function peakMonth(months: MonthBucket[]): { label: string; count: number } | null {
  let best: MonthBucket | null = null;
  let bestCount = -1;
  for (const month of months) {
    const count = month.x + month.grok;
    if (count > bestCount) {
      best = month;
      bestCount = count;
    }
  }
  if (!best || bestCount < 0) {
    return null;
  }
  return { label: formatMonthKey(best.month), count: bestCount };
}

export type StatsDimension = 'source' | 'topic' | 'month';

export type StatsSelection = {
  source: Source | null;
  topic: string | null;
  month: string | null;
};

export const EMPTY_SELECTION: StatsSelection = {
  source: null,
  topic: null,
  month: null,
};

export type RangePreset = 'all' | '7' | '30' | '90' | 'year' | 'custom';

export function chartSelectionActive(selection: StatsSelection): boolean {
  if (selection.source) {
    return true;
  }
  if (selection.topic) {
    return true;
  }
  if (selection.month) {
    return true;
  }
  return false;
}

export function toggleSelection<K extends keyof StatsSelection>(
  selection: StatsSelection,
  key: K,
  value: NonNullable<StatsSelection[K]>,
): StatsSelection {
  if (selection[key] === value) {
    return { ...selection, [key]: null };
  }
  return { ...selection, [key]: value };
}

// Last 7/30/90 days include today. This year runs from January 1 through today.
export function presetRange(preset: RangePreset, now: Date): DateRange {
  if (preset === 'all' || preset === 'custom') {
    return { from: null, to: null };
  }
  const to = isoDate(now);
  if (preset === 'year') {
    return { from: `${now.getFullYear()}-01-01`, to };
  }
  let days = 89;
  if (preset === '7') {
    days = 6;
  } else if (preset === '30') {
    days = 29;
  }
  return { from: isoDate(addDays(now, -days)), to };
}

export function appliedStatsRange(
  preset: RangePreset,
  now: Date,
  from: string | null,
  to: string | null,
): { range: DateRange; hint: string | null } {
  if (preset !== 'custom') {
    return { range: presetRange(preset, now), hint: null };
  }
  const hint = rangeHint(from, to);
  if (hint) {
    return { range: { from: null, to: null }, hint };
  }
  const custom = customRange({ ...EMPTY_FILTERS, from, to });
  return { range: custom ?? { from: null, to: null }, hint: null };
}

export function filtersFromStats(selection: StatsSelection, range: DateRange): ItemFilters {
  return {
    source: selection.source ?? 'all',
    topics: selection.topic ? [selection.topic] : [],
    month: selection.month,
    from: range.from,
    to: range.to,
  };
}

function inRange(row: StatRow, range: DateRange): boolean {
  if (!range.from && !range.to) {
    return true;
  }
  if (!row.item_date) {
    return false;
  }
  if (range.from && row.item_date < range.from) {
    return false;
  }
  if (range.to && row.item_date > range.to) {
    return false;
  }
  return true;
}

// `ignore` keeps the chart you tapped unfiltered by its own dimension, so another segment stays tappable.
export function rowMatches(
  row: StatRow,
  selection: StatsSelection,
  range: DateRange,
  ignore: StatsDimension | null,
): boolean {
  if (!inRange(row, range)) {
    return false;
  }
  if (ignore !== 'source' && selection.source && row.source !== selection.source) {
    return false;
  }
  if (ignore !== 'topic' && selection.topic && !row.topics.includes(selection.topic)) {
    return false;
  }
  if (ignore !== 'month' && selection.month && monthKeyFromDate(row.item_date) !== selection.month) {
    return false;
  }
  return true;
}

export function filteredStats(
  rows: StatRow[],
  selection: StatsSelection,
  range: DateRange,
  ignore: StatsDimension | null,
  now: Date,
): Stats {
  const matched: StatRow[] = [];
  for (const row of rows) {
    if (rowMatches(row, selection, range, ignore)) {
      matched.push(row);
    }
  }
  return buildStats(matched, now);
}

export function withSelectedTopic(stats: Stats, topic: string | null): Stats {
  if (!topic) {
    return stats;
  }
  for (const bucket of stats.topics) {
    if (bucket.topic === topic) {
      return stats;
    }
  }
  const topics = [...stats.topics, { topic, count: 0 }].sort((left, right) => {
    return right.count - left.count || left.topic.localeCompare(right.topic);
  });
  return { ...stats, topics };
}
