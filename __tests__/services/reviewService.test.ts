import { Review } from '../../src/types';

const mockGetSession = jest.fn();
const mockInsert = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    from: (...args: unknown[]) => {
      if (args[0] === 'reviews') {
        return mockInsert();
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    },
  },
}));

const ORIGINAL_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

let submitReview: typeof import('../../src/services/reviewService').submitReview;

describe('submitReview (real backend path)', () => {
  beforeAll(() => {
    // Force USE_MOCK = false by providing a "real" backend URL. The module is
    // loaded with require() afterwards so it reads this env var at import time
    // (mirrors bookingService.test.ts).
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://real-project.supabase.co';
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- module env is set at load time
    const mod = require('../../src/services/reviewService');
    submitReview = mod.submitReview;
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts a review and maps the returned row', async () => {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'rev-1',
          booking_id: 'b1',
          reviewer_id: 'c1',
          reviewee_id: 'h1',
          rating: 5,
          comment: 'Great work',
          is_hidden: false,
          created_at: '2026-08-04T12:00:00.000Z',
        },
        error: null,
      }),
    };
    mockInsert.mockReturnValue(chain);

    const result = await submitReview({
      bookingId: 'b1',
      reviewerId: 'c1',
      reviewerName: 'Client A',
      revieweeId: 'h1',
      rating: 5,
      comment: 'Great work',
    });

    expect(chain.insert).toHaveBeenCalledWith({
      booking_id: 'b1',
      reviewer_id: 'c1',
      reviewee_id: 'h1',
      rating: 5,
      comment: 'Great work',
    });
    expect(result).toMatchObject<Partial<Review>>({
      id: 'rev-1',
      bookingId: 'b1',
      reviewerId: 'c1',
      revieweeId: 'h1',
      rating: 5,
      comment: 'Great work',
      createdAt: '2026-08-04T12:00:00.000Z',
    });
  });

  it('translates duplicate-review unique violation into a friendly error', async () => {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      }),
    };
    mockInsert.mockReturnValue(chain);

    await expect(
      submitReview({
        bookingId: 'b1',
        reviewerId: 'c1',
        reviewerName: 'Client A',
        revieweeId: 'h1',
        rating: 4,
        comment: '',
      })
    ).rejects.toThrow('You have already submitted a review for this booking.');
  });

  it('rethrows a generic database error with its message', async () => {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'row-level security: permission denied' },
      }),
    };
    mockInsert.mockReturnValue(chain);

    await expect(
      submitReview({
        bookingId: 'b1',
        reviewerId: 'c1',
        reviewerName: 'Client A',
        revieweeId: 'h1',
        rating: 4,
        comment: '',
      })
    ).rejects.toThrow('row-level security: permission denied');
  });
});
