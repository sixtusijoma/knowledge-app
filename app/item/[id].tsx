import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { ArrowUpRightIcon, ChevronLeftIcon } from '@/components/Icons';
import { EmptyState, ErrorState, FeedSkeleton } from '@/components/StateViews';
import { formatItemDate, formatTimestamp } from '@/lib/dates';
import { importanceLabel, openLabel } from '@/lib/format';
import { openExternal } from '@/lib/open-external';
import { fetchItem } from '@/lib/queries';
import { importanceColor, useTheme, useType } from '@/lib/theme';
import type { Item } from '@/lib/types';

export default function ItemScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { palette } = useTheme();
  const type = useType();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) {
        setItem(null);
        setLoading(false);
        setError('Missing entry id.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await fetchItem(id);
        if (cancelled) {
          return;
        }
        setItem(next);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setItem(null);
        setError(err instanceof Error ? err.message : 'Something went wrong loading this entry.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <Stack.Screen options={{ title: item?.title ?? 'Entry' }} />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="back-button"
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back to the feed"
          style={styles.back}
        >
          <ChevronLeftIcon color={palette.text} />
          <Text style={[styles.backLabel, { color: palette.text, fontFamily: type.sansMedium }]}>Feed</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.pad}>
          <FeedSkeleton />
        </View>
      ) : null}
      {!loading && error ? (
        <View style={styles.pad}>
          <ErrorState
            title="Couldn’t open this entry"
            message={error}
            onRetry={() => {
              if (!id) {
                return;
              }
              setLoading(true);
              fetchItem(id)
                .then((next) => {
                  setItem(next);
                  setError(null);
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Something went wrong loading this entry.');
                })
                .finally(() => {
                  setLoading(false);
                });
            }}
          />
        </View>
      ) : null}
      {!loading && !error && !item ? (
        <View style={styles.pad}>
          <EmptyState title="Entry not found" message="This record isn’t in the library anymore." />
        </View>
      ) : null}
      {!loading && item ? (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <EntryBody item={item} />
          </ScrollView>
          <View
            style={[
              styles.footer,
              {
                borderTopColor: palette.border,
                backgroundColor: palette.bg,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <PrimaryButton
              testID="open-link"
              label={item.link ? openLabel(item.source) : 'No original link'}
              disabled={!item.link}
              onPress={() => {
                if (item.link) {
                  openExternal(item.link);
                }
              }}
              icon={item.link ? <ArrowUpRightIcon color={palette.accentText} /> : undefined}
            />
            {item.link ? (
              <Text
                testID="detail-link"
                selectable
                onPress={() => {
                  if (item.link) {
                    openExternal(item.link);
                  }
                }}
                style={[styles.link, { color: palette.textMuted, fontFamily: type.sans }]}
              >
                {item.link}
              </Text>
            ) : (
              <Text testID="detail-link" style={[styles.link, { color: palette.textMuted, fontFamily: type.sans }]}>
                No link saved
              </Text>
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}

function EntryBody({ item }: { item: Item }) {
  const { palette } = useTheme();
  const type = useType();
  const sourceColors =
    item.source === 'X Bookmark'
      ? { background: palette.xBg, text: palette.xFg }
      : { background: palette.grokBg, text: palette.grokFg };
  const tone = importanceColor(palette, item.importance);

  return (
    <View>
      <View style={styles.meta}>
        <View style={[styles.badge, { backgroundColor: sourceColors.background }]}>
          <Text
            testID="detail-source"
            style={[styles.badgeText, { color: sourceColors.text, fontFamily: type.sansSemibold }]}
          >
            {item.source}
          </Text>
        </View>
        <Text testID="detail-importance" style={[styles.importance, { color: tone, fontFamily: type.sansMedium }]}>
          {importanceLabel(item.importance)}
        </Text>
      </View>
      <Text testID="detail-date" style={[styles.date, { color: palette.textMuted, fontFamily: type.sans }]}>
        {formatItemDate(item.item_date)}
      </Text>
      <Text testID="detail-title" style={[styles.title, { color: palette.text, fontFamily: type.serif }]}>
        {item.title}
      </Text>
      <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>Summary</Text>
      <Text
        testID="detail-summary"
        selectable
        style={[styles.summary, { color: palette.textSecondary, fontFamily: type.sans }]}
      >
        {item.summary && item.summary.length > 0 ? item.summary : 'No summary saved.'}
      </Text>
      <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>Topics</Text>
      {item.topics.length > 0 ? (
        <View style={styles.topics}>
          {item.topics.map((topic) => (
            <View key={topic} style={[styles.topic, { backgroundColor: palette.chip }]}>
              <Text style={[styles.topicText, { color: palette.chipText, fontFamily: type.sansMedium }]}>{topic}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.value, { color: palette.text, fontFamily: type.sans }]}>No topics</Text>
      )}
      <Field label="Author" value={item.author ?? '—'} testID="detail-author" />
      <Field label="External ID" value={item.external_id} testID="detail-external-id" />
      <Field label="Saved" value={formatTimestamp(item.created_at)} testID="detail-saved" />
      <Field label="Record ID" value={item.id} testID="detail-id" />
    </View>
  );
}

function Field({ label, value, testID }: { label: string; value: string; testID: string }) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View style={[styles.field, { borderTopColor: palette.border }]}>
      <Text style={[styles.fieldLabel, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>{label}</Text>
      <Text testID={testID} selectable style={[styles.value, { color: palette.text, fontFamily: type.sans }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  top: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backLabel: {
    fontSize: 16,
  },
  pad: {
    paddingHorizontal: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  importance: {
    fontSize: 13,
  },
  date: {
    marginTop: 12,
    fontSize: 13,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    marginTop: 6,
  },
  section: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  topics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topic: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  topicText: {
    fontSize: 13,
  },
  field: {
    borderTopWidth: 1,
    paddingVertical: 12,
    marginTop: 14,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  link: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
