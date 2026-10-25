import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedIcon, StatsIcon } from '@/components/Icons';
import { useTheme, useType } from '@/lib/theme';

export default function TabLayout() {
  const { palette } = useTheme();
  const type = useType();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: palette.bg,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
        tabBarLabelStyle: {
          fontFamily: type.sansMedium,
          fontSize: 11,
        },
        sceneStyle: {
          backgroundColor: palette.bg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => (
            <FeedIcon color={typeof color === 'string' ? color : palette.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => (
            <StatsIcon color={typeof color === 'string' ? color : palette.textMuted} />
          ),
        }}
      />
    </Tabs>
  );
}
