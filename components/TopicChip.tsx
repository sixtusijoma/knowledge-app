import { StyleSheet, Text, View } from 'react-native';

import { SportsIcon } from '@/components/Icons';
import { useTheme, useType } from '@/lib/theme';
import { isSports } from '@/lib/topics';

export function TopicChip({ topic, testID }: { topic: string; testID?: string }) {
  const { palette } = useTheme();
  const type = useType();
  const sports = isSports(topic);
  return (
    <View
      testID={testID}
      style={[styles.chip, { backgroundColor: sports ? palette.sportsBg : palette.chip }]}
    >
      {sports ? <SportsIcon color={palette.sports} size={12} /> : null}
      <Text style={[styles.text, { color: sports ? palette.sports : palette.chipText, fontFamily: type.sansMedium }]}>
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
