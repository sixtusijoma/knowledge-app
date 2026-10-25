import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'knowledge.theme';

export const darkPalette = {
  canvas: '#070B12',
  bg: '#0C1220',
  card: '#141C2F',
  cardPressed: '#1C2742',
  border: '#2A3854',
  text: '#E7EEF8',
  textSecondary: '#C3D0E2',
  textMuted: '#8EA0B8',
  accent: '#2DD4BF',
  accentText: '#042F2E',
  xBg: '#17263C',
  xFg: '#C5D9F2',
  grokBg: '#12332F',
  grokFg: '#99F6E4',
  xBar: '#7BA4D4',
  grokBar: '#2DD4BF',
  topicOn: '#0C1220',
  topic: {
    sports: { fg: '#86EFAC', bg: '#143024' },
    health: { fg: '#FDA4AF', bg: '#3F1D28' },
    music: { fg: '#C4B5FD', bg: '#2A2152' },
    screen: { fg: '#FCD34D', bg: '#3A2C12' },
    science: { fg: '#7DD3FC', bg: '#0C3044' },
    lifestyle: { fg: '#F9A8D4', bg: '#3B1830' },
    other: { fg: '#94A3B8', bg: '#1C2638' },
  },
  chip: '#1A2640',
  chipText: '#E4ECF7',
  input: '#10192C',
  overlay: 'rgba(5, 10, 20, 0.68)',
  skeleton: '#1E2A42',
  danger: '#F07167',
};

export const lightPalette: Palette = {
  canvas: '#E6EDF5',
  bg: '#F5F8FB',
  card: '#FFFFFF',
  cardPressed: '#E7EEF6',
  border: '#D5E0EC',
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  accent: '#0F766E',
  accentText: '#F0FDFA',
  xBg: '#E7F0FA',
  xFg: '#1E3A5F',
  grokBg: '#E6F7F4',
  grokFg: '#115E59',
  xBar: '#3D6FA3',
  grokBar: '#0F766E',
  topicOn: '#FFFFFF',
  topic: {
    sports: { fg: '#15803D', bg: '#DCFCE7' },
    health: { fg: '#BE123C', bg: '#FFE4E6' },
    music: { fg: '#6D28D9', bg: '#EDE9FE' },
    screen: { fg: '#B45309', bg: '#FEF3C7' },
    science: { fg: '#0369A1', bg: '#E0F2FE' },
    lifestyle: { fg: '#BE185D', bg: '#FCE7F3' },
    other: { fg: '#475569', bg: '#E2E8F0' },
  },
  chip: '#E8EEF5',
  chipText: '#1E293B',
  input: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.42)',
  skeleton: '#E2E8F0',
  danger: '#C2412D',
};

export type Palette = typeof darkPalette;
export type ThemeName = 'dark' | 'light';

export const fontFamily = {
  serif: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_500Medium_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemibold: 'DMSans_600SemiBold',
} as const;

export type Typeface = {
  serif?: string;
  serifItalic?: string;
  sans?: string;
  sansMedium?: string;
  sansSemibold?: string;
};

type ThemeContextValue = {
  name: ThemeName;
  palette: Palette;
  fontsReady: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  fontsReady,
  children,
}: {
  fontsReady: boolean;
  children: ReactNode;
}) {
  const [name, setName] = useState<ThemeName>('dark');
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && (stored === 'light' || stored === 'dark')) {
          setName(stored);
        }
      } finally {
        if (!cancelled) {
          setRestored(true);
        }
      }
    };
    restore().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const next = name === 'dark' ? 'light' : 'dark';
    setName(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, [name]);

  const palette = name === 'dark' ? darkPalette : lightPalette;

  if (!restored) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ name, palette, fontsReady, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}

export function useType(): Typeface {
  const { fontsReady } = useTheme();
  if (!fontsReady) {
    return {};
  }
  return fontFamily;
}

