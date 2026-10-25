import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader/500Medium_Italic';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemeProvider, useTheme } from '@/lib/theme';
import { applyWebChrome } from '@/lib/web-chrome';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    Newsreader_600SemiBold,
    Newsreader_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });
  if (!loaded && fontError == null) {
    return null;
  }

  return (
    <ThemeProvider fontsReady={loaded}>
      <ThemedApp />
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { name, palette } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = name === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: palette.bg,
        card: palette.card,
        text: palette.text,
        border: palette.border,
        primary: palette.accent,
        notification: palette.accent,
      },
    };
  }, [name, palette]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    return applyWebChrome(palette.canvas, name);
  }, [palette.canvas, name]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <AppColumn>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ title: 'Knowledge' }} />
          <Stack.Screen name="item/[id]" options={{ title: 'Entry' }} />
        </Stack>
      </AppColumn>
    </NavigationThemeProvider>
  );
}

function AppColumn({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.canvas, { backgroundColor: palette.canvas }]}>
      <View style={[styles.column, { backgroundColor: palette.bg }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});
