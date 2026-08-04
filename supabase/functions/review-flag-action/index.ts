import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  requireAdmin,
  methodNotAllowed,
  badRequest,
  notFound,
  internalError,
  ok,
} from '../_shared/rbac.ts';

interface FlagActionRequest {
  flagId: string;
  action: 'RESOLVE' | 'DISMISS';
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  let body: FlagActionRequest;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { flagId, action } = body ?? {};
  if (!flagId) return badRequest('flagId required');
  if (action !== 'RESOLVE' && action !== 'DISMISS') {
    return badRequest('action must be RESOLVE or DISMISS');
  }

  const { data: flag, error: fetchError } = await supabase
    .from('review_flags')
    .select('id, review_id, status')
    .eq('id', flagId)
    .maybeSingle();

  if (fetchError || !flag) return notFound('Flag not found');
  if (flag.status !== 'PENDING') {
    return badRequest('Flag is not pending review');
  }

  const { error: flagError } = await supabase
    .from('review_flags')
    .update({
      status: action,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', flagId);

  if (flagError) {
    console.error('review-flag-action: flag update failed:', flagError.message);
    return internalError(flagError.message);
  }

  // DISMISS: flag was invalid → unhide the review unless another flag is pending.
  if (action === 'DISMISS') {
    const { count } = await supabase
      .from('review_flags')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', flag.review_id)
      .eq('status', 'PENDING');

    if (count === 0) {
      const { error: unhideError } = await supabase
        .from('reviews')
        .update({ is_hidden: false })
        .eq('id', flag.review_id);
      if (unhideError) {
        console.error('review-flag-action: unhide failed:', unhideError.message);
        return internalError(unhideError.message);
      }
    }
  }

  return ok({ flagId, action });
});
