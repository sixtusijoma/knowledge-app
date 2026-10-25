import { Tabs } from 'expo-router';

import { FeedIcon, StatsIcon } from '@/components/Icons';
import { useTheme, useType } from '@/lib/theme';

export default function TabLayout() {
  const { palette } = useTheme();
  const type = useType();

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
        },
        // The stock tab item has 38pt for icon plus label; a 24pt icon box leaves room for a 14pt label line.
        tabBarIconStyle: {
          height: 24,
        },
        tabBarLabelStyle: {
          fontFamily: type.sansMedium,
          fontSize: 11,
          lineHeight: 14,
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
          tabBarIcon: ({ color }) => <FeedIcon color={typeof color === 'string' ? color : palette.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <StatsIcon color={typeof color === 'string' ? color : palette.textMuted} />,
        }}
      />
    </Tabs>
  );
}
