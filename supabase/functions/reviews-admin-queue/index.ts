import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { requireAdmin, methodNotAllowed, badRequest, ok } from '../_shared/rbac.ts';

const VALID_STATUSES = ['PENDING', 'RESOLVED', 'DISMISSED'];

serve(async (req: Request) => {
  if (req.method !== 'GET') return methodNotAllowed();

  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const url = new URL(req.url);
  const status = (url.searchParams.get('status') ?? 'PENDING').toUpperCase();
  if (!VALID_STATUSES.includes(status)) {
    return badRequest(`status must be one of ${VALID_STATUSES.join(', ')}`);
  }
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20));

  const { data, error } = await supabase
    .from('review_flags')
    .select(
      `
      id,
      reason,
      status,
      created_at,
      resolved_at,
      resolved_by,
      flagger:users!review_flags_flagger_id_fkey(full_name, photo_url),
      review:reviews!review_flags_review_id_fkey(
        id,
        rating,
        comment,
        created_at,
        is_hidden,
        reviewer:users!reviews_reviewer_id_fkey(full_name, photo_url),
        reviewee:users!reviews_reviewee_id_fkey(full_name)
      )
    `
    )
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error('reviews-admin-queue: query failed:', error.message);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return ok({ flags: data ?? [], page, limit });
});
