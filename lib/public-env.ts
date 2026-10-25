/**
 * Public Supabase settings for the Knowledge project.
 * The anon key is designed to ship in a client. RLS allows select only.
 */
export const SUPABASE_URL_DEFAULT = 'https://your-project.supabase.co';

export const SUPABASE_ANON_KEY_DEFAULT =
  'your-supabase-anon-key';

export function readSupabasePublicConfig(): { url: string; anonKey: string } {
  const urlFromEnv = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const keyFromEnv = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  let url = SUPABASE_URL_DEFAULT;
  if (urlFromEnv && urlFromEnv.length > 0) {
    url = urlFromEnv;
  }
  let anonKey = SUPABASE_ANON_KEY_DEFAULT;
  if (keyFromEnv && keyFromEnv.length > 0) {
    anonKey = keyFromEnv;
  }
  return { url, anonKey };
}
