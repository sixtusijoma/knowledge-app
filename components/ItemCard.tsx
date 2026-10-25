import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SourceBadge } from '@/components/SourceBadge';
import { formatItemDate } from '@/lib/dates';
import { importanceLabel, meaningfulSummary } from '@/lib/format';
import { importanceColor, useTheme, useType } from '@/lib/theme';
import type { Item } from '@/lib/types';

export function ItemCard({ item }: { item: Item }) {
  const { palette } = useTheme();
  const type = useType();
  const tone = importanceColor(palette, item.importance);
  const summary = meaningfulSummary(item);

  return (
    <Pressable
      testID="item-card"
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.source}, ${formatItemDate(item.item_date)}, ${importanceLabel(item.importance)} importance.`}
      onPress={() => {
        router.push({
          pathname: '/item/[id]',
          params: { id: item.id },
        });
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? palette.cardPressed : palette.card,
          borderColor: palette.border,
          borderLeftColor: tone,
        },
      ]}
    >
      <View style={styles.meta}>
        <SourceBadge source={item.source} />
        <Text style={[styles.date, { color: palette.textMuted, fontFamily: type.sans }]}>
          {formatItemDate(item.item_date)}
        </Text>
        <Text style={[styles.importance, { color: tone, fontFamily: type.sansMedium }]}>
          {importanceLabel(item.importance)}
        </Text>
      </View>
      <Text numberOfLines={3} style={[styles.title, { color: palette.text, fontFamily: type.serif }]}>
        {item.title}
      </Text>
      {summary ? (
        <Text numberOfLines={2} style={[styles.summary, { color: palette.textSecondary, fontFamily: type.sans }]}>
          {summary}
        </Text>
      ) : null}
      <View style={styles.footer}>
        <View style={styles.topics}>
          {item.topics.map((topic) => (
            <View key={topic} style={[styles.chip, { backgroundColor: palette.chip }]}>
              <Text style={[styles.chipText, { color: palette.chipText, fontFamily: type.sansMedium }]}>{topic}</Text>
            </View>
          ))}
        </View>
        {item.author ? (
          <Text numberOfLines={1} style={[styles.author, { color: palette.textMuted, fontFamily: type.sans }]}>
            {item.author}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  importance: {
    marginLeft: 'auto',
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  topics: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
  },
  author: {
    maxWidth: 110,
    fontSize: 12,
    marginTop: 4,
  },
});
