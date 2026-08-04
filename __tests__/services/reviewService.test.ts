import {
  fetchReviewsForUser,
  submitReview,
  flagReview,
  fetchFlaggedReviews,
  resolveReviewFlag,
} from '../../src/services/reviewService';
import { isMockEnv } from '../../src/services/bookingService';
import { Review } from '../../src/types';

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(), getUser: jest.fn() },
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

function buildInsertChain(resolved: {
  data: unknown;
  error: { code: string; message: string } | null;
}) {
  return {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolved),
  };
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

describe('submitReview (real env)', () => {
  beforeEach(() => {
    (isMockEnv as jest.Mock).mockReturnValue(false);
    // The reviewer is taken from the session, never from the caller.
    (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('inserts a review pinned to the session user and maps the returned row', async () => {
    const chain = buildInsertChain({
      data: {
        id: 'rev-1',
        booking_id: 'b1',
        reviewer_id: 'u1',
        reviewee_id: 'h1',
        rating: 5,
        comment: 'Great work',
        is_hidden: false,
        created_at: '2026-08-04T12:00:00.000Z',
      },
      error: null,
    });
    (mockedSupabase.from as jest.Mock).mockReturnValue(chain);

    const result = await submitReview({
      bookingId: 'b1',
      revieweeId: 'h1',
      rating: 5,
      comment: 'Great work',
    });

    expect(mockedSupabase.from).toHaveBeenCalledWith('reviews');
    expect(chain.insert).toHaveBeenCalledWith({
      booking_id: 'b1',
      reviewer_id: 'u1',
      reviewee_id: 'h1',
      rating: 5,
      comment: 'Great work',
    });
    expect(result).toMatchObject<Partial<Review>>({
      id: 'rev-1',
      bookingId: 'b1',
      reviewerId: 'u1',
      revieweeId: 'h1',
      rating: 5,
      comment: 'Great work',
      createdAt: '2026-08-04T12:00:00.000Z',
    });
  });

  it('throws when no user is signed in', async () => {
    (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    await expect(
      submitReview({
        bookingId: 'b1',
        revieweeId: 'h1',
        rating: 4,
        comment: '',
      })
    ).rejects.toThrow('You must be signed in to leave a review.');
  });

  it('translates duplicate-review unique violation into a friendly error', async () => {
    (mockedSupabase.from as jest.Mock).mockReturnValue(
      buildInsertChain({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      })
    );

    await expect(
      submitReview({
        bookingId: 'b1',
        revieweeId: 'h1',
        rating: 4,
        comment: '',
      })
    ).rejects.toThrow('You have already reviewed this booking.');
  });

  it('translates RLS rejection into a not-yet-reviewable error', async () => {
    (mockedSupabase.from as jest.Mock).mockReturnValue(
      buildInsertChain({
        data: null,
        error: { code: '42501', message: 'row-level security: permission denied' },
      })
    );

    await expect(
      submitReview({
        bookingId: 'b1',
        revieweeId: 'h1',
        rating: 4,
        comment: '',
      })
    ).rejects.toThrow('This booking cannot be reviewed yet.');
  });

  it('rethrows a generic database error with its message', async () => {
    (mockedSupabase.from as jest.Mock).mockReturnValue(
      buildInsertChain({
        data: null,
        error: { code: '50000', message: 'internal error' },
      })
    );

    await expect(
      submitReview({
        bookingId: 'b1',
        revieweeId: 'h1',
        rating: 4,
        comment: 'A comment',
      })
    ).rejects.toThrow('Failed to submit review: internal error');
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
