import { StyleSheet, Text, View } from 'react-native';

import { TopicGlyph } from '@/components/TopicGlyph';
import { useTheme, useType } from '@/lib/theme';
import { topicColorKey } from '@/lib/topics';

export function TopicChip({ topic, testID }: { topic: string; testID?: string }) {
  const { palette } = useTheme();
  const type = useType();
  const key = topicColorKey(topic);
  const colors = key ? palette.topic[key] : null;
  return (
    <View
      testID={testID}
      style={[styles.chip, { backgroundColor: colors ? colors.bg : palette.chip }]}
    >
      <TopicGlyph topic={topic} color={colors ? colors.fg : palette.chipText} size={12} />
      <Text style={[styles.text, { color: colors ? colors.fg : palette.chipText, fontFamily: type.sansMedium }]}>
        {topic}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
  },
});
