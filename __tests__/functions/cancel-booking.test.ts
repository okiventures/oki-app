import { requireClient, serviceClient } from '../../supabase/functions/_shared/rbac';
import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/cancel-booking/index';

jest.mock('../../supabase/functions/_shared/rbac', () => {
  const resp = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  return {
    requireClient: jest.fn(),
    serviceClient: jest.fn(),
    methodNotAllowed: jest.fn(() => resp(405, { error: 'METHOD_NOT_ALLOWED' })),
    badRequest: jest.fn((m: string) => resp(400, { error: 'BAD_REQUEST', message: m })),
    notFound: jest.fn((m: string) => resp(404, { error: 'NOT_FOUND', message: m })),
    forbidden: jest.fn((m: string) => resp(403, { error: 'FORBIDDEN', message: m })),
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
  return new Request('http://localhost/cancel-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function makeRawReq(rawBody: string): Request {
  return new Request('http://localhost/cancel-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
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
  updateResolved?: { data: unknown; error: { message: string } | null };
  insertResolved?: { error: unknown };
}) {
  const bookingChain = mockFrom('bookings', {
    single: jest.fn().mockResolvedValue({
      data: opts.booking ?? null,
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

  const client = {
    from: jest.fn((table: string) => {
      if (table === 'bookings') return bookingChain;
      return eventsChain ?? mockFrom(table);
    }),
  };

  // The lifecycle functions read and write through serviceClient(): an unassigned
  // PENDING booking is invisible to the caller under RLS, and booking_events grants
  // the authenticated role no INSERT. Point it at the same mock the auth helper
  // hands back so the existing chain assertions cover both paths.
  (serviceClient as jest.Mock).mockReturnValue(client);
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  (serviceClient as jest.Mock).mockReturnValue({ from: jest.fn(() => mockFrom('any')) });
});

describe('module loading', () => {
  it('loads the module and captures the handler', () => {
    expect(__getHandler()).not.toBeNull();
  });
});

describe('method check', () => {
  it('returns 405 for GET', async () => {
    const res = await callHandler(new Request('http://localhost/cancel-booking'));
    expect(res.status).toBe(405);
  });

  it('returns 405 for PUT', async () => {
    const res = await callHandler(
      new Request('http://localhost/cancel-booking', { method: 'PUT' })
    );
    expect(res.status).toBe(405);
  });
});

describe('auth guards', () => {
  it('returns 401 when requireClient fails', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(401);
  });
});

describe('request validation', () => {
  beforeEach(() => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
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

  it('returns 400 for invalid JSON body', async () => {
    const res = await callHandler(makeRawReq('{not-json'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/invalid json/i);
  });

  it('returns 400 for empty body', async () => {
    const res = await callHandler(makeRawReq(''));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/invalid json/i);
  });

  it('returns 400 when body is null', async () => {
    const res = await callHandler(makeReq(null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/json object/i);
  });

  it('returns 400 when body is an array', async () => {
    const res = await callHandler(makeReq([{ bookingId: 'b-1' }]));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/json object/i);
  });
});

describe('booking existence', () => {
  it('returns 404 when booking not found', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({ booking: null, bookingError: { message: 'not found' } }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(404);
  });
});

describe('ownership guard', () => {
  it('returns 403 when caller is not the booking owner', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', client_id: 'c-other' },
        bookingError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(403);
  });
});

describe('state guard', () => {
  it('rejects with 422 when booking is ACCEPTED', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'ACCEPTED', client_id: 'c-1' },
        bookingError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('INVALID_STATE_TRANSITION');
    expect(body.from_status).toBe('ACCEPTED');
    expect(body.to_status).toBe('CANCELLED');
    expect(body.action).toBe('CANCEL');
    expect(body.reason_code).toBe('TRANSITION_NOT_ALLOWED');
    expect(body.details.failed_guards).toContain('Booking must be PENDING');
    expect(body.message).toBe('Cannot cancel booking in current state');
  });

  it.each(['IN_TRANSIT', 'ARRIVED', 'WORK_STARTED', 'COMPLETED'])(
    'rejects with 422 when booking is %s',
    async (status) => {
      (requireClient as jest.Mock).mockResolvedValue({
        user: { id: 'c-1' },
        supabase: supabaseWith({
          booking: { id: 'b-1', status, client_id: 'c-1' },
          bookingError: null,
        }),
      });

      const res = await callHandler(makeReq({ bookingId: 'b-1' }));
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.reason_code).toBe('TRANSITION_NOT_ALLOWED');
      expect(body.from_status).toBe(status);
    }
  );

  it.each(['PAID', 'CANCELLED'])(
    'rejects with 422 and BOOKING_TERMINAL when booking is %s',
    async (status) => {
      (requireClient as jest.Mock).mockResolvedValue({
        user: { id: 'c-1' },
        supabase: supabaseWith({
          booking: { id: 'b-1', status, client_id: 'c-1' },
          bookingError: null,
        }),
      });

      const res = await callHandler(makeReq({ bookingId: 'b-1' }));
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.reason_code).toBe('BOOKING_TERMINAL');
      expect(body.message).toBe('Booking is closed');
    }
  );

  it('rejects with 422 and TRANSITION_NOT_ALLOWED when booking is REJECTED', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'REJECTED', client_id: 'c-1' },
        bookingError: null,
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.reason_code).toBe('TRANSITION_NOT_ALLOWED');
    expect(body.message).toBe('Cannot cancel booking in current state');
  });
});

describe('optimistic lock (PENDING guard on update)', () => {
  it('returns 409 when update matches 0 rows (race with ACCEPT)', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', client_id: 'c-1' },
        bookingError: null,
        updateResolved: { data: null, error: null },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('INVALID_STATE_TRANSITION');
  });

  it('returns 500 on update error', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', client_id: 'c-1' },
        bookingError: null,
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

  it('logs and still succeeds when event insert fails', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', client_id: 'c-1' },
        bookingError: null,
        updateResolved: {
          data: { id: 'b-1', status: 'CANCELLED', client_id: 'c-1' },
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
});

describe('success path', () => {
  it('cancels a PENDING booking owned by the caller', async () => {
    (requireClient as jest.Mock).mockResolvedValue({
      user: { id: 'c-1' },
      supabase: supabaseWith({
        booking: { id: 'b-1', status: 'PENDING', client_id: 'c-1' },
        bookingError: null,
        updateResolved: {
          data: { id: 'b-1', status: 'CANCELLED', client_id: 'c-1' },
          error: null,
        },
        insertResolved: { error: null },
      }),
    });

    const res = await callHandler(makeReq({ bookingId: 'b-1', reason: 'Changed my mind' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('CANCELLED');
    expect(body.data.client_id).toBe('c-1');
  });
});
