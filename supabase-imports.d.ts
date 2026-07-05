declare module 'https://esm.sh/@supabase/supabase-js@2.108.2' {
  export * from '@supabase/supabase-js';
}

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
