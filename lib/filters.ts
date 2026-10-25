import { formatItemDate, isIsoDate, monthBounds } from '@/lib/dates';
import type { ItemFilters } from '@/lib/types';

export type DateRange = {
  from: string | null;
  to: string | null;
};

export const EMPTY_FILTERS: ItemFilters = {
  source: 'all',
  topics: [],
  importance: 'all',
  month: null,
  from: null,
  to: null,
};

export function rangeHint(from: string | null, to: string | null): string | null {
  const complete = [from, to].filter((value): value is string => value !== null && value.length >= 10);
  if (complete.some((value) => !isIsoDate(value))) {
    return 'Use real dates in YYYY-MM-DD.';
  }
  if (isIsoDate(from) && isIsoDate(to) && from > to) {
    return 'The start date is after the end date.';
  }
  return null;
}

// Either end may be left open. Half-typed dates are ignored until they are complete.
export function customRange(filters: ItemFilters): DateRange | null {
  if (rangeHint(filters.from, filters.to)) {
    return null;
  }
  const from = isIsoDate(filters.from) ? filters.from : null;
  const to = isIsoDate(filters.to) ? filters.to : null;
  if (!from && !to) {
    return null;
  }
  return { from, to };
}

export function resolveDateRange(filters: ItemFilters): DateRange {
  const custom = customRange(filters);
  if (custom) {
    return custom;
  }
  if (filters.month) {
    const bounds = monthBounds(filters.month);
    if (bounds) {
      return bounds;
    }
  }
  return { from: null, to: null };
}

export function rangeLabel(range: DateRange): string {
  if (range.from && range.to) {
    return `${formatItemDate(range.from)} – ${formatItemDate(range.to)}`;
  }
  if (range.from) {
    return `From ${formatItemDate(range.from)}`;
  }
  return `Until ${formatItemDate(range.to)}`;
}

export function activeFilterCount(filters: ItemFilters): number {
  let count = filters.topics.length;
  if (filters.source !== 'all') {
    count += 1;
  }
  if (filters.importance !== 'all') {
    count += 1;
  }
  if (customRange(filters) || filters.month) {
    count += 1;
  }
  return count;
}
