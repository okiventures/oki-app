import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/reviews-admin-queue/index';

jest.mock('../../supabase/functions/_shared/rbac', () => {
  const resp = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  return {
    requireAdmin: jest.fn(),
    methodNotAllowed: jest.fn(() => resp(405, { error: 'METHOD_NOT_ALLOWED' })),
    badRequest: jest.fn((m: string) => resp(400, { error: 'BAD_REQUEST', message: m })),
    ok: jest.fn(<T>(d: T) => resp(200, { data: d })),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireAdmin, ok } = require('../../supabase/functions/_shared/rbac');

function callHandler(req: Request): Promise<Response> {
  const handler = __getHandler();
  if (!handler) throw new Error('No handler captured — did serve() run?');
  return Promise.resolve(handler(req));
}

function makeReq(url: string): Request {
  return new Request(url);
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
  it('returns 405 for POST', async () => {
    const res = await callHandler(
      new Request('http://localhost/reviews-admin-queue', { method: 'POST' })
    );
    expect(res.status).toBe(405);
  });
});

describe('auth', () => {
  it('returns 401/403 when not admin', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403 }),
    });

    const res = await callHandler(makeReq('http://localhost/reviews-admin-queue'));
    expect(res.status).toBe(403);
  });
});

describe('queue', () => {
  function queueChain(resolved: { data: unknown; error: { message: string } | null }) {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue(resolved),
    };
    return chain;
  }

  const flags = [
    {
      id: 'f1',
      reason: 'Spam',
      status: 'PENDING',
      flagger: { full_name: 'Ishah Bautista' },
      review: { id: 'r1', rating: 5, comment: 'Great work', reviewer: { full_name: 'Alice' } },
    },
  ];

  it('returns 400 for an invalid status filter', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      user: { id: 'admin' },
      supabase: { from: jest.fn() },
    });

    const res = await callHandler(makeReq('http://localhost/reviews-admin-queue?status=BOGUS'));
    expect(res.status).toBe(400);
  });

  it('returns flagged reviews for the default PENDING status', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      user: { id: 'admin' },
      supabase: { from: jest.fn(() => queueChain({ data: flags, error: null })) },
    });

    const res = await callHandler(makeReq('http://localhost/reviews-admin-queue'));
    expect(res.status).toBe(200);
    expect(ok).toHaveBeenCalledWith({ flags, page: 1, limit: 20 });
  });

  it('returns 500 on query error', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      user: { id: 'admin' },
      supabase: {
        from: jest.fn(() => queueChain({ data: null, error: { message: 'db down' } })),
      },
    });

    const res = await callHandler(makeReq('http://localhost/reviews-admin-queue'));
    expect(res.status).toBe(500);
  });
});
