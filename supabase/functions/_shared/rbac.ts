import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

export type RbacUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthSuccess = { user: RbacUser; supabase: SupabaseClient };
export type AuthFailure = { error: Response };

/**
 * Owner-privilege client for server-authoritative writes.
 *
 * Booking lifecycle transitions and the booking_events audit log are deliberately
 * not writable by the authenticated role: RLS pins status/money columns on
 * `bookings` and grants no INSERT on `booking_events` at all, so a client cannot
 * forge a transition by calling PostgREST directly. The Edge Functions are the
 * trusted path — they authorise the caller themselves (requireHandyman/
 * requireClient plus explicit ownership and guard checks) and then write with
 * this client.
 *
 * Only ever use it after those checks have passed, and never for reads that
 * should stay scoped to the caller.
 */
export function serviceClient(): SupabaseClient {
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  if (!serviceRoleKey) throw new Error('Missing service role key env var');

  return createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getAuthUser(req: Request): Promise<AuthSuccess | AuthFailure> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      error: new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return {
    user: { id: user.id, email: user.email, user_metadata: user.user_metadata },
    supabase,
  };
}

export async function requireRole(
  req: Request,
  role: 'admin' | 'handyman' | 'client'
): Promise<AuthSuccess | AuthFailure> {
  const auth = await getAuthUser(req);
  if ('error' in auth) return auth;

  const table = role === 'admin' ? 'users' : role === 'handyman' ? 'handymen' : 'users';
  const selectCol = role === 'admin' || role === 'client' ? 'user_type' : 'id';

  const filters = [`id=eq.${encodeURIComponent(auth.user.id)}`];
  if (role === 'admin' || role === 'client') {
    filters.push(`user_type=eq.${encodeURIComponent(role)}`);
  }
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    return {
      error: new Response(
        JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Missing service role key env var' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const checkResp = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/rest/v1/${table}?${filters.join('&')}&select=${selectCol}`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: Deno.env.get('SUPABASE_ANON_KEY')!,
      },
    }
  );

  const data = await checkResp.json();
  if (!Array.isArray(data) || data.length === 0) {
    return {
      error: new Response(
        JSON.stringify({ error: 'FORBIDDEN', message: `User is not a ${role}` }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return auth;
}

export const requireAdmin = (req: Request) => requireRole(req, 'admin');
export const requireHandyman = (req: Request) => requireRole(req, 'handyman');
export const requireClient = (req: Request) => requireRole(req, 'client');

export function unauthorized(message = 'Authentication required'): Response {
  return new Response(JSON.stringify({ error: 'UNAUTHORIZED', message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function forbidden(message = 'Access denied'): Response {
  return new Response(JSON.stringify({ error: 'FORBIDDEN', message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: 'BAD_REQUEST', message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function notFound(message = 'Resource not found'): Response {
  return new Response(JSON.stringify({ error: 'NOT_FOUND', message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function internalError(message = 'Internal error'): Response {
  return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function ok<T>(data: T): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function created<T>(data: T): Response {
  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
