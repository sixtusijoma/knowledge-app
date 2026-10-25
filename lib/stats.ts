import { formatMonthKey, monthKeyFromDate, nextMonth, shortMonth, shortYear } from '@/lib/dates';
import type { StatRow } from '@/lib/types';

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
  importance: {
    high: number;
    medium: number;
    low: number;
    unset: number;
  };
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
  const importance = { high: 0, medium: 0, low: 0, unset: 0 };
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
    if (row.importance === 'High') {
      importance.high += 1;
    } else if (row.importance === 'Medium') {
      importance.medium += 1;
    } else if (row.importance === 'Low') {
      importance.low += 1;
    } else {
      importance.unset += 1;
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
    importance,
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
