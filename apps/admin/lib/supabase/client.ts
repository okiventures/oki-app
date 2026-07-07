import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';

// Cookie-backed browser client so the session is readable by middleware /
// server components (enables real server-side auth gating, not just a
// client-side redirect).
export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
