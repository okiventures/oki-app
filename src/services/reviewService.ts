import { supabase } from '../lib/supabase';
import { Booking, BookingStatus, Review } from '../types';
import { addReview, getRatingForBooking, MOCK_REVIEWS } from '../mocks/reviews';
import { isMockEnv } from './bookingService';

interface ReviewRow {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  created_at: string;
  reviewer?: { full_name: string | null; photo_url: string | null } | null;
}

/** Input for submitReview. reviewerId is only used in mock mode — the real
 * backend derives the reviewer from the authenticated user. */
export interface SubmitReviewInput {
  bookingId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  reviewerId?: string;
}

export class ReviewSubmissionError extends Error {
  status?: number;
  body?: Record<string, unknown>;

  constructor(
    message: string,
    { status, body }: { status?: number; body?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = 'ReviewSubmissionError';
    this.status = status;
    this.body = body;
  }
}

function mapReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer?.full_name ?? '',
    reviewerPhotoUrl: row.reviewer?.photo_url ?? undefined,
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment ?? '',
    createdAt: row.created_at,
  };
}

const REVIEW_SELECT = '*, reviewer:users!reviewer_id(full_name, photo_url)';

function mockHasReviewed(bookingId: string, reviewerId: string): boolean {
  return MOCK_REVIEWS.some((r) => r.bookingId === bookingId && r.reviewerId === reviewerId);
}

/** Reviews written about a user, newest first. Hidden ones are filtered by RLS. */
export async function fetchReviewsForUser(userId: string): Promise<Review[]> {
  if (isMockEnv()) {
    return MOCK_REVIEWS.filter((review) => review.revieweeId === userId);
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);
  return (data ?? []).map((row) => mapReviewRow(row as ReviewRow));
}

/**
 * The review the signed-in user already left on this booking, if any.
 *
 * `reviews_one_per_direction` makes a second one a constraint violation, so the
 * review screen checks this before offering the form.
 */
export async function fetchMyReviewForBooking(bookingId: string): Promise<Review | null> {
  if (isMockEnv()) {
    return MOCK_REVIEWS.find((review) => review.bookingId === bookingId) ?? null;
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('booking_id', bookingId)
    .eq('reviewer_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to check for an existing review: ${error.message}`);
  return data ? mapReviewRow(data as ReviewRow) : null;
}

/** Submit a review for a paid booking. Real path invokes the submit-review Edge
 * Function (PAID guard, participant check, direction check, rating bounds, 409
 * duplicate guard). Mock path appends to MOCK_REVIEWS and simulates the guard. */
export async function submitReview(input: SubmitReviewInput): Promise<Review> {
  if (isMockEnv()) {
    const reviewerId = input.reviewerId ?? '';
    if (mockHasReviewed(input.bookingId, reviewerId)) {
      throw new ReviewSubmissionError('You have already reviewed this booking', {
        status: 409,
        body: { error: 'REVIEW_ALREADY_EXISTS', message: 'You have already reviewed this booking' },
      });
    }

    return addReview({
      bookingId: input.bookingId,
      reviewerId,
      reviewerName: 'Local User',
      revieweeId: input.revieweeId,
      rating: input.rating,
      comment: input.comment ?? '',
    });
  }

  try {
    const { data, error } = await supabase.functions.invoke('submit-review', {
      body: {
        bookingId: input.bookingId,
        revieweeId: input.revieweeId,
        rating: input.rating,
        comment: input.comment ?? null,
      },
    });

    if (error) throw new Error(error.message);

    return data?.data as Review;
  } catch (err) {
    const ctx = (err as any)?.context;
    let parsedBody: Record<string, unknown> | null = null;
    let status: number | undefined;

    if (ctx && typeof ctx.status === 'number') {
      status = ctx.status;
      try {
        parsedBody = JSON.parse(await ctx.text());
      } catch {
        // body not valid JSON — fall through
      }
    }

    const message =
      typeof parsedBody?.message === 'string'
        ? parsedBody.message
        : err instanceof Error
          ? err.message
          : String(err);

    throw new ReviewSubmissionError(message, { status, body: parsedBody ?? undefined });
  }
}

/** Whether the current user already reviewed a booking. Prevents the rating
 * prompt from re-showing for the same actor on the same booking. */
export async function hasReviewed(bookingId: string, reviewerId: string): Promise<boolean> {
  if (isMockEnv()) return mockHasReviewed(bookingId, reviewerId);

  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();

  if (error) return false; // fail open
  return !!data;
}

/** Resolve the review target ("other participant"). Client reviews handyman;
 * handyman reviews client. Returns null for non-participants. */
export function resolveReviewDirection(
  booking: Booking,
  viewerId: string
): { reviewerId: string; revieweeId: string } | null {
  const isClient = booking.clientId === viewerId;
  const isHandyman = booking.handymanId === viewerId;

  if (!isClient && !isHandyman) return null;

  return {
    reviewerId: viewerId,
    revieweeId: isClient ? booking.handymanId : booking.clientId,
  };
}

/** A booking is rateable once it reaches PAID. */
export function isBookingRateable(status: BookingStatus): boolean {
  return status === BookingStatus.Paid;
}

export { getRatingForBooking };
