import { requireHandyman } from '../../supabase/functions/_shared/rbac';
import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/complete-booking/index';

jest.mock('../../supabase/functions/_shared/rbac', () => {
  const resp = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  return {
    requireHandyman: jest.fn(),
    methodNotAllowed: jest.fn(() => resp(405, { error: 'METHOD_NOT_ALLOWED' })),
    badRequest: jest.fn((m: string) => resp(400, { error: 'BAD_REQUEST', message: m })),
    notFound: jest.fn((m: string) => resp(404, { error: 'NOT_FOUND', message: m })),
    ok: jest.fn(<T>(d: T) => resp(200, { data: d })),
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
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

function makeReq(body: unknown): Request {
  return new Request('http://localhost/complete-booking', {
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

function supabaseWith(opts: {
  booking?: object | null;
  bookingError?: { message: string } | null;
  handymanId?: string;
  beforePhotoUrl?: string;
  updateResolved?: { data: unknown; error: { message: string } | null };
  insertResolved?: { error: unknown };
}) {
  const booking = opts.booking ?? {
    id: 'b-1',
    handyman_id: opts.handymanId ?? 'hm-1',
    status: 'WORK_STARTED',
    before_photo_url: opts.beforePhotoUrl ?? 'before.jpg',
    after_photo_url: null,
  };

  const bookingChain = mockFrom('bookings', {
    single: jest.fn().mockResolvedValue({
      data: booking,
      error: opts.bookingError ?? null,
    }),
  });

  if (opts.updateResolved) {
    const updateChain = mockFrom('bookings', {
      maybeSingle: jest.fn().mockResolvedValue(opts.updateResolved),
    });
    (bookingChain as any).update = jest.fn().mockReturnValue(updateChain);
  }

  let eventsChain: MockChain | null = null;
  if (opts.insertResolved) {
    eventsChain = mockFrom('booking_events', {
      insert: jest.fn().mockResolvedValue(opts.insertResolved),
    });
  }

  return {
    from: jest.fn((table: string) => {
      if (table === 'bookings') return bookingChain;
      if (table === 'booking_events') return eventsChain ?? mockFrom(table);
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
    const res = await callHandler(new Request('http://localhost/complete-booking'));
    expect(res.status).toBe(405);
  });

  it('returns 405 for PUT', async () => {
    const res = await callHandler(
      new Request('http://localhost/complete-booking', { method: 'PUT' })
    );
    expect(res.status).toBe(405);
  });

  it('passes for POST', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({}),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).not.toBe(405);
  });
});

describe('auth guards', () => {
  it('returns 401 when requireHandyman fails', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(401);
  });
});

describe('request validation', () => {
  beforeEach(() => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: { from: jest.fn() },
    });
  });

  it('returns 400 when bookingId is missing', async () => {
    const res = await callHandler(makeReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/bookingId/i);
  });

  it('returns 400 when bookingId is empty', async () => {
    const res = await callHandler(makeReq({ bookingId: '' }));
    expect(res.status).toBe(400);
  });
});

describe('afterPhotoUrl validation', () => {
  beforeEach(() => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({}),
    });
  });

  it.each([
    ['javascript: scheme', 'javascript:alert(1)'],
    ['off-domain https URL', 'https://evil.example.com/x.jpg'],
    ['path traversal', '../../etc/passwd'],
    ['embedded html/quotes', 'a"><img src=x>.jpg'],
  ])('rejects %s with 400', async (_label, value) => {
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: value }));
    expect(res.status).toBe(400);
  });

  it('accepts a bare storage key', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({ updateResolved: { data: null, error: null } }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));
    expect(res.status).not.toBe(400);
  });
});

describe('booking existence', () => {
  it('returns 404 when booking not found', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({ booking: null, bookingError: { message: 'not found' } }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(404);
  });

  it('returns 404 when fetch errors', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({ booking: null, bookingError: { message: 'db error' } }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(404);
  });
});

describe('handyman assignment check', () => {
  it('returns 403 when different handyman tries to complete', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-2' },
      supabase: supabaseWith({ handymanId: 'hm-1' }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(403);
  });

  it('allows assigned handyman', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({ handymanId: 'hm-1', updateResolved: { data: null, error: null } }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).not.toBe(403);
  });
});

describe('guard conditions', () => {
  it('rejects when booking is not WORK_STARTED', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: {
          id: 'b-1',
          handyman_id: 'hm-1',
          status: 'ACCEPTED',
          before_photo_url: 'b.jpg',
          after_photo_url: null,
        },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('Must be in WORK_STARTED status');
  });

  it('rejects when before_photo is missing', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({ beforePhotoUrl: '' }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('Before photo required before starting work');
  });

  it('rejects when afterPhotoUrl is missing and no stored after_photo', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({}),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('After photo required to complete');
  });

  it('uses stored after_photo_url when body afterPhotoUrl is missing', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: {
          id: 'b-1',
          handyman_id: 'hm-1',
          status: 'WORK_STARTED',
          before_photo_url: 'b.jpg',
          after_photo_url: 'existing-after.jpg',
        },
        updateResolved: { data: { id: 'b-1', status: 'COMPLETED' }, error: null },
        insertResolved: { error: null },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(200);
  });
});

describe('optimistic lock (WORK_STARTED guard on update)', () => {
  it('returns 409 when update matches 0 rows (race condition)', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        updateResolved: { data: null, error: null },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('INVALID_STATE_TRANSITION');
  });

  it('returns 500 on update error', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        updateResolved: { data: null, error: { message: 'constraint violation' } },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));
    expect(res.status).toBe(500);
  });
});

describe('audit event logging', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs and succeeds when event insert fails', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        updateResolved: { data: { id: 'b-1', status: 'COMPLETED' }, error: null },
        insertResolved: { error: { message: 'fk violation' } },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));
    expect(res.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL'),
      expect.stringContaining('fk violation')
    );
  });

  it('succeeds when event insert works', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        updateResolved: { data: { id: 'b-1', status: 'COMPLETED' }, error: null },
        insertResolved: { error: null },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('COMPLETED');
  });
});

describe('success path', () => {
  it('completes a valid booking', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        updateResolved: {
          data: {
            id: 'b-1',
            status: 'COMPLETED',
            handyman_id: 'hm-1',
            after_photo_url: 'after.jpg',
          },
          error: null,
        },
        insertResolved: { error: null },
      }),
    });
    const res = await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('COMPLETED');
  });

  it('includes afterPhotoUrl in the update body', async () => {
    const bookingChain = mockFrom('bookings', {
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'b-1',
          handyman_id: 'hm-1',
          status: 'WORK_STARTED',
          before_photo_url: 'b.jpg',
          after_photo_url: null,
        },
        error: null,
      }),
    });

    const updateChain = mockFrom('bookings', {
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { id: 'b-1', status: 'COMPLETED' }, error: null }),
    });
    const updateMock = jest.fn().mockReturnValue(updateChain);
    (bookingChain as any).update = updateMock;

    const eventsChain = mockFrom('booking_events', {
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'bookings') return bookingChain;
        if (table === 'booking_events') return eventsChain;
        return mockFrom(table);
      }),
    };

    (requireHandyman as jest.Mock).mockResolvedValue({ user: { id: 'hm-1' }, supabase });

    await callHandler(makeReq({ bookingId: 'b-1', afterPhotoUrl: 'after.jpg' }));

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ after_photo_url: 'after.jpg' })
    );
  });
});
