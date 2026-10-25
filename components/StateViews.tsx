import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { useTheme, useType } from '@/lib/theme';

const useNativeDriver = Platform.OS !== 'web';

function usePulse(): Animated.Value {
  const [opacity] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver }),
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [opacity]);
  return opacity;
}

export function FeedSkeleton() {
  const { palette } = useTheme();
  const opacity = usePulse();
  return (
    <View testID="feed-skeleton" style={styles.stack}>
      {['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
        <Animated.View
          key={key}
          style={[styles.card, { backgroundColor: palette.skeleton, opacity, borderColor: palette.border }]}
        >
          <View style={[styles.lineShort, { backgroundColor: palette.border }]} />
          <View style={[styles.line, { backgroundColor: palette.border }]} />
          <View style={[styles.lineMedium, { backgroundColor: palette.border }]} />
        </Animated.View>
      ))}
    </View>
  );
}

export function StatsSkeleton() {
  const { palette } = useTheme();
  const opacity = usePulse();
  return (
    <View testID="stats-skeleton" style={styles.stack}>
      <View style={styles.grid}>
        {['a', 'b', 'c', 'd'].map((key) => (
          <Animated.View
            key={key}
            style={[styles.tile, { backgroundColor: palette.skeleton, opacity, borderColor: palette.border }]}
          />
        ))}
      </View>
      <Animated.View style={[styles.panel, { backgroundColor: palette.skeleton, opacity }]} />
      <Animated.View style={[styles.panel, { backgroundColor: palette.skeleton, opacity }]} />
    </View>
  );
}

export function DetailSkeleton() {
  const { palette } = useTheme();
  const opacity = usePulse();
  const bar = { backgroundColor: palette.skeleton };
  return (
    <Animated.View testID="detail-skeleton" style={[styles.detail, { opacity }]}>
      <View style={[styles.detailPill, bar]} />
      <View style={[styles.detailTitle, bar]} />
      <View style={[styles.detailTitleShort, bar]} />
      <View style={[styles.detailLine, bar, { marginTop: 18 }]} />
      <View style={[styles.detailLine, bar]} />
      <View style={[styles.detailLineShort, bar]} />
    </Animated.View>
  );
}

type ErrorProps = {
  title?: string;
  message: string;
  onRetry: () => void;
};

export function ErrorState({ title = 'Couldn’t load the library', message, onRetry }: ErrorProps) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View testID="error-state" style={styles.state}>
      <Text style={[styles.title, { color: palette.text, fontFamily: type.serif }]}>{title}</Text>
      <Text style={[styles.message, { color: palette.textSecondary, fontFamily: type.sans }]}>{message}</Text>
      <PrimaryButton label="Try again" onPress={onRetry} testID="retry-button" />
    </View>
  );
}

type EmptyProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyProps) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View testID="empty-state" style={styles.state}>
      <View style={[styles.mark, { borderColor: palette.accent }]} />
      <Text style={[styles.title, { color: palette.text, fontFamily: type.serif }]}>{title}</Text>
      <Text style={[styles.message, { color: palette.textSecondary, fontFamily: type.sans }]}>{message}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} testID="empty-action" />
      ) : null}
    </View>
  );
}

type BannerProps = {
  message: string;
  busy: boolean;
  onRetry: () => void;
};

export function Banner({ message, busy, onRetry }: BannerProps) {
  const { palette } = useTheme();
  const type = useType();
  return (
    <View testID="banner" style={[styles.banner, { backgroundColor: palette.card, borderColor: palette.danger }]}>
      <Text style={[styles.bannerText, { color: palette.text, fontFamily: type.sans }]}>{message}</Text>
      <Text
        testID="banner-retry"
        accessibilityRole="button"
        disabled={busy}
        onPress={onRetry}
        style={[
          styles.bannerAction,
          { color: busy ? palette.textMuted : palette.accent, fontFamily: type.sansSemibold },
        ]}
      >
        {busy ? 'Trying again…' : 'Try again'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
    paddingTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    minHeight: 112,
  },
  lineShort: {
    width: '32%',
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: '88%',
    height: 14,
    borderRadius: 6,
  },
  lineMedium: {
    width: '64%',
    height: 12,
    borderRadius: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    height: 92,
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
  },
  panel: {
    height: 180,
    borderRadius: 16,
  },
  detail: {
    gap: 12,
    paddingTop: 8,
  },
  detailPill: {
    width: 120,
    height: 20,
    borderRadius: 10,
  },
  detailTitle: {
    width: '92%',
    height: 30,
    borderRadius: 8,
  },
  detailTitleShort: {
    width: '58%',
    height: 30,
    borderRadius: 8,
  },
  detailLine: {
    width: '100%',
    height: 14,
    borderRadius: 7,
  },
  detailLineShort: {
    width: '70%',
    height: 14,
    borderRadius: 7,
  },
  state: {
    paddingVertical: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 4,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bannerAction: {
    fontSize: 14,
  },
});
