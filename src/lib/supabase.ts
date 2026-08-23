import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { SupabaseAuthStorage } from './secureStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// An absent URL is the offline-demo case, not a misconfiguration: isMockEnv()
// in bookingService reads exactly this to decide mock mode, and every caller
// gated on it never reaches the network. Throwing here contradicted that — it
// killed the app at import, before a single screen rendered, so the documented
// way into mock mode crashed instead of entering it. Fall back to an
// unreachable placeholder so the client constructs and the mock paths run.
//
// The placeholder deliberately contains 'your-project', the other string
// isMockEnv() treats as mock, so the two agree however the env is set.
const MOCK_URL = 'https://your-project.supabase.co';
const MOCK_ANON_KEY = 'offline-demo-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'supabase: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set — running on mock data. Set both in .env to talk to a real backend.'
  );
}

const resolvedUrl = supabaseUrl || MOCK_URL;
const resolvedAnonKey = supabaseAnonKey || MOCK_ANON_KEY;

export const supabase = createClient(resolvedUrl, resolvedAnonKey, {
  auth: {
    // session tokens live in the OS keychain/keystore, not plaintext storage
    storage: SupabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
