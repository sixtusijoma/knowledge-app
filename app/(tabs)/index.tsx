import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/Buttons';
import { FilterSheet } from '@/components/FilterSheet';
import { CloseIcon, FilterIcon, MoonIcon, SunIcon } from '@/components/Icons';
import { ItemCard } from '@/components/ItemCard';
import { SearchField } from '@/components/SearchField';
import { Banner, EmptyState, ErrorState, FeedSkeleton } from '@/components/StateViews';
import { formatItemDate, formatMonthKey } from '@/lib/dates';
import { activeFilterCount, EMPTY_FILTERS, hasCustomRange } from '@/lib/filters';
import { formatCount, formatEntries, sourcePlural } from '@/lib/format';
import { useTheme, useType } from '@/lib/theme';
import type { Item, ItemFilters } from '@/lib/types';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useItems } from '@/lib/use-items';

type Chip = {
  key: string;
  label: string;
  testID: string;
  remove: () => void;
};

export default function FeedScreen() {
  const { palette, name, toggleTheme } = useTheme();
  const type = useType();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ItemFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const listRef = useRef<FlatList<Item>>(null);
  const { items, total, loading, loadingMore, refreshing, error, reload, refresh, loadMore, retryMore } = useItems(
    filters,
    debouncedSearch,
  );

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [debouncedSearch, filters]);

  const chips = buildChips(filters, setFilters);
  const narrowed = search.trim().length > 0 || activeFilterCount(filters) > 0;

  function clearAll() {
    setSearch('');
    setFilters(EMPTY_FILTERS);
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <View style={styles.wordmark}>
            <View style={[styles.mark, { backgroundColor: palette.accent }]} />
            <Text style={[styles.title, { color: palette.text, fontFamily: type.serifItalic }]}>Knowledge</Text>
          </View>
          <View style={styles.actions}>
            <IconButton
              testID="theme-toggle"
              label={name === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onPress={toggleTheme}
            >
              {name === 'dark' ? <SunIcon color={palette.text} /> : <MoonIcon color={palette.text} />}
            </IconButton>
            <IconButton
              testID="filter-button"
              label="Filters"
              badge={activeFilterCount(filters)}
              onPress={() => {
                setSheetOpen(true);
              }}
            >
              <FilterIcon color={palette.text} />
            </IconButton>
          </View>
        </View>
        <Text style={[styles.kicker, { color: palette.textMuted, fontFamily: type.sans }]}>
          {narrowed ? 'Newest matching entries' : 'Newest first'}
        </Text>
        <Text
          testID="result-count"
          accessibilityLiveRegion="polite"
          style={[styles.count, { color: palette.textSecondary, fontFamily: type.sansMedium }]}
        >
          {total === null ? 'Loading…' : formatEntries(total)}
        </Text>
        <SearchField value={search} onChange={setSearch} />
        {chips.length > 0 ? (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <Pressable
                key={chip.key}
                testID={chip.testID}
                onPress={chip.remove}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${chip.label}`}
                style={[styles.chip, { backgroundColor: palette.chip, borderColor: palette.border }]}
              >
                <Text style={[styles.chipText, { color: palette.chipText, fontFamily: type.sansMedium }]}>
                  {chip.label}
                </Text>
                <CloseIcon color={palette.textMuted} size={12} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {error?.place === 'refresh' ? (
          <Banner
            message={error.message}
            onRetry={() => {
              refresh().catch(() => undefined);
            }}
          />
        ) : null}
      </View>
      <FlatList
        ref={listRef}
        testID="feed-list"
        style={styles.list}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.45}
        onEndReached={() => {
          loadMore().catch(() => undefined);
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refresh().catch(() => undefined);
            }}
            tintColor={palette.accent}
            colors={[palette.accent]}
            progressBackgroundColor={palette.card}
          />
        }
        ListEmptyComponent={
          loading ? (
            <FeedSkeleton />
          ) : error?.place === 'list' ? (
            <ErrorState
              message={error.message}
              onRetry={() => {
                reload().catch(() => undefined);
              }}
            />
          ) : (
            <EmptyState
              title={narrowed ? 'Nothing matches' : 'The library is empty'}
              message={
                narrowed
                  ? 'Try a different search, or clear the filters.'
                  : 'New bookmarks and chats will show up here.'
              }
              actionLabel={narrowed ? 'Clear search and filters' : undefined}
              onAction={narrowed ? clearAll : undefined}
            />
          )
        }
        ListFooterComponent={
          items.length === 0 ? undefined : (
            <View style={styles.footer}>
              {loadingMore ? <ActivityIndicator color={palette.accent} /> : null}
              {error?.place === 'more' ? (
                <Pressable
                  testID="load-more-retry"
                  onPress={() => {
                    retryMore().catch(() => undefined);
                  }}
                >
                  <Text style={[styles.footerText, { color: palette.danger, fontFamily: type.sans }]}>
                    {`${error.message} Tap to try again.`}
                  </Text>
                </Pressable>
              ) : null}
              <Text
                testID="loaded-count"
                style={[styles.footerText, { color: palette.textMuted, fontFamily: type.sans }]}
              >
                {`Showing ${formatCount(items.length)} of ${formatCount(total ?? items.length)}`}
              </Text>
            </View>
          )
        }
      />
      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        total={total}
        onChange={setFilters}
        onClose={() => {
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

function buildChips(filters: ItemFilters, setFilters: (filters: ItemFilters) => void): Chip[] {
  const chips: Chip[] = [];
  if (filters.source !== 'all') {
    chips.push({
      key: 'source',
      testID: 'chip-source',
      label: sourcePlural(filters.source),
      remove: () => {
        setFilters({ ...filters, source: 'all' });
      },
    });
  }
  if (filters.importance !== 'all') {
    chips.push({
      key: 'importance',
      testID: 'chip-importance',
      label: filters.importance,
      remove: () => {
        setFilters({ ...filters, importance: 'all' });
      },
    });
  }
  for (const topic of filters.topics) {
    chips.push({
      key: `topic-${topic}`,
      testID: `chip-topic-${topic}`,
      label: topic,
      remove: () => {
        setFilters({ ...filters, topics: filters.topics.filter((item) => item !== topic) });
      },
    });
  }
  if (hasCustomRange(filters) && filters.from && filters.to) {
    chips.push({
      key: 'range',
      testID: 'chip-range',
      label: `${formatItemDate(filters.from)} – ${formatItemDate(filters.to)}`,
      remove: () => {
        setFilters({ ...filters, from: null, to: null });
      },
    });
  } else if (filters.month) {
    chips.push({
      key: 'month',
      testID: 'chip-month',
      label: formatMonthKey(filters.month),
      remove: () => {
        setFilters({ ...filters, month: null });
      },
    });
  }
  return chips;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  kicker: {
    fontSize: 13,
  },
  count: {
    fontSize: 14,
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
