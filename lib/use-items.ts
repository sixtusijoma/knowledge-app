import { useCallback, useEffect, useRef, useState } from 'react';

import { messageOf } from '@/lib/format';
import { fetchItems, PAGE_SIZE } from '@/lib/queries';
import type { Item, ItemFilters } from '@/lib/types';

export type LoadError = {
  message: string;
  place: 'first' | 'more';
};

function hasMoreAfter(page: number, batchSize: number, count: number | null): boolean {
  if (count === null) {
    return batchSize === PAGE_SIZE;
  }
  return page * PAGE_SIZE + batchSize < count;
}

export function useItems(filters: ItemFilters, search: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);

  const query = useRef({ filters, search });
  const requestId = useRef(0);
  const page = useRef(0);
  const hasMore = useRef(false);
  const firstPageBusy = useRef(true);
  const moreBusy = useRef(false);
  const morePaused = useRef(false);

  // 'reload' is for a new query: results that no longer match are dropped if it fails.
  // 'refresh' keeps what is on screen and only swaps it in on success.
  const loadFirstPage = useCallback(async (mode: 'reload' | 'refresh') => {
    const id = requestId.current + 1;
    requestId.current = id;
    firstPageBusy.current = true;
    morePaused.current = false;
    if (mode === 'reload') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const result = await fetchItems({ ...query.current, page: 0 });
      if (id !== requestId.current) {
        return;
      }
      page.current = 0;
      hasMore.current = hasMoreAfter(0, result.items.length, result.count);
      setItems(result.items);
      setTotal(result.count);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) {
        return;
      }
      if (mode === 'reload') {
        hasMore.current = false;
        setItems([]);
        setTotal(null);
      }
      setError({ message: messageOf(err), place: 'first' });
    } finally {
      if (id === requestId.current) {
        firstPageBusy.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (firstPageBusy.current || moreBusy.current || morePaused.current || !hasMore.current) {
      return;
    }
    const id = requestId.current;
    const nextPage = page.current + 1;
    moreBusy.current = true;
    setLoadingMore(true);
    try {
      const result = await fetchItems({ ...query.current, page: nextPage });
      if (id !== requestId.current) {
        return;
      }
      page.current = nextPage;
      hasMore.current = hasMoreAfter(nextPage, result.items.length, result.count);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...result.items.filter((item) => !seen.has(item.id))];
      });
      setTotal(result.count);
    } catch (err) {
      if (id !== requestId.current) {
        return;
      }
      morePaused.current = true;
      setError({ message: messageOf(err), place: 'more' });
    } finally {
      moreBusy.current = false;
      setLoadingMore(false);
    }
  }, []);

  const retryMore = useCallback(async () => {
    morePaused.current = false;
    setError(null);
    await loadMore();
  }, [loadMore]);

  const reload = useCallback(() => loadFirstPage('reload'), [loadFirstPage]);
  const refresh = useCallback(() => loadFirstPage('refresh'), [loadFirstPage]);

  useEffect(() => {
    query.current = { filters, search };
    loadFirstPage('reload').catch(() => undefined);
  }, [filters, search, loadFirstPage]);

  return { items, total, loading, loadingMore, refreshing, error, reload, refresh, loadMore, retryMore };
}
