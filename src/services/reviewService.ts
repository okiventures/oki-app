import { supabase } from '../lib/supabase';
import { Review } from '../types';
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

export interface SubmitReviewInput {
  bookingId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
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

/** Reviews written about a user, newest first. Hidden ones are filtered by RLS. */
export async function fetchReviewsForUser(userId: string): Promise<Review[]> {
  if (isMockEnv()) {
    const { MOCK_REVIEWS } = await import('../mocks/reviews');
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
    const { MOCK_REVIEWS } = await import('../mocks/reviews');
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

/**
 * Write a review.
 *
 * reviewer_id is taken from the session rather than the caller: the RLS insert
 * policy pins it to auth.uid() anyway, and it also requires the booking to be
 * COMPLETED or PAID with the caller as a participant. A rejection here means
 * one of those is untrue.
 */
export async function submitReview(input: SubmitReviewInput): Promise<Review> {
  if (isMockEnv()) {
    const { addReview } = await import('../mocks/reviews');
    return addReview({
      bookingId: input.bookingId,
      reviewerId: 'mock-reviewer',
      reviewerName: 'You',
      revieweeId: input.revieweeId,
      rating: input.rating,
      comment: input.comment ?? '',
    });
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('You must be signed in to leave a review.');

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      booking_id: input.bookingId,
      reviewer_id: userId,
      reviewee_id: input.revieweeId,
      rating: input.rating,
      comment: input.comment?.trim() ? input.comment.trim() : null,
    })
    .select(REVIEW_SELECT)
    .single();

  if (error) {
    // reviews_one_per_direction
    if (error.code === '23505') throw new Error('You have already reviewed this booking.');
    // reviews_insert_participant refused: not a participant, or the job is not
    // finished yet.
    if (error.code === '42501') {
      throw new Error('This booking cannot be reviewed yet.');
    }
    throw new Error(`Failed to submit review: ${error.message}`);
  }

  return mapReviewRow(data as ReviewRow);
}
