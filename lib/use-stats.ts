import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { messageOf } from '@/lib/format';
import { fetchStatRows } from '@/lib/queries';
import type { StatRow } from '@/lib/types';

export function useStats() {
  const [rows, setRows] = useState<StatRow[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // 'focus' refetches quietly behind what is already on screen; 'pull' shows the refresh spinner.
  const load = useCallback(async (mode: 'focus' | 'pull' | 'retry') => {
    const id = requestId.current + 1;
    requestId.current = id;
    if (mode === 'pull') {
      setRefreshing(true);
    } else if (mode === 'retry') {
      setLoading(true);
    }
    try {
      const next = await fetchStatRows();
      if (id !== requestId.current) {
        return;
      }
      setRows(next);
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      if (id !== requestId.current) {
        return;
      }
      setError(messageOf(err));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load('focus').catch(() => undefined);
    }, [load]),
  );

  return {
    rows,
    updatedAt,
    loading,
    refreshing,
    error,
    refresh: () => load('pull'),
    retry: () => load('retry'),
  };
}
