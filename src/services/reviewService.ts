import { supabase } from '../lib/supabase';
import { Booking, BookingStatus, Review, ReviewFlag, ReviewSort } from '../types';
import { addReview, getRatingForBooking, MOCK_REVIEWS } from '../mocks';
import { isMockEnv } from './bookingService';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

// Supabase `users.id` / `reviews.reviewee_id` are UUID columns. Placeholder ids like
// 'h1' must never reach the backend, or Postgres throws "invalid input syntax for
// type uuid".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ReviewPage {
  reviews: Review[];
  hasMore: boolean;
}

export type FlaggedReviewRow = ReviewFlag;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Not authenticated');
  return data.session.access_token;
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

interface ReviewDbRow {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  photos?: string[];
  reviewer?: { full_name: string | null; photo_url: string | null } | null;
}

function mapReviewRow(row: ReviewDbRow): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer?.full_name ?? 'Reviewer',
    reviewerPhotoUrl: row.reviewer?.photo_url ?? undefined,
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment ?? '',
    createdAt: row.created_at,
    photos: row.photos ?? [],
  };
}

const REVIEW_SELECT = '*, reviewer:users!reviewer_id(full_name, photo_url)';

function mockHasReviewed(bookingId: string, reviewerId: string): boolean {
  return MOCK_REVIEWS.some((r) => r.bookingId === bookingId && r.reviewerId === reviewerId);
}

// ─── Fetch reviews for a profile (public, hidden ones excluded) ──────────────

export async function fetchReviewsForUser(
  userId: string,
  opts: { page?: number; limit?: number; sort?: ReviewSort } = {}
): Promise<ReviewPage> {
  const { page = 1, limit = 10, sort = 'recent' } = opts;

  if (isMockEnv()) {
    const mock = MOCK_REVIEWS.filter((r) => r.revieweeId === userId);
    const sorted = [...mock].sort((a, b) =>
      sort === 'rating'
        ? b.rating - a.rating
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const start = (page - 1) * limit;
    return {
      reviews: sorted.slice(start, start + limit),
      hasMore: start + limit < sorted.length,
    };
  }

  // Real backend: reviewee_id is a UUID column — a mock/placeholder id (e.g. 'h1')
  // would raise "invalid input syntax for type uuid". Return an empty page instead.
  if (!UUID_RE.test(userId)) {
    return { reviews: [], hasMore: false };
  }

  const query = supabase
    .from('reviews')
    .select('*, reviewer:users!reviews_reviewer_id_fkey(full_name, photo_url)')
    .eq('reviewee_id', userId)
    .eq('is_hidden', false);

  if (sort === 'rating') {
    query.order('rating', { ascending: false });
  }
  query.order('created_at', { ascending: false });

  const { data, error } = await query.range((page - 1) * limit, page * limit - 1);
  if (error) throw new Error(error.message);

  const reviews = (data ?? []).map(mapReviewRow);
  return { reviews, hasMore: reviews.length === limit };
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
  return data ? mapReviewRow(data as ReviewDbRow) : null;
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

// ─── Flag a review (any authenticated user) ──────────────────────────────────

export async function flagReview(reviewId: string, reason: string): Promise<void> {
  if (isMockEnv()) {
    // No backend in mock mode — treat flagging as a no-op success.
    return;
  }

  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/flag-review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reviewId, reason }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Failed to flag review (${res.status})`);
  }
}

// ─── Admin: flagged reviews queue ────────────────────────────────────────────

export async function fetchFlaggedReviews(
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED' = 'PENDING'
): Promise<FlaggedReviewRow[]> {
  if (isMockEnv()) return [];

  const token = await getAccessToken();
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/reviews-admin-queue?status=${encodeURIComponent(status)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Failed to load flagged reviews (${res.status})`);

  const body = await res.json();
  return (body.data?.flags ?? []).map((f: Record<string, unknown>) => ({
    id: f.id as string,
    reviewId: (f.review as Record<string, unknown> | undefined)?.id as string,
    flaggerId: (f.flagger as Record<string, unknown> | undefined)?.id as string,
    flaggerName: (f.flagger as Record<string, unknown> | undefined)?.full_name as string,
    reason: f.reason as string,
    status: f.status as ReviewFlag['status'],
    createdAt: f.created_at as string,
    resolvedAt: (f.resolved_at as string) ?? undefined,
    review: f.review ? mapReviewRow(f.review as unknown as ReviewDbRow) : undefined,
  }));
}

// ─── Admin: resolve or dismiss a flag ────────────────────────────────────────

export async function resolveReviewFlag(
  flagId: string,
  action: 'RESOLVE' | 'DISMISS'
): Promise<void> {
  if (isMockEnv()) return;

  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/review-flag-action`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ flagId, action }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Failed to update review flag (${res.status})`);
  }
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
