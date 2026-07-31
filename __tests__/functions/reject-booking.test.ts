import { requireHandyman } from '../../supabase/functions/_shared/rbac';
import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/reject-booking/index';

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
  insert: jest.Mock;
};

function mockFrom(_table: string, overrides?: Partial<MockChain>): MockChain {
  const chain: MockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

function makeReq(body: unknown): Request {
  return new Request('http://localhost/reject-booking', {
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
  // defaults to an eligible (online, KYC-approved) handyman; pass null to
  // simulate the caller having no handyman row.
  handyman?: object | null;
  insertResolved?: { error: unknown };
}) {
  const bookingChain = mockFrom('bookings', {
    single: jest.fn().mockResolvedValue({
      data: opts.booking ?? null,
      error: opts.bookingError ?? null,
    }),
  });

  const handymanValue =
    opts.handyman === undefined ? { is_online: true, kyc_status: 'APPROVED' } : opts.handyman;
  const handymanChain = mockFrom('handymen', {
    single: jest.fn().mockResolvedValue({
      data: handymanValue,
      error: handymanValue ? null : { message: 'not found' },
    }),
  });

  let eventsChain: MockChain | null = null;
  if (opts.insertResolved) {
    eventsChain = mockFrom('booking_events', {
      insert: jest.fn().mockResolvedValue(opts.insertResolved),
    });
  }

  return {
    from: jest.fn((table: string) => {
      if (table === 'bookings') return bookingChain;
      if (table === 'handymen') return handymanChain;
      return eventsChain ?? mockFrom(table);
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
    const res = await callHandler(new Request('http://localhost/reject-booking'));
    expect(res.status).toBe(405);
  });

  it('returns 405 for PUT', async () => {
    const res = await callHandler(
      new Request('http://localhost/reject-booking', { method: 'PUT' })
    );
    expect(res.status).toBe(405);
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

describe('booking existence', () => {
  it('returns 404 when booking not found', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({ booking: null, bookingError: { message: 'not found' } }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(404);
  });
});

describe('handyman eligibility gating', () => {
  it('returns 403 when the caller has no handyman row', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        handyman: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(403);
  });

  it('rejects when the handyman is offline', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        handyman: { is_online: false, kyc_status: 'APPROVED' },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('Handyman must be online');
  });

  it('rejects when the handyman KYC is not approved', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        handyman: { is_online: true, kyc_status: 'PENDING' },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('KYC must be approved');
  });
});

describe('guard conditions', () => {
  it('rejects when booking is not PENDING', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'ACCEPTED', handyman_id: null },
        bookingError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('Booking must be PENDING');
  });

  it('rejects when booking already assigned to another handyman', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: 'hm-2' },
        bookingError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('Booking already assigned to another handyman');
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

  it('logs and still succeeds when event insert fails', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        insertResolved: { error: { message: 'fk violation' } },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL'),
      expect.stringContaining('fk violation')
    );
  });
});

describe('success path', () => {
  it('rejects a valid PENDING booking and records the audit event', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        insertResolved: { error: null },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1', reason: 'Too far' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('PENDING');
  });
});
