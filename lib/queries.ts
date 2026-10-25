import { resolveDateRange } from '@/lib/filters';
import { supabase } from '@/lib/supabase';
import type { Item, ItemFilters, StatRow } from '@/lib/types';

export const PAGE_SIZE = 20;

const ITEM_COLUMNS =
  'id, source, external_id, title, summary, topics, importance, author, item_date, link, created_at';

const STAT_PAGE = 1000;
const MAX_STAT_PAGES = 40;

function normalizeItem(row: Item): Item {
  return {
    ...row,
    topics: Array.isArray(row.topics) ? row.topics : [],
    summary: row.summary ?? null,
    author: row.author ?? null,
    link: row.link ?? null,
    importance: row.importance ?? null,
    item_date: row.item_date ?? null,
  };
}

export async function fetchItems(args: {
  filters: ItemFilters;
  search: string;
  page: number;
}): Promise<{ items: Item[]; count: number | null }> {
  let query = supabase.from('items').select(ITEM_COLUMNS, { count: 'exact' });
  const trimmed = args.search.trim();
  if (trimmed.length > 0) {
    query = query.textSearch('fts', trimmed, {
      type: 'websearch',
      config: 'english',
    });
  }
  if (args.filters.source !== 'all') {
    query = query.eq('source', args.filters.source);
  }
  if (args.filters.importance !== 'all') {
    query = query.eq('importance', args.filters.importance);
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
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await query
    .order('item_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }
  const items = ((data ?? []) as Item[]).map(normalizeItem);
  return { items, count };
}

export async function fetchItem(id: string): Promise<Item | null> {
  const { data, error } = await supabase.from('items').select(ITEM_COLUMNS).eq('id', id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return normalizeItem(data as Item);
}

export async function fetchStatRows(): Promise<StatRow[]> {
  const rows: StatRow[] = [];
  for (let page = 0; page < MAX_STAT_PAGES; page += 1) {
    const from = page * STAT_PAGE;
    const to = from + STAT_PAGE - 1;
    const { data, error } = await supabase
      .from('items')
      .select('source, topics, importance, item_date')
      .order('id', { ascending: true })
      .range(from, to);
    if (error) {
      throw new Error(error.message);
    }
    const batch = ((data ?? []) as StatRow[]).map((row) => ({
      source: row.source,
      topics: Array.isArray(row.topics) ? row.topics : [],
      importance: row.importance ?? null,
      item_date: row.item_date ?? null,
    }));
    rows.push(...batch);
    if (batch.length < STAT_PAGE) {
      return rows;
    }
  }
  throw new Error('The library is larger than this stats pass can read.');
}
