import { addIsoDays, formatItemDate, formatMonthKey, monthBounds } from '@/lib/dates';
import { formatCount } from '@/lib/format';
import type { DateRange } from '@/lib/filters';
import type { RangePreset } from '@/lib/stats';
import type { Source, StatRow } from '@/lib/types';

export type ActivityUnit = 'day' | 'week' | 'month';

export type ActivityBucket = {
  bucket: string;
  bookmarks: number;
  chats: number;
};

export function defaultActivityUnit(preset: RangePreset): ActivityUnit {
  if (preset === '7' || preset === '30') {
    return 'day';
  }
  if (preset === '90') {
    return 'week';
  }
  return 'month';
}

export function bucketBounds(unit: ActivityUnit, bucket: string): { from: string; to: string } {
  if (unit === 'day') {
    return { from: bucket, to: bucket };
  }
  if (unit === 'week') {
    return { from: bucket, to: addIsoDays(bucket, 6) };
  }
  const bounds = monthBounds(bucket.slice(0, 7));
  if (!bounds) {
    return { from: bucket, to: bucket };
  }
  return bounds;
}

export function clipRange(
  bounds: { from: string; to: string },
  limit: DateRange,
): { from: string; to: string } {
  let from = bounds.from;
  let to = bounds.to;
  if (limit.from && limit.from > from) {
    from = limit.from;
  }
  if (limit.to && limit.to < to) {
    to = limit.to;
  }
  return { from, to };
}

export function activityCallout(unit: ActivityUnit, bucket: ActivityBucket, limit: DateRange): string {
  const bounds = clipRange(bucketBounds(unit, bucket.bucket), limit);
  let label = formatItemDate(bounds.from);
  if (bounds.from !== bounds.to) {
    label = `${formatItemDate(bounds.from)} – ${formatItemDate(bounds.to)}`;
  }
  if (unit === 'month') {
    const full = monthBounds(bounds.from.slice(0, 7));
    if (full && full.from === bounds.from && full.to === bounds.to) {
      label = formatMonthKey(bounds.from.slice(0, 7));
    }
  }
  return `${label} · ${formatCount(bucket.bookmarks)} bookmarks · ${formatCount(bucket.chats)} chats`;
}

function weekStart(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return iso;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const weekday = date.getUTCDay();
  const back = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - back);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function truncateDate(unit: ActivityUnit, iso: string): string {
  if (unit === 'month') {
    return `${iso.slice(0, 7)}-01`;
  }
  if (unit === 'week') {
    return weekStart(iso);
  }
  return iso;
}

// Same grouping as activity_buckets, for when that function is not on the database yet.
export function bucketsFromRows(
  rows: StatRow[],
  unit: ActivityUnit,
  limit: DateRange,
  source: Source | null,
  topic: string | null,
): ActivityBucket[] {
  const counts = new Map<string, { bookmarks: number; chats: number }>();
  for (const row of rows) {
    if (!row.item_date) {
      continue;
    }
    if (limit.from && row.item_date < limit.from) {
      continue;
    }
    if (limit.to && row.item_date > limit.to) {
      continue;
    }
    if (source && row.source !== source) {
      continue;
    }
    if (topic && !row.topics.includes(topic)) {
      continue;
    }
    const key = truncateDate(unit, row.item_date);
    const bucket = counts.get(key) ?? { bookmarks: 0, chats: 0 };
    if (row.source === 'X Bookmark') {
      bucket.bookmarks += 1;
    } else if (row.source === 'Grok Chat') {
      bucket.chats += 1;
    }
    counts.set(key, bucket);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([bucket, count]) => ({ bucket, bookmarks: count.bookmarks, chats: count.chats }));
}

export function activityBucketLabel(unit: ActivityUnit, bucket: string, index: number, last: number): {
  primary: string;
  secondary: string;
} {
  if (unit === 'month') {
    const month = bucket.slice(0, 7);
    const showYear = index === 0 || month.endsWith('-01') || index === last;
    return {
      primary: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
        Number(month.slice(5, 7)) - 1
      ] ?? month,
      secondary: showYear ? `’${month.slice(2, 4)}` : '',
    };
  }
  const day = Number(bucket.slice(8, 10));
  const monthIndex = Number(bucket.slice(5, 7)) - 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const showMonth = index === 0 || day === 1 || index === last;
  return {
    primary: String(day),
    secondary: showMonth ? (months[monthIndex] ?? '') : '',
  };
}
