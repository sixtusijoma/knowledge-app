import { isIsoDate, monthBounds } from '@/lib/dates';
import type { ItemFilters } from '@/lib/types';

export const EMPTY_FILTERS: ItemFilters = {
  source: 'all',
  topics: [],
  importance: 'all',
  month: null,
  from: null,
  to: null,
};

export function hasCustomRange(filters: ItemFilters): boolean {
  if (!isIsoDate(filters.from) || !isIsoDate(filters.to)) {
    return false;
  }
  return filters.from <= filters.to;
}

export function resolveDateRange(filters: ItemFilters): { from: string | null; to: string | null } {
  if (hasCustomRange(filters) && filters.from && filters.to) {
    return { from: filters.from, to: filters.to };
  }
  if (filters.month) {
    const bounds = monthBounds(filters.month);
    if (bounds) {
      return bounds;
    }
  }
  return { from: null, to: null };
}

export function activeFilterCount(filters: ItemFilters): number {
  let count = 0;
  if (filters.source !== 'all') {
    count += 1;
  }
  if (filters.importance !== 'all') {
    count += 1;
  }
  count += filters.topics.length;
  if (hasCustomRange(filters)) {
    count += 1;
  } else if (filters.month) {
    count += 1;
  }
  return count;
}

export function rangeHint(from: string | null, to: string | null): string | null {
  if (!from || !to || from.length < 10 || to.length < 10) {
    return null;
  }
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return 'Use real dates in YYYY-MM-DD.';
  }
  if (from > to) {
    return 'The start date is after the end date.';
  }
  return null;
}
