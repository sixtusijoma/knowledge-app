import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

export function openExternal(url: string): void {
  if (Platform.OS === 'web') {
    const browser = globalThis as { open?: (href: string, target: string, features: string) => void };
    if (typeof browser.open === 'function') {
      browser.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
  }
  WebBrowser.openBrowserAsync(url).catch(() => {
    Linking.openURL(url).catch(() => undefined);
  });
}
