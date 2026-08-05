import {
  fetchReviewsForUser,
  fetchMyReviewForBooking,
  submitReview,
  hasReviewed,
  resolveReviewDirection,
  isBookingRateable,
  flagReview,
  fetchFlaggedReviews,
  resolveReviewFlag,
  ReviewSubmissionError,
} from '../../src/services/reviewService';
import { isMockEnv } from '../../src/services/bookingService';
import { Booking, BookingStatus, Review } from '../../src/types';

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(), getUser: jest.fn() },
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

const USER_UUID = '00000000-0000-0000-0000-000000000001';

function buildRangeChain(resolved: { data: unknown; error: { message: string } | null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue(resolved),
  };
  return chain;
}

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

describe('fetchReviewsForUser (mock env)', () => {
  it('returns reviews for the requested user, most recent first', async () => {
    const result = await fetchReviewsForUser('h1', { sort: 'recent' });

    expect(result.reviews.every((r) => r.revieweeId === 'h1')).toBe(true);
    expect(result.reviews.length).toBe(5);
    expect(result.reviews[0].id).toBe('r2');
  });

  it('sorts by rating descending when sort = rating', async () => {
    const result = await fetchReviewsForUser('h2', { sort: 'rating', limit: 10 });

    expect(result.reviews[0].rating).toBeGreaterThanOrEqual(
      result.reviews[result.reviews.length - 1].rating
    );
  });

  it('paginates with hasMore flag', async () => {
    // h2 has 2 reviews in the mock set, so limit 1 → page 1 hasMore true, page 2 hasMore false
    const page1 = await fetchReviewsForUser('h2', { page: 1, limit: 1 });
    expect(page1.reviews).toHaveLength(1);
    expect(page1.hasMore).toBe(true);

    const page2 = await fetchReviewsForUser('h2', { page: 2, limit: 1 });
    expect(page2.reviews).toHaveLength(1);
    expect(page2.hasMore).toBe(false);
  });

  it('returns empty list for a user with no reviews', async () => {
    const result = await fetchReviewsForUser('nobody', {});
    expect(result.reviews).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});

describe('fetchReviewsForUser (real env)', () => {
  beforeEach(() => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
  });

  it('maps DB rows and excludes hidden reviews', async () => {
    (mockedSupabase.from as jest.Mock).mockReturnValue(
      buildRangeChain({
        data: [
          {
            id: 'db1',
            booking_id: 'b1',
            reviewer_id: 'c1',
            reviewee_id: USER_UUID,
            rating: 5,
            comment: 'Great job',
            created_at: '2026-07-01T00:00:00Z',
            photos: [],
            reviewer: { full_name: 'Ishah Bautista', photo_url: 'http://img/1' },
          },
        ],
        error: null,
      })
    );

    const result = await fetchReviewsForUser(USER_UUID, { sort: 'rating' });

    expect(mockedSupabase.from).toHaveBeenCalledWith('reviews');
    expect(result.reviews[0]).toMatchObject({
      id: 'db1',
      reviewerName: 'Ishah Bautista',
      reviewerPhotoUrl: 'http://img/1',
      rating: 5,
      comment: 'Great job',
    });
    expect(result.hasMore).toBe(false);
  });

  it('throws on query error', async () => {
    (mockedSupabase.from as jest.Mock).mockReturnValue(
      buildRangeChain({ data: null, error: { message: 'db down' } })
    );

    await expect(fetchReviewsForUser(USER_UUID, {})).rejects.toThrow('db down');
  });

  it('returns an empty page without querying when the id is not a UUID', async () => {
    const result = await fetchReviewsForUser('h1', {});

    expect(result).toEqual({ reviews: [], hasMore: false });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });
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
      revieweeId: 'mock-h9',
      rating: 5,
      comment: 'Nice',
      reviewerId: 'mock-c9',
    });

    expect(result).toMatchObject({ bookingId: 'mock-booking-1', reviewerId: 'mock-c9', rating: 5 });
    expect(mockedSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('simulates the 409 duplicate guard for the same reviewer', async () => {
    await submitReview({
      bookingId: 'mock-booking-2',
      revieweeId: 'mock-h9',
      rating: 4,
      reviewerId: 'mock-c9',
    });

    await expect(
      submitReview({
        bookingId: 'mock-booking-2',
        revieweeId: 'mock-h9',
        rating: 3,
        reviewerId: 'mock-c9',
      })
    ).rejects.toMatchObject({ name: 'ReviewSubmissionError', status: 409 });
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

describe('flagReview', () => {
  it('is a no-op in mock env', async () => {
    await expect(flagReview('r1', 'Spam')).resolves.toBeUndefined();
    expect(mockedSupabase.auth.getSession).not.toHaveBeenCalled();
  });

  it('calls the flag-review edge function in real env', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await flagReview('r1', 'Spam');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/flag-review'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
        body: JSON.stringify({ reviewId: 'r1', reason: 'Spam' }),
      })
    );
  });

  it('throws with the server message on a failed response', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: 'You have already flagged this review' }),
    }) as unknown as typeof fetch;

    await expect(flagReview('r1', 'Spam')).rejects.toThrow('You have already flagged this review');
  });
});

describe('fetchFlaggedReviews', () => {
  it('returns an empty list in mock env', async () => {
    const result = await fetchFlaggedReviews();
    expect(result).toEqual([]);
  });

  it('maps the admin queue response in real env', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          flags: [
            {
              id: 'f1',
              reason: 'Spam',
              status: 'PENDING',
              created_at: '2026-07-02T00:00:00Z',
              flagger: { full_name: 'Ishah Bautista' },
              review: {
                id: 'r1',
                reviewer_id: 'c1',
                reviewee_id: 'h1',
                rating: 1,
                comment: 'Fake review',
                created_at: '2026-07-01T00:00:00Z',
                reviewer: { full_name: 'Alice', photo_url: null },
              },
            },
          ],
        },
      }),
    }) as unknown as typeof fetch;

    const result = await fetchFlaggedReviews('PENDING');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'f1',
      reason: 'Spam',
      flaggerName: 'Ishah Bautista',
      review: { id: 'r1', reviewerName: 'Alice', comment: 'Fake review', rating: 1 },
    });
  });
});

describe('resolveReviewFlag', () => {
  it('is a no-op in mock env', async () => {
    await expect(resolveReviewFlag('f1', 'RESOLVE')).resolves.toBeUndefined();
  });

  it('calls the review-flag-action edge function in real env', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await resolveReviewFlag('f1', 'DISMISS');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/review-flag-action'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ flagId: 'f1', action: 'DISMISS' }),
      })
    );
  });

  it('throws on a failed response', async () => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'db down' }),
    }) as unknown as typeof fetch;

    await expect(resolveReviewFlag('f1', 'RESOLVE')).rejects.toThrow('db down');
  });
});
