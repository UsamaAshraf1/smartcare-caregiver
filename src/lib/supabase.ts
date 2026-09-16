/**
 * Supabase client — talks to the self-hosted Auth/PostgREST/Realtime/Storage
 * stack running behind the Kong gateway. TEMPORARY dev sandbox in AWS
 * us-east-1 (see infra/aws/README.md) while the UAE data-residency question
 * for me-central-1 is resolved; do not point this at real patient data.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Trims whitespace and strips anything outside the printable-ASCII range.
 * Both values end up as literal HTTP header content (`apikey`,
 * `Authorization: Bearer <key>`) on every request — headers can only hold
 * Latin-1 bytes, so a stray non-ASCII character here (an invisible
 * character picked up from copy/pasting into a dashboard, a trailing
 * newline, a smart-quote autocorrect) throws deep inside the browser's
 * fetch implementation with a near-useless error ("Type error" in Safari,
 * a raw byte-value message in Firefox/Chrome) instead of failing clearly
 * at the one place that actually knows what's wrong.
 */
function sanitizeEnvValue(name: string, raw: string | undefined): string {
  const value = (raw ?? '').trim();
  // eslint-disable-next-line no-control-regex
  const stripped = value.replace(/[^\x20-\x7E]/g, '');
  if (!stripped) {
    throw new Error(`${name} is missing — check your environment configuration.`);
  }
  if (stripped.length !== value.length) {
    console.error(
      `[supabase] ${name} contained ${value.length - stripped.length} non-ASCII character(s) — ` +
        `they were stripped, but the stored value is corrupted and should be re-entered.`,
    );
  }
  return stripped;
}

const supabaseUrl = sanitizeEnvValue('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = sanitizeEnvValue('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
