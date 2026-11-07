import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import { isSampleMode } from '@/lib/sample-mode';

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

// Env vars win; app.config.ts carries the public project values as the fallback.
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey;

// Sample mode never receives the real project URL, even if those variables are set.
const sampleMode = isSampleMode();
const clientUrl = sampleMode ? 'http://127.0.0.1' : url;
const clientKey = sampleMode ? 'sample' : anonKey;

if (!clientUrl || !clientKey) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
