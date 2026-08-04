import {
  submitReview,
  hasReviewed,
  fetchReviewsForUser,
  fetchMyReviewForBooking,
  resolveReviewDirection,
  isBookingRateable,
  ReviewSubmissionError,
} from '../../src/services/reviewService';
import { isMockEnv } from '../../src/services/bookingService';
import { Booking, BookingStatus, Review } from '../../src/types';

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    functions: { invoke: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('../../src/services/bookingService', () => {
  const actual = jest.requireActual('../../src/services/bookingService');
  return { ...actual, isMockEnv: jest.fn(() => true) };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { supabase: mockedSupabase } = require('../../src/lib/supabase');

/** Mirrors the FunctionsHttpError shape the supabase-js client throws. */
function edgeError(status: number, body: string) {
  const err = new Error('Edge Function returned a non-2xx status code') as Error & {
    context: { status: number; text: () => Promise<string> };
  };
  err.context = { status, text: async () => body };
  return err;
}

beforeEach(() => {
  jest.clearAllMocks();
  (isMockEnv as jest.Mock).mockReturnValue(true);
});

describe('submitReview (real env — submit-review Edge Function)', () => {
  beforeEach(() => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
  });

  it('invokes the edge function and returns the created review', async () => {
    const created = {
      id: 'rev-1',
      bookingId: 'b1',
      reviewerId: 'u1',
      revieweeId: 'h1',
      rating: 5,
      comment: 'Great work',
      createdAt: '2026-08-04T12:00:00.000Z',
    };
    (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { data: created },
      error: null,
    });

    const result = await submitReview({
      bookingId: 'b1',
      revieweeId: 'h1',
      rating: 5,
      comment: 'Great work',
    });

    // reviewerId is deliberately not sent — the function derives it from the JWT.
    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith('submit-review', {
      body: { bookingId: 'b1', revieweeId: 'h1', rating: 5, comment: 'Great work' },
    });
    expect(result).toMatchObject<Partial<Review>>({ id: 'rev-1', rating: 5 });
  });

  it('sends a null comment when none was written', async () => {
    (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { data: {} },
      error: null,
    });

    await submitReview({ bookingId: 'b1', revieweeId: 'h1', rating: 4 });

    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith('submit-review', {
      body: { bookingId: 'b1', revieweeId: 'h1', rating: 4, comment: null },
    });
  });

  it('surfaces the duplicate guard as a 409 ReviewSubmissionError', async () => {
    (mockedSupabase.functions.invoke as jest.Mock).mockRejectedValue(
      edgeError(
        409,
        JSON.stringify({
          error: 'REVIEW_ALREADY_EXISTS',
          message: 'You have already reviewed this booking',
        })
      )
    );

    // The review screen keys its "already reviewed" state off status === 409.
    await expect(
      submitReview({ bookingId: 'b1', revieweeId: 'h1', rating: 4 })
    ).rejects.toMatchObject({
      name: 'ReviewSubmissionError',
      status: 409,
      message: 'You have already reviewed this booking',
      body: { error: 'REVIEW_ALREADY_EXISTS' },
    });
  });

  it('surfaces the PAID guard rejection with the server message', async () => {
    (mockedSupabase.functions.invoke as jest.Mock).mockRejectedValue(
      edgeError(403, JSON.stringify({ error: 'BOOKING_NOT_PAID', message: 'Booking is not paid' }))
    );

    await expect(
      submitReview({ bookingId: 'b1', revieweeId: 'h1', rating: 4 })
    ).rejects.toMatchObject({ status: 403, message: 'Booking is not paid' });
  });

  it('falls back to the raw error when the body is not JSON', async () => {
    (mockedSupabase.functions.invoke as jest.Mock).mockRejectedValue(
      edgeError(500, '<html>gateway error</html>')
    );

    const err = await submitReview({ bookingId: 'b1', revieweeId: 'h1', rating: 4 }).catch(
      (e) => e
    );

    expect(err).toBeInstanceOf(ReviewSubmissionError);
    expect(err.status).toBe(500);
    expect(err.body).toBeUndefined();
    expect(err.message).toBe('Edge Function returned a non-2xx status code');
  });

  it('wraps a transport-level error with no context', async () => {
    (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'network unreachable' },
    });

    await expect(
      submitReview({ bookingId: 'b1', revieweeId: 'h1', rating: 4 })
    ).rejects.toMatchObject({
      name: 'ReviewSubmissionError',
      message: 'network unreachable',
      status: undefined,
    });
  });
});

describe('submitReview (mock env)', () => {
  it('appends the review and never touches the backend', async () => {
    const result = await submitReview({
      bookingId: 'mock-booking-1',
      revieweeId: 'h9',
      rating: 5,
      comment: 'Nice',
      reviewerId: 'c9',
    });

    expect(result).toMatchObject({ bookingId: 'mock-booking-1', reviewerId: 'c9', rating: 5 });
    expect(mockedSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('simulates the 409 duplicate guard for the same reviewer', async () => {
    await submitReview({
      bookingId: 'mock-booking-2',
      revieweeId: 'h9',
      rating: 4,
      reviewerId: 'c9',
    });

    await expect(
      submitReview({
        bookingId: 'mock-booking-2',
        revieweeId: 'h9',
        rating: 3,
        reviewerId: 'c9',
      })
    ).rejects.toMatchObject({ name: 'ReviewSubmissionError', status: 409 });
  });
});

describe('hasReviewed', () => {
  it('reads the mock set in mock env', async () => {
    // MOCK_REVIEWS seeds r1 as booking b2 reviewed by c1.
    await expect(hasReviewed('b2', 'c1')).resolves.toBe(true);
    await expect(hasReviewed('b2', 'someone-else')).resolves.toBe(false);
  });

  it('queries by booking and reviewer in real env', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'rev-1' }, error: null }),
    };
    (mockedSupabase.from as jest.Mock).mockReturnValue(chain);

    await expect(hasReviewed('b1', 'u1')).resolves.toBe(true);
    expect(chain.eq).toHaveBeenCalledWith('booking_id', 'b1');
    expect(chain.eq).toHaveBeenCalledWith('reviewer_id', 'u1');
  });

  it('fails open so a lookup error cannot block the prompt forever', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
    });

    await expect(hasReviewed('b1', 'u1')).resolves.toBe(false);
  });
});

describe('fetchReviewsForUser', () => {
  it('filters the mock set by reviewee in mock env', async () => {
    const result = await fetchReviewsForUser('h1');
    expect(result.every((review) => review.revieweeId === 'h1')).toBe(true);
  });

  it('maps rows newest first in real env', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'db1',
            booking_id: 'b1',
            reviewer_id: 'c1',
            reviewee_id: 'h1',
            rating: 5,
            comment: 'Great job',
            is_hidden: false,
            created_at: '2026-07-01T00:00:00Z',
            reviewer: { full_name: 'Ishah Bautista', photo_url: 'http://img/1' },
          },
        ],
        error: null,
      }),
    };
    (mockedSupabase.from as jest.Mock).mockReturnValue(chain);

    const result = await fetchReviewsForUser('h1');

    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result[0]).toMatchObject({
      id: 'db1',
      reviewerName: 'Ishah Bautista',
      reviewerPhotoUrl: 'http://img/1',
      comment: 'Great job',
    });
  });

  it('throws on query error', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
    });

    await expect(fetchReviewsForUser('h1')).rejects.toThrow('db down');
  });
});

describe('fetchMyReviewForBooking', () => {
  it('returns null without querying when nobody is signed in', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    await expect(fetchMyReviewForBooking('b1')).resolves.toBeNull();
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it('returns the signed-in reviewer own review', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } } });
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'db1',
          booking_id: 'b1',
          reviewer_id: 'u1',
          reviewee_id: 'h1',
          rating: 4,
          comment: null,
          is_hidden: false,
          created_at: '2026-07-01T00:00:00Z',
        },
        error: null,
      }),
    };
    (mockedSupabase.from as jest.Mock).mockReturnValue(chain);

    const result = await fetchMyReviewForBooking('b1');

    expect(chain.eq).toHaveBeenCalledWith('booking_id', 'b1');
    expect(chain.eq).toHaveBeenCalledWith('reviewer_id', 'u1');
    expect(result).toMatchObject({ id: 'db1', comment: '' });
  });
});

describe('resolveReviewDirection', () => {
  const booking = { id: 'b1', clientId: 'c1', handymanId: 'h1' } as Booking;

  it('points the client at the handyman', () => {
    expect(resolveReviewDirection(booking, 'c1')).toEqual({
      reviewerId: 'c1',
      revieweeId: 'h1',
    });
  });

  it('points the handyman at the client', () => {
    expect(resolveReviewDirection(booking, 'h1')).toEqual({
      reviewerId: 'h1',
      revieweeId: 'c1',
    });
  });

  it('returns null for a non-participant', () => {
    expect(resolveReviewDirection(booking, 'stranger')).toBeNull();
  });
});

describe('isBookingRateable', () => {
  it('is true only once the booking is PAID', () => {
    expect(isBookingRateable(BookingStatus.Paid)).toBe(true);
    expect(isBookingRateable(BookingStatus.Completed)).toBe(false);
    expect(isBookingRateable(BookingStatus.Pending)).toBe(false);
  });
});
