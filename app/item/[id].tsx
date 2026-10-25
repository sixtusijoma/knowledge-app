import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { ArrowUpRightIcon, ChevronLeftIcon } from '@/components/Icons';
import { SourceBadge } from '@/components/SourceBadge';
import { DetailSkeleton, EmptyState, ErrorState } from '@/components/StateViews';
import { TopicChip } from '@/components/TopicChip';
import { formatItemDate, formatTimestamp } from '@/lib/dates';
import { externalIdLabel, meaningfulSummary, messageOf, openLabel } from '@/lib/format';
import { fetchItem, peekItem } from '@/lib/queries';
import { useTheme, useType } from '@/lib/theme';
import type { Item } from '@/lib/types';

function openLink(url: string) {
  Linking.openURL(url).catch(() => undefined);
}

export default function ItemScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const type = useType();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<Item | null>(() => peekItem(id));
  const [loading, setLoading] = useState(item === null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await fetchItem(id);
        if (!cancelled) {
          setItem(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(messageOf(err));
        }
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
  }, [id, attempt]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }

  function body() {
    if (item) {
      return (
        <ScrollView contentContainerStyle={styles.content}>
          <EntryBody item={item} />
        </ScrollView>
      );
    }
    if (loading) {
      return (
        <View style={styles.pad}>
          <DetailSkeleton />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.pad}>
          <ErrorState
            title="Couldn’t open this entry"
            message={error}
            onRetry={() => {
              setLoading(true);
              setAttempt((current) => current + 1);
            }}
          />
        </View>
      );
    }
    return (
      <View style={styles.pad}>
        <EmptyState
          title="Entry not found"
          message="This link doesn’t match anything in the library."
          actionLabel="Back to the feed"
          onAction={goBack}
        />
      </View>
    );
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
          hitSlop={8}
          style={styles.back}
        >
          <ChevronLeftIcon color={palette.text} />
          <Text style={[styles.backLabel, { color: palette.text, fontFamily: type.sansMedium }]}>Feed</Text>
        </Pressable>
      </View>
      {body()}
      {item ? (
        <View
          style={[
            styles.footer,
            { borderTopColor: palette.border, backgroundColor: palette.bg, paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {item.link ? (
            <>
              <PrimaryButton
                testID="open-link"
                label={openLabel(item.source)}
                onPress={() => {
                  openLink(item.link ?? '');
                }}
                icon={<ArrowUpRightIcon color={palette.accentText} />}
              />
              <Text
                testID="detail-link"
                selectable
                numberOfLines={1}
                ellipsizeMode="middle"
                style={[styles.link, { color: palette.textMuted, fontFamily: type.sans }]}
              >
                {item.link}
              </Text>
            </>
          ) : (
            <PrimaryButton testID="open-link" label="No original link saved" disabled onPress={() => undefined} />
          )}
        </View>
      ) : null}
    </View>
  );
}

function EntryBody({ item }: { item: Item }) {
  const { palette } = useTheme();
  const type = useType();
  const summary = meaningfulSummary(item);

  return (
    <View>
      <View style={styles.meta}>
        <SourceBadge source={item.source} testID="detail-source" />
      </View>
      <Text testID="detail-date" style={[styles.date, { color: palette.textMuted, fontFamily: type.sans }]}>
        {formatItemDate(item.item_date)}
      </Text>
      <Text testID="detail-title" selectable style={[styles.title, { color: palette.text, fontFamily: type.serif }]}>
        {item.title}
      </Text>

      <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>Summary</Text>
      <Text
        testID="detail-summary"
        selectable
        style={[
          styles.summary,
          summary
            ? { color: palette.textSecondary, fontFamily: type.sans }
            : { color: palette.textMuted, fontFamily: type.sans, fontSize: 15 },
        ]}
      >
        {summary ?? 'Only the title was saved for this entry.'}
      </Text>

      <Text style={[styles.section, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>Topics</Text>
      {item.topics.length > 0 ? (
        <View testID="detail-topics" style={styles.topics}>
          {item.topics.map((topic) => (
            <TopicChip key={topic} topic={topic} testID={`detail-topic-${topic}`} />
          ))}
        </View>
      ) : (
        <Text style={[styles.value, { color: palette.textMuted, fontFamily: type.sans }]}>No topics</Text>
      )}

      <View style={styles.fields}>
        {item.author ? <Field label="Author" value={item.author} testID="detail-author" /> : null}
        <Field label={externalIdLabel(item.source)} value={item.external_id} testID="detail-external-id" />
        <Field label="Added to library" value={formatTimestamp(item.created_at)} testID="detail-saved" />
        <Field label="Record ID" value={item.id} testID="detail-id" />
      </View>
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
  date: {
    marginTop: 12,
    fontSize: 13,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    marginTop: 6,
  },
  section: {
    marginTop: 24,
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
  fields: {
    marginTop: 24,
  },
  field: {
    borderTopWidth: 1,
    paddingVertical: 12,
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
