import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  getAuthUser,
  methodNotAllowed,
  badRequest,
  notFound,
  internalError,
  ok,
} from '../_shared/rbac.ts';

interface FlagReviewRequest {
  reviewId: string;
  reason: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  // Any authenticated user may flag a review for moderation.
  const auth = await getAuthUser(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  let body: FlagReviewRequest;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { reviewId, reason } = body ?? {};
  if (!reviewId) return badRequest('reviewId required');
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return badRequest('reason must be a non-empty string');
  }

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('id')
    .eq('id', reviewId)
    .maybeSingle();

  if (reviewError || !review) return notFound('Review not found');

  const { data: flag, error: flagError } = await supabase
    .from('review_flags')
    .insert({
      review_id: reviewId,
      flagger_id: user.id,
      reason: reason.trim(),
    })
    .select('id, review_id, reason, status, created_at')
    .maybeSingle();

  if (flagError) {
    // Unique index on (review_id, flagger_id) WHERE status = 'PENDING'
    if (String(flagError.code) === '23505') {
      return new Response(
        JSON.stringify({
          error: 'DUPLICATE_FLAG',
          message: 'You have already flagged this review',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    console.error('flag-review: insert failed:', flagError.message);
    return internalError(flagError.message);
  }

  return ok(flag);
});
