import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportanceDonut, MonthChart, SourceSplit, TopicBars } from '@/components/Charts';
import { Banner, ErrorState, StatsSkeleton } from '@/components/StateViews';
import { formatCount } from '@/lib/format';
import type { Stats } from '@/lib/stats';
import { useTheme, useType } from '@/lib/theme';
import { useStats } from '@/lib/use-stats';

export default function StatsScreen() {
  const { palette } = useTheme();
  const type = useType();
  const insets = useSafeAreaInsets();
  const { stats, loading, refreshing, error, reload } = useStats();

  return (
    <ScrollView
      testID="stats-screen"
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            reload().catch(() => undefined);
          }}
          tintColor={palette.accent}
          colors={[palette.accent]}
          progressBackgroundColor={palette.card}
        />
      }
    >
      <Text style={[styles.kicker, { color: palette.textMuted, fontFamily: type.sans }]}>Library</Text>
      <Text style={[styles.title, { color: palette.text, fontFamily: type.serifItalic }]}>Stats</Text>
      <Text style={[styles.deck, { color: palette.textSecondary, fontFamily: type.sans }]}>
        Live counts from every saved entry.
      </Text>
      {error && stats ? (
        <Banner
          message={error}
          onRetry={() => {
            reload().catch(() => undefined);
          }}
        />
      ) : null}
      {loading && !stats ? <StatsSkeleton /> : null}
      {error && !stats ? (
        <ErrorState
          title="Couldn’t load stats"
          message={error}
          onRetry={() => {
            reload().catch(() => undefined);
          }}
        />
      ) : null}
      {stats ? <StatsBody stats={stats} /> : null}
    </ScrollView>
  );
}

function StatsBody({ stats }: { stats: Stats }) {
  const { palette } = useTheme();
  return (
    <View style={styles.body}>
      <View style={styles.tiles}>
        <Tile label="Entries" value={formatCount(stats.total)} testID="stats-total" />
        <Tile
          label="This month"
          value={formatCount(stats.thisMonth)}
          testID="stats-this-month"
          caption={stats.thisMonthLabel}
          captionTestID="stats-this-month-label"
        />
        <Tile label="X bookmarks" value={formatCount(stats.x)} testID="stats-x" />
        <Tile label="Grok chats" value={formatCount(stats.grok)} testID="stats-grok" />
      </View>
      <Panel eyebrow="By month" title="Entries" note="Dated entries, split by source.">
        <MonthChart stats={stats} />
      </Panel>
      <Panel eyebrow="Sources" title="Where they came from" note="Each entry has one source.">
        <SourceSplit stats={stats} />
      </Panel>
      <Panel eyebrow="Importance" title="How they were marked" note="Each entry has one level.">
        <ImportanceDonut stats={stats} />
      </Panel>
      <Panel
        eyebrow="Topics"
        title="What they cover"
        note="An entry can sit in more than one topic, so these counts can add up to more than the library."
      >
        <TopicBars stats={stats} />
      </Panel>
      <Text style={[styles.footnote, { color: palette.textMuted }]}>Pulled from Supabase just now.</Text>
    </View>
  );
}

function Tile({
  label,
  value,
  testID,
  caption,
  captionTestID,
}: {
  label: string;
  value: string;
  testID: string;
  caption?: string;
  captionTestID?: string;
}) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View style={[styles.tile, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.tileLabel, { color: palette.textMuted, fontFamily: type.sansMedium }]}>{label}</Text>
      <Text testID={testID} style={[styles.tileValue, { color: palette.text, fontFamily: type.serif }]}>
        {value}
      </Text>
      {caption ? (
        <Text
          testID={captionTestID}
          style={[styles.tileCaption, { color: palette.textSecondary, fontFamily: type.sans }]}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function Panel({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.eyebrow, { color: palette.textMuted, fontFamily: type.sansSemibold }]}>{eyebrow}</Text>
      <Text style={[styles.panelTitle, { color: palette.text, fontFamily: type.serif }]}>{title}</Text>
      {note ? <Text style={[styles.note, { color: palette.textSecondary, fontFamily: type.sans }]}>{note}</Text> : null}
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  kicker: {
    fontSize: 13,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    marginTop: 2,
  },
  deck: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 16,
  },
  body: {
    gap: 12,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 96,
  },
  tileLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  tileValue: {
    fontSize: 30,
    marginTop: 6,
  },
  tileCaption: {
    fontSize: 12,
    marginTop: 2,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  panelTitle: {
    fontSize: 22,
    marginTop: 4,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  panelBody: {
    marginTop: 14,
  },
  footnote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
