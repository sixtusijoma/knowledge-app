import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Importance } from '@/lib/types';

const STORAGE_KEY = 'knowledge.theme';

export const darkPalette = {
  canvas: '#070605',
  bg: '#100E0C',
  card: '#1C1916',
  cardPressed: '#26221D',
  border: '#322E28',
  text: '#F6F1E8',
  textSecondary: '#C9BFB2',
  textMuted: '#A3988C',
  accent: '#E09A4B',
  accentText: '#1A1208',
  xBg: '#1A2836',
  xFg: '#A9CFFF',
  grokBg: '#2C2418',
  grokFg: '#F0C98A',
  xBar: '#7EAAE0',
  grokBar: '#E09A4B',
  high: '#F07167',
  medium: '#E09A4B',
  low: '#9BB992',
  unset: '#8A8178',
  chip: '#26221C',
  chipText: '#E7DFD3',
  input: '#181512',
  overlay: 'rgba(0, 0, 0, 0.62)',
  skeleton: '#2A261F',
  danger: '#F07167',
};

export const lightPalette: Palette = {
  canvas: '#E4DCD0',
  bg: '#F4EFE7',
  card: '#FFFCF7',
  cardPressed: '#F3EBE2',
  border: '#E3D9CC',
  text: '#1C1814',
  textSecondary: '#514A42',
  textMuted: '#6F675C',
  accent: '#A85B22',
  accentText: '#FFFCF7',
  xBg: '#E5F0FA',
  xFg: '#18497A',
  grokBg: '#F8EEDD',
  grokFg: '#7A4E12',
  xBar: '#3D6FA3',
  grokBar: '#C47A32',
  high: '#C2412D',
  medium: '#A85B22',
  low: '#3E6B46',
  unset: '#8A8178',
  chip: '#EBE3D8',
  chipText: '#3A342C',
  input: '#FFFCF7',
  overlay: 'rgba(28, 24, 20, 0.45)',
  skeleton: '#E6DDD1',
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

export function importanceColor(palette: Palette, importance: Importance | null): string {
  if (importance === 'High') {
    return palette.high;
  }
  if (importance === 'Medium') {
    return palette.medium;
  }
  if (importance === 'Low') {
    return palette.low;
  }
  return palette.unset;
}
