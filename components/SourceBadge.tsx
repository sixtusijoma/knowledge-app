import { StyleSheet, Text, View } from 'react-native';

import { useTheme, useType } from '@/lib/theme';
import type { Source } from '@/lib/types';

export function SourceBadge({ source, testID }: { source: Source; testID?: string }) {
  const { palette } = useTheme();
  const type = useType();
  const isX = source === 'X Bookmark';
  return (
    <View style={[styles.badge, { backgroundColor: isX ? palette.xBg : palette.grokBg }]}>
      <Text
        testID={testID}
        style={[styles.text, { color: isX ? palette.xFg : palette.grokFg, fontFamily: type.sansSemibold }]}
      >
        {source}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
