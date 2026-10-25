import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { messageOf } from '@/lib/format';
import { fetchStatRows } from '@/lib/queries';
import { buildStats, type Stats } from '@/lib/stats';

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStats = useRef(false);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    if (hasStats.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const rows = await fetchStatRows();
      if (id !== requestId.current) {
        return;
      }
      setStats(buildStats(rows, new Date()));
      hasStats.current = true;
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
      reload().catch(() => undefined);
    }, [reload]),
  );

  return { stats, loading, refreshing, error, reload };
}
