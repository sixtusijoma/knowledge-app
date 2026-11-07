import { bucketsFromRows, type ActivityBucket, type ActivityUnit } from '@/lib/activity';
import { resolveDateRange } from '@/lib/filters';
import { SAMPLE_ITEMS } from '@/lib/sample-items';
import { TOPICS } from '@/lib/topics';
import type { Item, ItemFilters, Source, StatRow } from '@/lib/types';

function copyItem(item: Item): Item {
  return {
    ...item,
    topics: [...item.topics],
  };
}

function matchesSearch(item: Item, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  const haystack = `${item.title}\n${item.summary ?? ''}\n${item.author ?? ''}`.toLowerCase();
  return haystack.includes(needle);
}

function compareItems(left: Item, right: Item): number {
  if (left.item_date !== right.item_date) {
    if (!left.item_date) {
      return 1;
    }
    if (!right.item_date) {
      return -1;
    }
    return right.item_date.localeCompare(left.item_date);
  }
  if (left.created_at !== right.created_at) {
    return right.created_at.localeCompare(left.created_at);
  }
  return right.id.localeCompare(left.id);
}

export function filterSampleItems(filters: ItemFilters, search: string): Item[] {
  const range = resolveDateRange(filters);
  return SAMPLE_ITEMS.filter((item) => {
    if (filters.source !== 'all' && item.source !== filters.source) {
      return false;
    }
    if (filters.topics.length > 0 && !filters.topics.some((topic) => item.topics.includes(topic))) {
      return false;
    }
    if (range.from && (!item.item_date || item.item_date < range.from)) {
      return false;
    }
    if (range.to && (!item.item_date || item.item_date > range.to)) {
      return false;
    }
    return matchesSearch(item, search);
  })
    .slice()
    .sort(compareItems)
    .map(copyItem);
}

export function findSampleItem(id: string): Item | null {
  const item = SAMPLE_ITEMS.find((row) => row.id === id);
  if (!item) {
    return null;
  }
  return copyItem(item);
}

export function sampleStatRows(): StatRow[] {
  return SAMPLE_ITEMS.map((item) => ({
    source: item.source,
    topics: [...item.topics],
    item_date: item.item_date,
  }));
}

export function sampleActivity(args: {
  unit: ActivityUnit;
  from: string | null;
  to: string | null;
  source: Source | null;
  topic: string | null;
}): ActivityBucket[] {
  return bucketsFromRows(sampleStatRows(), args.unit, { from: args.from, to: args.to }, args.source, args.topic);
}

export function sampleTopics(): string[] {
  const present = new Set(SAMPLE_ITEMS.flatMap((item) => item.topics));
  return TOPICS.filter((topic) => present.has(topic));
}
