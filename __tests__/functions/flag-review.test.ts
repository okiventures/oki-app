import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/flag-review/index';

jest.mock('../../supabase/functions/_shared/rbac', () => {
  const resp = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  return {
    getAuthUser: jest.fn(),
    methodNotAllowed: jest.fn(() => resp(405, { error: 'METHOD_NOT_ALLOWED' })),
    badRequest: jest.fn((m: string) => resp(400, { error: 'BAD_REQUEST', message: m })),
    notFound: jest.fn((m: string) => resp(404, { error: 'NOT_FOUND', message: m })),
    internalError: jest.fn((m: string) => resp(500, { error: 'INTERNAL_ERROR', message: m })),
    ok: jest.fn(<T>(d: T) => resp(200, { data: d })),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAuthUser, ok } = require('../../supabase/functions/_shared/rbac');

function callHandler(req: Request): Promise<Response> {
  const handler = __getHandler();
  if (!handler) throw new Error('No handler captured — did serve() run?');
  return Promise.resolve(handler(req));
}

function makeReq(body: unknown): Request {
  return new Request('http://localhost/flag-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function supabaseWith(opts: {
  review?: object | null;
  reviewError?: { message: string } | null;
  flagResolved?: { data: unknown; error: { message: string; code?: string } | null };
}) {
  const reviewChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: opts.review ?? null,
      error: opts.reviewError ?? null,
    }),
  };

  const flagChain = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(opts.flagResolved ?? { data: null, error: null }),
  };

  return {
    from: jest.fn((table: string) => {
      if (table === 'reviews') return reviewChain;
      return flagChain;
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
    const res = await callHandler(new Request('http://localhost/flag-review'));
    expect(res.status).toBe(405);
  });
});

describe('auth', () => {
  it('returns 401 when user is not authenticated', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }),
    });

    const res = await callHandler(makeReq({ reviewId: 'r1', reason: 'Spam' }));
    expect(res.status).toBe(401);
  });
});

describe('validation', () => {
  const auth = { user: { id: 'u1' }, supabase: supabaseWith({ review: { id: 'r1' } }) };

  beforeEach(() => {
    (getAuthUser as jest.Mock).mockResolvedValue(auth);
  });

  it('returns 400 when reviewId is missing', async () => {
    const res = await callHandler(makeReq({ reason: 'Spam' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when reason is missing', async () => {
    const res = await callHandler(makeReq({ reviewId: 'r1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when reason is empty', async () => {
    const res = await callHandler(makeReq({ reviewId: 'r1', reason: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    const res = await callHandler(
      new Request('http://localhost/flag-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      })
    );
    expect(res.status).toBe(400);
  });
});

describe('flagging', () => {
  it('returns 404 when the review does not exist', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'u1' },
      supabase: supabaseWith({ review: null }),
    });

    const res = await callHandler(makeReq({ reviewId: 'missing', reason: 'Spam' }));
    expect(res.status).toBe(404);
  });

  it('returns 200 with the created flag', async () => {
    const flag = { id: 'f1', review_id: 'r1', reason: 'Spam', status: 'PENDING' };
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'u1' },
      supabase: supabaseWith({ review: { id: 'r1' }, flagResolved: { data: flag, error: null } }),
    });

    const res = await callHandler(makeReq({ reviewId: 'r1', reason: 'Spam' }));
    expect(res.status).toBe(200);
    expect(ok).toHaveBeenCalledWith(flag);
  });

  it('returns 409 on duplicate pending flag', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'u1' },
      supabase: supabaseWith({
        review: { id: 'r1' },
        flagResolved: {
          data: null,
          error: { message: 'duplicate key', code: '23505' },
        },
      }),
    });

    const res = await callHandler(makeReq({ reviewId: 'r1', reason: 'Spam' }));
    expect(res.status).toBe(409);
  });

  it('returns 500 on insert error', async () => {
    (getAuthUser as jest.Mock).mockResolvedValue({
      user: { id: 'u1' },
      supabase: supabaseWith({
        review: { id: 'r1' },
        flagResolved: {
          data: null,
          error: { message: 'db down' },
        },
      }),
    });

    const res = await callHandler(makeReq({ reviewId: 'r1', reason: 'Spam' }));
    expect(res.status).toBe(500);
  });
});
