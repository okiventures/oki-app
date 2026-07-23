import { requireHandyman } from '../../supabase/functions/_shared/rbac';
import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/handyman-status/index';

jest.mock('../../supabase/functions/_shared/rbac', () => {
  const resp = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  return {
    requireHandyman: jest.fn(),
    methodNotAllowed: jest.fn(() => resp(405, { error: 'METHOD_NOT_ALLOWED' })),
    badRequest: jest.fn((m: string) => resp(400, { error: 'BAD_REQUEST', message: m })),
    notFound: jest.fn((m: string) => resp(404, { error: 'NOT_FOUND', message: m })),
    ok: jest.fn(<T>(d: T) => resp(200, { data: d })),
  };
});

type MockChain = {
  update: jest.Mock;
  eq: jest.Mock;
  select: jest.Mock;
  maybeSingle: jest.Mock;
};

function supabaseWith(updateResolved: { data: unknown; error: { message: string } | null }) {
  const chain: MockChain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(updateResolved),
  };
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  return { from: jest.fn(() => chain), __chain: chain };
}

function makeReq(body: unknown): Request {
  return new Request('http://localhost/handyman-status', {
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
    const res = await callHandler(new Request('http://localhost/handyman-status'));
    expect(res.status).toBe(405);
  });

  it('returns 405 for PUT', async () => {
    const res = await callHandler(
      new Request('http://localhost/handyman-status', { method: 'PUT' })
    );
    expect(res.status).toBe(405);
  });
});

describe('auth guards', () => {
  it('returns 401 when requireHandyman fails', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }),
    });

    const res = await callHandler(makeReq({ isOnline: true }));
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

  it('returns 400 when isOnline is missing', async () => {
    const res = await callHandler(makeReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/isOnline/i);
  });

  it('returns 400 when isOnline is not a boolean', async () => {
    const res = await callHandler(makeReq({ isOnline: 'yes' }));
    expect(res.status).toBe(400);
  });
});

describe('handyman existence', () => {
  it('returns 404 when no handyman row is updated', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({ data: null, error: null }),
    });

    const res = await callHandler(makeReq({ isOnline: true }));
    expect(res.status).toBe(404);
  });
});

describe('update errors', () => {
  it('returns 500 when the update errors', async () => {
    (requireHandyman as jest.Mock).mockResolvedValue({
      user: { id: 'hm-1' },
      supabase: supabaseWith({ data: null, error: { message: 'db down' } }),
    });

    const res = await callHandler(makeReq({ isOnline: false }));
    expect(res.status).toBe(500);
  });
});

describe('success path', () => {
  it('sets is_online and stamps last_seen_at', async () => {
    const sb = supabaseWith({
      data: { id: 'hm-1', is_online: true, last_seen_at: '2026-07-15T00:00:00.000Z' },
      error: null,
    });
    (requireHandyman as jest.Mock).mockResolvedValue({ user: { id: 'hm-1' }, supabase: sb });

    const res = await callHandler(makeReq({ isOnline: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.is_online).toBe(true);
    expect(body.data.last_seen_at).toBeTruthy();
    expect(sb.__chain.eq).toHaveBeenCalledWith('id', 'hm-1');
    const updatePayload = sb.__chain.update.mock.calls[0][0];
    expect(updatePayload.is_online).toBe(true);
    expect(updatePayload.last_seen_at).toBeTruthy();
  });

  it('supports toggling offline', async () => {
    const sb = supabaseWith({
      data: { id: 'hm-1', is_online: false, last_seen_at: '2026-07-15T00:00:00.000Z' },
      error: null,
    });
    (requireHandyman as jest.Mock).mockResolvedValue({ user: { id: 'hm-1' }, supabase: sb });

    const res = await callHandler(makeReq({ isOnline: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.is_online).toBe(false);
  });
});
