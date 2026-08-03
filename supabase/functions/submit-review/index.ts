import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  getAuthUser,
  methodNotAllowed,
  badRequest,
  notFound,
  created,
  internalError,
} from '../_shared/rbac.ts';

interface SubmitReviewRequest {
  bookingId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}

const MAX_COMMENT_LENGTH = 1000;

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  const auth = await getAuthUser(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  let body: SubmitReviewRequest;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { bookingId, revieweeId, rating, comment } = body;

  if (!bookingId) return badRequest('bookingId required');
  if (!revieweeId) return badRequest('revieweeId required');

  // rating must be an integer 1..5
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return badRequest('rating must be an integer between 1 and 5');
  }

  // comment is optional; when present it must be a string within the length cap
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== 'string') {
      return badRequest('comment must be a string');
    }
    if (comment.length > MAX_COMMENT_LENGTH) {
      return badRequest(`comment must be at most ${MAX_COMMENT_LENGTH} characters`);
    }
  }

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) return notFound('Booking not found');

  // ── Actor guard: only the client or the assigned handyman may review ─────
  const isClient = booking.client_id === user.id;
  const isHandyman = booking.handyman_id === user.id;
  if (!isClient && !isHandyman) {
    return new Response(
      JSON.stringify({
        error: 'FORBIDDEN',
        message: 'Only the client or assigned handyman can review this booking',
      }),
      { status: 403 }
    );
  }

  // ── Direction guard: the reviewee must be the other participant ─────────
  const expectedReviewee = isClient ? booking.handyman_id : booking.client_id;
  if (revieweeId !== expectedReviewee) {
    return badRequest('revieweeId must be the other participant of the booking');
  }

  // ── Status guard: reviews unlock on PAID (escrow captured) ───────────────
  if (booking.status !== 'PAID') {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: 'Reviews are only available after payment is captured',
        from_status: booking.status,
        to_status: null,
        action: 'SUBMIT_REVIEW',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: ['Booking must be PAID to review'] },
      }),
      { status: 422 }
    );
  }

  // ── Duplicate guard: one review per booking per reviewer ─────────────────
  // Pre-check for a friendly 409. The UNIQUE(booking_id, reviewer_id)
  // constraint below is the authoritative race protection — a concurrent
  // double-submit will surface as a unique_violation, caught and mapped to 409.
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', user.id)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({
        error: 'REVIEW_ALREADY_EXISTS',
        message: 'You have already reviewed this booking',
        details: { bookingId, reviewerId: user.id },
      }),
      { status: 409 }
    );
  }

  const reviewRow = {
    booking_id: bookingId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    rating,
    comment: comment?.trim() ? comment.trim() : null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('reviews')
    .insert(reviewRow)
    .select()
    .single();

  if (insertError) {
    // Race-protection: a concurrent submit that slipped past the pre-check
    // raises a unique constraint violation → map to 409, not 500.
    if (insertError.code === '23505') {
      return new Response(
        JSON.stringify({
          error: 'REVIEW_ALREADY_EXISTS',
          message: 'You have already reviewed this booking',
          details: { bookingId, reviewerId: user.id },
        }),
        { status: 409 }
      );
    }
    return internalError(insertError.message);
  }

  return created(inserted);
});
