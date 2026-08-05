/// <reference types="jest" />

import { getAuthUser } from '../../supabase/functions/_shared/rbac';
import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/submit-review/index';

jest.mock('../../supabase/functions/_shared/rbac', () => {
  const resp = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  return {
    getAuthUser: jest.fn(),
    methodNotAllowed: jest.fn(() => resp(405, { error: 'METHOD_NOT_ALLOWED' })),
    badRequest: jest.fn((m: string) => resp(400, { error: 'BAD_REQUEST', message: m })),
    notFound: jest.fn((m: string) => resp(404, { error: 'NOT_FOUND', message: m })),
    created: jest.fn(<T>(d: T) => resp(201, { data: d })),
    internalError: jest.fn((m: string) => resp(500, { error: 'INTERNAL_ERROR', message: m })),
  };
});

type MockChain = {
  select: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
};

function mockFrom(_table: string, overrides?: Partial<MockChain>): MockChain {
  const chain: MockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

function makeReq(body: unknown): Request {
  return new Request('http://localhost/submit-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function callHandler(req: Request): Promise<Response> {
  const handler = __getHandler();
  if (!handler) throw new Error('No handler captured — did serve() run?');
  return Promise.resolve(handler(req));
}

const DEFAULT_INSERT_RESULT = {
  data: { id: 'rev-1', booking_id: 'b-1', reviewer_id: 'c-1', reviewee_id: 'hm-1', rating: 5 },
  error: null,
};

function supabaseWith(opts: {
  booking?: object | null;
  bookingError?: { message: string } | null;
  existingReview?: { id: string } | null;
  insertResolved?: { data: unknown; error: { code?: string; message: string } | null };
}) {
  const booking = opts.booking ?? {
    id: 'b-1',
    client_id: 'c-1',
    handyman_id: 'hm-1',
    status: 'PAID',
  };

  const bookingChain = mockFrom('bookings', {
    single: jest.fn().mockResolvedValue({ data: booking, error: opts.bookingError ?? null }),
  });

  const reviewsChain = mockFrom('reviews', {
    maybeSingle: jest.fn().mockResolvedValue({
      data: opts.existingReview ?? null,
      error: null,
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(opts.insertResolved ?? DEFAULT_INSERT_RESULT),
      }),
    }),
  });

  return {
    from: jest.fn((table: string) => {
      if (table === 'bookings') return bookingChain;
      if (table === 'reviews') return reviewsChain;
      return mockFrom(table);
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('module loading', () => {
  it('loads the module and captures the handler', () => {
    expect(__getHandler()).not.toBeNull();
  });
});

describe('method check', () => {
  it('returns 405 for GET', async () => {
    const res = await callHandler(new Request('http://localhost/submit-review'));
    expect(res.status).toBe(405);
  });

  it('passes for POST', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({}),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5 }));
    expect(res.status).not.toBe(405);
  });
});

describe('auth guards', () => {
  it('returns 401 when getAuthUser fails', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5 }));
    expect(res.status).toBe(401);
  });
});

describe('request validation', () => {
  beforeEach(() => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: { from: jest.fn() },
    });
  });

  it('returns 400 when bookingId is missing', async () => {
    const res = await callHandler(makeReq({ revieweeId: 'hm-1', rating: 5 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when revieweeId is missing', async () => {
    const res = await callHandler(makeReq({ bookingId: 'b-1', rating: 5 }));
    expect(res.status).toBe(400);
  });

  it.each([
    ['rating 0', 0],
    ['rating 6', 6],
    ['rating 2.5', 2.5],
    ['rating string', '5'],
  ])('returns 400 for invalid %s', async (_label: string, rating: unknown) => {
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when comment is too long', async () => {
    const res = await callHandler(
      makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5, comment: 'x'.repeat(1001) })
    );
    expect(res.status).toBe(400);
  });
});

describe('booking existence', () => {
  it('returns 404 when booking not found', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({ booking: null, bookingError: { message: 'not found' } }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5 }));
    expect(res.status).toBe(404);
  });
});

describe('participant guard', () => {
  it('returns 403 when caller is not a participant', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'stranger' },
      supabase: supabaseWith({}),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5 }));
    expect(res.status).toBe(403);
  });
});

describe('direction guard', () => {
  it('returns 400 when reviewee is not the other participant', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({}),
    });
    const res = await callHandler(
      makeReq({ bookingId: 'b-1', revieweeId: 'someone-else', rating: 5 })
    );
    expect(res.status).toBe(400);
  });

  it('rejects self-review (reviewee = caller)', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({}),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'c-1', rating: 5 }));
    expect(res.status).toBe(400);
  });
});

describe('status guard', () => {
  it.each(['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'ARRIVED', 'WORK_STARTED', 'COMPLETED'])(
    'returns 422 when booking is %s',
    async (status: string) => {
      (getAuthUser as jest.Mock).mockResolvedValue({
        user: { id: 'c-1' },
        supabase: supabaseWith({
          booking: { id: 'b-1', client_id: 'c-1', handyman_id: 'hm-1', status },
        }),
      });
      const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5 }));
      expect(res.status).toBe(422);
    }
  );
});

describe('duplicate guard (409)', () => {
  it('returns 409 when the reviewer already reviewed the booking', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({ existingReview: { id: 'rev-1' } }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5 }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('REVIEW_ALREADY_EXISTS');
  });

  it('returns 409 on unique violation race (insert error code 23505)', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        insertResolved: { data: null, error: { code: '23505', message: 'duplicate key' } },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5 }));
    expect(res.status).toBe(409);
  });

  it('returns 500 on other insert errors', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        insertResolved: { data: null, error: { message: 'db down' } },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5 }));
    expect(res.status).toBe(500);
  });
});

describe('success path', () => {
  it('creates a review (client → handyman)', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({}),
    });
    const res = await callHandler(
      makeReq({ bookingId: 'b-1', revieweeId: 'hm-1', rating: 5, comment: 'Great job!' })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.rating).toBe(5);
  });

  it('creates a review (handyman → client)', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({}),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', revieweeId: 'c-1', rating: 4 }));
    expect(res.status).toBe(201);
  });
});
