import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, useType } from '@/lib/theme';

export default function NotFoundScreen() {
  const { palette } = useTheme();
  const type = useType();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: palette.bg }]}>
        <Text style={[styles.title, { color: palette.text, fontFamily: type.serif }]}>
          That page isn’t in the library.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: palette.accent, fontFamily: type.sansSemibold }]}>
            Back to the feed
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
  },
  link: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 16,
  },
});
