declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL?: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
      // Shared password for the accounts in supabase/seed.sql. Set it for local
      // development only; the landing screen hides its test account list when
      // this is unset, which is what a production build should do.
      EXPO_PUBLIC_SEED_PASSWORD?: string;
    }
  }
}

export {};
