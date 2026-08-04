import { supabase } from '../lib/supabase';
import { isMockEnv } from './bookingService';
import { addReview } from '../mocks/reviews';
import { Review } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubmitReviewInput {
  bookingId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  revieweeId: string;
  rating: number;
  comment: string;
}

export interface ReviewRow {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  created_at: string;
}

// ─── Submit Review ────────────────────────────────────────────────────────────

/**
 * Submit a review for a completed/paid booking.
 *
 * Real path: inserts into `reviews` via PostgREST. RLS
 * (`reviews_insert_participant`) enforces that:
 *   - the reviewer is the authenticated user,
 *   - the booking is in COMPLETED or PAID status,
 *   - the reviewer is a participant (client or handyman) of the booking.
 *
 * The DB layer also rejects a second review from the same reviewer for the
 * same booking (`reviews_one_per_direction` unique constraint) — the caller
 * should surface that as a 409-equivalent conflict.
 *
 * Mock path: appends to the in-memory review store for demo/dev environments
 * where no real backend is configured.
 */
export async function submitReview(input: SubmitReviewInput): Promise<Review> {
  if (isMockEnv()) {
    const review = addReview({
      bookingId: input.bookingId,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      reviewerPhotoUrl: input.reviewerPhotoUrl,
      revieweeId: input.revieweeId,
      rating: input.rating,
      comment: input.comment,
    });
    return review;
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      booking_id: input.bookingId,
      reviewer_id: input.reviewerId,
      reviewee_id: input.revieweeId,
      rating: input.rating,
      comment: input.comment || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already submitted a review for this booking.');
    }
    throw new Error(`Failed to submit review: ${error.message}`);
  }

  return mapReviewRow(data as ReviewRow);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    reviewerId: row.reviewer_id,
    reviewerName: '',
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment ?? '',
    createdAt: row.created_at,
  };
}
