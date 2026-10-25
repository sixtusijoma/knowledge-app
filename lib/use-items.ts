import { useCallback, useEffect, useRef, useState } from 'react';

import { messageOf } from '@/lib/format';
import { fetchItems, PAGE_SIZE } from '@/lib/queries';
import type { Item, ItemFilters } from '@/lib/types';

export type LoadError = {
  message: string;
  place: 'list' | 'refresh' | 'more';
};

function rememberPage(count: number | null, page: number, batchSize: number, hasMoreRef: { current: boolean }) {
  const loadedCount = page * PAGE_SIZE + batchSize;
  if (count === null) {
    hasMoreRef.current = batchSize === PAGE_SIZE;
    return;
  }
  hasMoreRef.current = loadedCount < count;
}

export function useItems(filters: ItemFilters, search: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);

  const requestId = useRef(0);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const pauseMoreRef = useRef(false);
  const filtersRef = useRef(filters);
  const searchRef = useRef(search);
  filtersRef.current = filters;
  searchRef.current = search;

  const reload = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    loadingRef.current = true;
    loadingMoreRef.current = false;
    pauseMoreRef.current = false;
    setLoading(true);
    setError(null);
    setItems([]);
    setTotal(null);
    try {
      const result = await fetchItems({
        filters: filtersRef.current,
        search: searchRef.current,
        page: 0,
      });
      if (id !== requestId.current) {
        return;
      }
      setItems(result.items);
      setTotal(result.count);
      pageRef.current = 0;
      rememberPage(result.count, 0, result.items.length, hasMoreRef);
    } catch (err) {
      if (id !== requestId.current) {
        return;
      }
      setItems([]);
      setTotal(null);
      hasMoreRef.current = false;
      setError({ message: messageOf(err), place: 'list' });
    } finally {
      if (id === requestId.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    loadingMoreRef.current = false;
    pauseMoreRef.current = false;
    setRefreshing(true);
    try {
      const result = await fetchItems({
        filters: filtersRef.current,
        search: searchRef.current,
        page: 0,
      });
      if (id !== requestId.current) {
        return;
      }
      setItems(result.items);
      setTotal(result.count);
      pageRef.current = 0;
      rememberPage(result.count, 0, result.items.length, hasMoreRef);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) {
        return;
      }
      setError({ message: messageOf(err), place: 'refresh' });
    } finally {
      if (id === requestId.current) {
        loadingRef.current = false;
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loadingMoreRef.current || pauseMoreRef.current || !hasMoreRef.current) {
      return;
    }
    const id = requestId.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const result = await fetchItems({
        filters: filtersRef.current,
        search: searchRef.current,
        page: nextPage,
      });
      if (id !== requestId.current) {
        return;
      }
      setItems((current) => [...current, ...result.items]);
      setTotal(result.count);
      pageRef.current = nextPage;
      rememberPage(result.count, nextPage, result.items.length, hasMoreRef);
    } catch (err) {
      if (id !== requestId.current) {
        return;
      }
      pauseMoreRef.current = true;
      setError({ message: messageOf(err), place: 'more' });
    } finally {
      loadingMoreRef.current = false;
      if (id === requestId.current) {
        setLoadingMore(false);
      }
    }
  }, []);

  const retryMore = useCallback(async () => {
    pauseMoreRef.current = false;
    hasMoreRef.current = true;
    await loadMore();
  }, [loadMore]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [filters, search, reload]);

  return {
    items,
    total,
    loading,
    loadingMore,
    refreshing,
    error,
    reload,
    refresh,
    loadMore,
    retryMore,
  };
}
