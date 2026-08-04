import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/review-flag-action/index';

jest.mock('../../supabase/functions/_shared/rbac', () => {
  const resp = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  return {
    requireAdmin: jest.fn(),
    methodNotAllowed: jest.fn(() => resp(405, { error: 'METHOD_NOT_ALLOWED' })),
    badRequest: jest.fn((m: string) => resp(400, { error: 'BAD_REQUEST', message: m })),
    notFound: jest.fn((m: string) => resp(404, { error: 'NOT_FOUND', message: m })),
    internalError: jest.fn((m: string) => resp(500, { error: 'INTERNAL_ERROR', message: m })),
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

function makeReq(body: unknown): Request {
  return new Request('http://localhost/review-flag-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Builds a review_flags chain where the COUNT query (select with a count option)
// resolves to the provided { count, error } via a thenable that also exposes .eq().
function flagsChain(opts: {
  flag?: object | null;
  flagError?: { message: string } | null;
  updateError?: { message: string } | null;
  pendingCount?: number | null;
  countError?: { message: string } | null;
}) {
  const countResult: any = Promise.resolve({
    count: opts.pendingCount ?? null,
    error: opts.countError ?? null,
  });
  countResult.eq = jest.fn(() => countResult);

  const chain: any = {
    select: jest.fn((_cols: unknown, countOpts?: unknown) => (countOpts ? countResult : chain)),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: opts.flag ?? null,
      error: opts.flagError ?? null,
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: opts.updateError ?? null }),
    }),
  };
  return chain;
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
    const res = await callHandler(new Request('http://localhost/review-flag-action'));
    expect(res.status).toBe(405);
  });
});

describe('auth', () => {
  it('returns 403 when not admin', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403 }),
    });

    const res = await callHandler(makeReq({ flagId: 'f1', action: 'RESOLVE' }));
    expect(res.status).toBe(403);
  });
});

describe('validation', () => {
  beforeEach(() => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      user: { id: 'admin' },
      supabase: { from: jest.fn(() => flagsChain({ flag: { id: 'f1' } })) },
    });
  });

  it('returns 400 when flagId is missing', async () => {
    const res = await callHandler(makeReq({ action: 'RESOLVE' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid action', async () => {
    const res = await callHandler(makeReq({ flagId: 'f1', action: 'BOGUS' }));
    expect(res.status).toBe(400);
  });
});

describe('actions', () => {
  const adminAuth = (supabase: unknown) => ({
    user: { id: 'admin' },
    supabase,
  });

  it('returns 404 when the flag does not exist', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(
      adminAuth({ from: jest.fn(() => flagsChain({ flag: null })) })
    );

    const res = await callHandler(makeReq({ flagId: 'missing', action: 'RESOLVE' }));
    expect(res.status).toBe(404);
  });

  it('returns 400 when the flag is not pending', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(
      adminAuth({ from: jest.fn(() => flagsChain({ flag: { id: 'f1', status: 'RESOLVED' } })) })
    );

    const res = await callHandler(makeReq({ flagId: 'f1', action: 'RESOLVE' }));
    expect(res.status).toBe(400);
  });

  it('RESOLVES a flag (keeps review hidden)', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(
      adminAuth({
        from: jest.fn(() => flagsChain({ flag: { id: 'f1', review_id: 'r1', status: 'PENDING' } })),
      })
    );

    const res = await callHandler(makeReq({ flagId: 'f1', action: 'RESOLVE' }));
    expect(res.status).toBe(200);
    expect(ok).toHaveBeenCalledWith({ flagId: 'f1', action: 'RESOLVE' });
  });

  it('DISMISSES a flag and unhides the review when no other flags are pending', async () => {
    const reviewUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    const from = jest.fn((table: string) => {
      if (table === 'reviews') return { update: reviewUpdate };
      return flagsChain({
        flag: { id: 'f1', review_id: 'r1', status: 'PENDING' },
        pendingCount: 0,
      });
    });
    (requireAdmin as jest.Mock).mockResolvedValue(adminAuth({ from }));

    const res = await callHandler(makeReq({ flagId: 'f1', action: 'DISMISS' }));
    expect(res.status).toBe(200);
    expect(reviewUpdate).toHaveBeenCalled();
  });

  it('keeps the review hidden on DISMISS when another flag is still pending', async () => {
    const reviewUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    const from = jest.fn((table: string) => {
      if (table === 'reviews') return { update: reviewUpdate };
      return flagsChain({
        flag: { id: 'f1', review_id: 'r1', status: 'PENDING' },
        pendingCount: 1,
      });
    });
    (requireAdmin as jest.Mock).mockResolvedValue(adminAuth({ from }));

    const res = await callHandler(makeReq({ flagId: 'f1', action: 'DISMISS' }));
    expect(res.status).toBe(200);
    expect(reviewUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 on flag update error', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(
      adminAuth({
        from: jest.fn(() =>
          flagsChain({
            flag: { id: 'f1', review_id: 'r1', status: 'PENDING' },
            updateError: { message: 'db down' },
          })
        ),
      })
    );

    const res = await callHandler(makeReq({ flagId: 'f1', action: 'RESOLVE' }));
    expect(res.status).toBe(500);
  });
});
