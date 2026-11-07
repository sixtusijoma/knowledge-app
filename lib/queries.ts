import type { ActivityBucket, ActivityUnit } from '@/lib/activity';
import { resolveDateRange } from '@/lib/filters';
import {
  filterSampleItems,
  findSampleItem,
  sampleActivity,
  sampleStatRows,
  sampleTopics,
} from '@/lib/sample-library';
import { isSampleMode } from '@/lib/sample-mode';
import { supabase } from '@/lib/supabase';
import { TOPICS } from '@/lib/topics';
import type { Item, ItemFilters, Source, StatRow } from '@/lib/types';

export const PAGE_SIZE = 20;

const ITEM_COLUMNS =
  'id, source, external_id, title, summary, topics, author, item_date, link, created_at';

const STAT_PAGE = 1000;
const MAX_STAT_PAGES = 40;
// PostgREST returns at most this many rows from one call. Activity buckets are
// ordered oldest first, so a single page stops the Day chart before the latest dates.
const ACTIVITY_PAGE = 1000;
const MAX_ACTIVITY_PAGES = 40;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const seenItems = new Map<string, Item>();

function normalizeItem(row: Item): Item {
  const item: Item = {
    ...row,
    topics: Array.isArray(row.topics) ? row.topics : [],
    summary: row.summary ?? null,
    author: row.author ?? null,
    link: row.link ?? null,
    item_date: row.item_date ?? null,
  };
  seenItems.set(item.id, item);
  return item;
}

export function peekItem(id: string): Item | null {
  return seenItems.get(id) ?? null;
}

export async function fetchItems(args: {
  filters: ItemFilters;
  search: string;
  page: number;
}): Promise<{ items: Item[]; count: number | null }> {
  if (isSampleMode()) {
    const matched = filterSampleItems(args.filters, args.search);
    const from = args.page * PAGE_SIZE;
    return {
      items: matched.slice(from, from + PAGE_SIZE).map(normalizeItem),
      count: matched.length,
    };
  }
  let query = supabase.from('items').select(ITEM_COLUMNS, { count: 'exact' });
  const trimmed = args.search.trim();
  if (trimmed.length > 0) {
    query = query.textSearch('fts', trimmed, { type: 'websearch', config: 'english' });
  }
  if (args.filters.source !== 'all') {
    query = query.eq('source', args.filters.source);
  }
  if (args.filters.topics.length > 0) {
    // overlaps = match any selected topic
    query = query.overlaps('topics', args.filters.topics);
  }
  const range = resolveDateRange(args.filters);
  if (range.from) {
    query = query.gte('item_date', range.from);
  }
  if (range.to) {
    query = query.lte('item_date', range.to);
  }

  const from = args.page * PAGE_SIZE;
  const { data, error, count } = await query
    .order('item_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    throw new Error(error.message);
  }
  return { items: ((data ?? []) as Item[]).map(normalizeItem), count };
}

export async function fetchItem(id: string): Promise<Item | null> {
  if (!UUID_PATTERN.test(id)) {
    return null;
  }
  if (isSampleMode()) {
    const sample = findSampleItem(id);
    if (!sample) {
      return null;
    }
    return normalizeItem(sample);
  }
  const { data, error } = await supabase.from('items').select(ITEM_COLUMNS).eq('id', id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return normalizeItem(data as Item);
}

// Pages in insertion order so rows added during the scan land on the last page instead of shifting earlier ones.
export async function fetchStatRows(): Promise<StatRow[]> {
  if (isSampleMode()) {
    return sampleStatRows();
  }
  const rows: StatRow[] = [];
  for (let page = 0; page < MAX_STAT_PAGES; page += 1) {
    const from = page * STAT_PAGE;
    const { data, error } = await supabase
      .from('items')
      .select('source, topics, item_date')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + STAT_PAGE - 1);
    if (error) {
      throw new Error(error.message);
    }
    const batch = ((data ?? []) as StatRow[]).map((row) => ({
      source: row.source,
      topics: Array.isArray(row.topics) ? row.topics : [],
      item_date: row.item_date ?? null,
    }));
    rows.push(...batch);
    if (batch.length < STAT_PAGE) {
      return rows;
    }
  }
  throw new Error('The library is larger than this stats pass can read.');
}

type ActivityRow = {
  bucket: string;
  bookmarks: number | string;
  chats: number | string;
};

export async function fetchActivity(args: {
  unit: ActivityUnit;
  from: string | null;
  to: string | null;
  source: Source | null;
  topic: string | null;
}): Promise<ActivityBucket[]> {
  if (isSampleMode()) {
    return sampleActivity(args);
  }
  const buckets: ActivityBucket[] = [];
  for (let page = 0; page < MAX_ACTIVITY_PAGES; page += 1) {
    const from = page * ACTIVITY_PAGE;
    const { data, error } = await supabase
      .rpc('activity_buckets', {
        p_unit: args.unit,
        p_from: args.from,
        p_to: args.to,
        p_source: args.source,
        p_topic: args.topic,
      })
      .range(from, from + ACTIVITY_PAGE - 1);
    if (error) {
      if (/schema cache|could not find the function/i.test(error.message)) {
        throw new Error('Activity counts are not available until activity_buckets is on the database.');
      }
      throw new Error(error.message);
    }
    const batch = ((data ?? []) as ActivityRow[]).map((row) => ({
      bucket: String(row.bucket).slice(0, 10),
      bookmarks: Number(row.bookmarks),
      chats: Number(row.chats),
    }));
    buckets.push(...batch);
    if (batch.length < ACTIVITY_PAGE) {
      return buckets;
    }
  }
  throw new Error('This range has more activity than this pass can read.');
}

let topicCache: string[] | null = null;
let topicRequest: Promise<string[]> | null = null;

export function clearTopicCache(): void {
  topicCache = null;
  topicRequest = null;
}

// One exact count per known topic, so a topic with no rows never gets a chip.
export function fetchPresentTopics(): Promise<string[]> {
  if (isSampleMode()) {
    const present = sampleTopics();
    topicCache = present;
    return Promise.resolve(present);
  }
  if (topicCache) {
    return Promise.resolve(topicCache);
  }
  if (topicRequest) {
    return topicRequest;
  }
  topicRequest = (async () => {
    const counts = await Promise.all(
      TOPICS.map(async (topic) => {
        const { count, error } = await supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .overlaps('topics', [topic]);
        if (error) {
          throw new Error(error.message);
        }
        return { topic, count: count ?? 0 };
      }),
    );
    const present = counts.filter((row) => row.count > 0).map((row) => row.topic);
    topicCache = present;
    return present;
  })().catch((error: unknown) => {
    topicRequest = null;
    throw error;
  });
  return topicRequest;
}
