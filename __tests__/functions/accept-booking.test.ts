import { requireHandyman } from '../../supabase/functions/_shared/rbac';
import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/accept-booking/index';

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
    single: jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

function makeReq(body: unknown): Request {
  return new Request('http://localhost/accept-booking', {
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
  handyman?: object | null;
  handymanError?: { message: string } | null;
  updateResolved?: { data: unknown; error: { message: string } | null };
  insertResolved?: { error: unknown };
}) {
  const bookingChain = mockFrom('bookings', {
    single: jest.fn().mockResolvedValue({
      data: opts.booking ?? null,
      error: opts.bookingError ?? null,
    }),
  });

  const handymanChain = mockFrom('handymen', {
    single: jest.fn().mockResolvedValue({
      data: opts.handyman ?? null,
      error: opts.handymanError ?? null,
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
    const res = await callHandler(new Request('http://localhost/accept-booking'));
    expect(res.status).toBe(405);
  });

  it('returns 405 for PUT', async () => {
    const res = await callHandler(
      new Request('http://localhost/accept-booking', { method: 'PUT' })
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
      error: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
      }),
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
      supabase: supabaseWith({
        booking: null,
        bookingError: { message: 'not found' },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(404);
  });

  it('returns 404 when fetch errors', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: null,
        bookingError: { message: 'db error' },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(404);
  });
});

describe('handyman verification', () => {
  it('returns 403 when handyman record not found', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        handyman: null,
        handymanError: { message: 'not found' },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(403);
  });
});

describe('guard conditions', () => {
  const approvalHandyman = { id: 'hm-1', is_online: true, kyc_status: 'APPROVED' };

  it('rejects when booking is not PENDING', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'ACCEPTED', handyman_id: null },
        bookingError: null,
        handyman: approvalHandyman,
        handymanError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('Booking must be PENDING');
  });

  it('rejects when handyman is offline', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        handyman: { id: 'hm-1', is_online: false, kyc_status: 'APPROVED' },
        handymanError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('Handyman must be online');
  });

  it('rejects when KYC not approved', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        handyman: { id: 'hm-1', is_online: true, kyc_status: 'PENDING' },
        handymanError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('KYC must be approved');
  });

  it('rejects when booking already assigned to another handyman', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: 'hm-2' },
        bookingError: null,
        handyman: approvalHandyman,
        handymanError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.failed_guards).toContain('Booking already assigned');
  });
});

describe('optimistic lock (PENDING guard on update)', () => {
  it('returns 409 when update matches 0 rows (race condition)', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        handyman: { id: 'hm-1', is_online: true, kyc_status: 'APPROVED' },
        handymanError: null,
        updateResolved: { data: null, error: null },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('INVALID_STATE_TRANSITION');
  });

  it('returns 500 on update error', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        handyman: { id: 'hm-1', is_online: true, kyc_status: 'APPROVED' },
        handymanError: null,
        updateResolved: { data: null, error: { message: 'constraint violation' } },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
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
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        handyman: { id: 'hm-1', is_online: true, kyc_status: 'APPROVED' },
        handymanError: null,
        updateResolved: {
          data: { id: 'b-1', status: 'ACCEPTED', handyman_id: 'hm-1' },
          error: null,
        },
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

  it('succeeds when event insert works', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        handyman: { id: 'hm-1', is_online: true, kyc_status: 'APPROVED' },
        handymanError: null,
        updateResolved: {
          data: { id: 'b-1', status: 'ACCEPTED', handyman_id: 'hm-1' },
          error: null,
        },
        insertResolved: { error: null },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('ACCEPTED');
  });
});

describe('success path', () => {
  it('accepts a valid booking', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', handyman_id: null },
        bookingError: null,
        handyman: { id: 'hm-1', is_online: true, kyc_status: 'APPROVED' },
        handymanError: null,
        updateResolved: {
          data: { id: 'b-1', status: 'ACCEPTED', handyman_id: 'hm-1' },
          error: null,
        },
        insertResolved: { error: null },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('ACCEPTED');
    expect(body.data.handyman_id).toBe('hm-1');
  });
});
