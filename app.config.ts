import type { ExpoConfig } from 'expo/config';

// The anon key is public by design: row level security only allows reads.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'your-supabase-anon-key';

const config: ExpoConfig = {
  name: 'Knowledge',
  slug: 'knowledge',
  owner: 'setwise-sixtus',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'knowledge',
  userInterfaceStyle: 'dark',
  // `exposdk:<sdk>`, the runtime Expo Go reports, so published updates open in Expo Go.
  runtimeVersion: { policy: 'sdkVersion' },
  updates: {
    url: 'https://u.expo.dev/58df4489-fd92-4ae6-8644-2b9f3daa4c05',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.sixtus.knowledge',
  },
  android: {
    package: 'com.sixtus.knowledge',
    adaptiveIcon: {
      backgroundColor: '#100E0C',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#100E0C',
      },
    ],
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl,
    supabaseAnonKey,
    eas: { projectId: '58df4489-fd92-4ae6-8644-2b9f3daa4c05' },
  },
};

export default config;
