import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireHandyman, methodNotAllowed, badRequest, notFound, ok } from '../_shared/rbac.ts';

interface HandymanStatusRequest {
  isOnline: boolean;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  const auth = await requireHandyman(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { isOnline }: HandymanStatusRequest = await req.json();
  if (typeof isOnline !== 'boolean') return badRequest('isOnline (boolean) required');

  // Scoped to the JWT's own id — never trust an id from the request body.
  const { data: updated, error: updateError } = await supabase
    .from('handymen')
    .update({
      is_online: isOnline,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('id, is_online, last_seen_at')
    .maybeSingle();

  if (updateError) {
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: updateError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!updated) return notFound('Handyman profile not found');

  return ok(updated);
});
