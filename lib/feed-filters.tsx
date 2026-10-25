import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { EMPTY_FILTERS } from '@/lib/filters';
import type { ItemFilters } from '@/lib/types';

type FeedFiltersValue = {
  filters: ItemFilters;
  setFilters: (filters: ItemFilters) => void;
  search: string;
  setSearch: (search: string) => void;
  applyFilters: (filters: ItemFilters) => void;
};

const FeedFiltersContext = createContext<FeedFiltersValue | null>(null);

export function FeedFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<ItemFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');

  const applyFilters = useCallback((next: ItemFilters) => {
    setSearch('');
    setFilters(next);
  }, []);

  const value = useMemo(
    () => ({ filters, setFilters, search, setSearch, applyFilters }),
    [filters, search, applyFilters],
  );

  return <FeedFiltersContext.Provider value={value}>{children}</FeedFiltersContext.Provider>;
}

export function useFeedFilters(): FeedFiltersValue {
  const value = useContext(FeedFiltersContext);
  if (!value) {
    throw new Error('useFeedFilters must be used within FeedFiltersProvider');
  }
  return value;
}
