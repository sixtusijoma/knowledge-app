import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import { readSupabasePublicConfig, SUPABASE_ANON_KEY_DEFAULT, SUPABASE_URL_DEFAULT } from '@/lib/public-env';

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function readExtra(): ExtraConfig {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object') {
    return {};
  }
  return extra as ExtraConfig;
}

export function resolveSupabaseConfig(): { url: string; anonKey: string } {
  const fromEnv = readSupabasePublicConfig();
  const extra = readExtra();
  let url = SUPABASE_URL_DEFAULT;
  if (process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_URL.length > 0) {
    url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  } else if (extra.supabaseUrl && extra.supabaseUrl.length > 0) {
    url = extra.supabaseUrl;
  } else {
    url = fromEnv.url;
  }
  let anonKey = SUPABASE_ANON_KEY_DEFAULT;
  if (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.length > 0) {
    anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  } else if (extra.supabaseAnonKey && extra.supabaseAnonKey.length > 0) {
    anonKey = extra.supabaseAnonKey;
  } else {
    anonKey = fromEnv.anonKey;
  }
  return { url, anonKey };
}

const config = resolveSupabaseConfig();

export const supabase = createClient(config.url, config.anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
