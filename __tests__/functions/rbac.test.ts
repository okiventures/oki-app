// Tests for supabase/functions/_shared/rbac.ts (Deno edge function middleware)
// Node.js compat: mock Deno env globals + esm.sh CDN import via jest.config.js moduleNameMapper.

const cdn = require('https://esm.sh/@supabase/supabase-js@2.108.2');
const mockCreateClient = cdn.getCreateClientMock();

const DENO_ENV: Record<string, string> = {
  SUPABASE_URL: 'https://wvrhxxtvefeyynglfibq.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-mock',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-mock',
};

(globalThis as any).Deno = {
  env: {
    get: (key: string) => DENO_ENV[key] ?? undefined,
  },
};

function mockReq(headers?: Record<string, string>): Request {
  return new Request('https://localhost/fn', { headers });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

function mockFetch(jsonData: unknown): jest.SpyInstance {
  return jest
    .spyOn(globalThis, 'fetch' as any)
    .mockResolvedValue({ json: () => Promise.resolve(jsonData), ok: true } as any);
}

describe('response helpers', () => {
  let helpers: any;

  beforeAll(() => {
    helpers = require('../../supabase/functions/_shared/rbac');
  });

  it('unauthorized returns 401 with JSON', async () => {
    const r = helpers.unauthorized('No access');
    expect(r.status).toBe(401);
    const body = await r.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).toBe('No access');
  });

  it('forbidden returns 403 with JSON', async () => {
    const r = helpers.forbidden('Go away');
    expect(r.status).toBe(403);
    const body = await r.json();
    expect(body.error).toBe('FORBIDDEN');
  });

  it('badRequest returns 400 with JSON', async () => {
    const r = helpers.badRequest('Missing field');
    expect(r.status).toBe(400);
  });

  it('notFound returns 404 with JSON', async () => {
    const r = helpers.notFound('Gone');
    expect(r.status).toBe(404);
  });

  it('internalError returns 500 with JSON', async () => {
    const r = helpers.internalError('Boom');
    expect(r.status).toBe(500);
  });

  it('ok wraps data in { data: ... }', async () => {
    const r = helpers.ok({ id: 'x' });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.data).toEqual({ id: 'x' });
  });

  it('created wraps data with status 201', async () => {
    const r = helpers.created({ id: 'new' });
    expect(r.status).toBe(201);
  });

  it('methodNotAllowed returns 405', () => {
    const r = helpers.methodNotAllowed();
    expect(r.status).toBe(405);
  });
});

describe('getAuthUser', () => {
  let getAuthUser: (req: Request) => Promise<any>;

  beforeAll(() => {
    getAuthUser = require('../../supabase/functions/_shared/rbac').getAuthUser;
  });

  it('returns 401 when Authorization header is missing', async () => {
    const result = await getAuthUser(mockReq());
    expect(result.error).not.toBeNull();
    expect(result.error.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        }),
      },
    });

    const result = await getAuthUser(mockReq({ Authorization: 'Bearer bad-token' }));
    expect(result.error).not.toBeNull();
    expect(result.error.status).toBe(401);
  });

  it('returns user on valid token', async () => {
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'u1',
              email: 'test@oki.test',
              user_metadata: { full_name: 'Test' },
            },
          },
          error: null,
        }),
      },
    });

    const result = await getAuthUser(mockReq({ Authorization: 'Bearer valid-token' }));

    expect(result.user.id).toBe('u1');
    expect(result.user.email).toBe('test@oki.test');
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://wvrhxxtvefeyynglfibq.supabase.co',
      'anon-key-mock',
      { global: { headers: { Authorization: 'Bearer valid-token' } } }
    );
  });
});

describe('requireRole', () => {
  let requireRole: (req: Request, role: string) => Promise<any>;

  beforeAll(() => {
    requireRole = require('../../supabase/functions/_shared/rbac').requireRole;
  });

  const validTokenReq = mockReq({ Authorization: 'Bearer valid-token' });

  beforeEach(() => {
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'u1',
              email: 'test@oki.test',
              user_metadata: {},
            },
          },
          error: null,
        }),
      },
    });
  });

  it('returns user when handyman role check passes', async () => {
    mockFetch([{ id: 'u1' }]);

    const result = await requireRole(validTokenReq, 'handyman');

    expect(result.user.id).toBe('u1');
  });

  it('returns user when admin role check passes', async () => {
    mockFetch([{ user_type: 'admin' }]);

    const result = await requireRole(validTokenReq, 'admin');

    expect(result.user.id).toBe('u1');
  });

  it('returns 403 when role check fails (empty result)', async () => {
    mockFetch([]);

    const result = await requireRole(validTokenReq, 'handyman');

    expect(result.error).not.toBeNull();
    expect(result.error.status).toBe(403);
    const body = await result.error.json();
    expect(body.error).toBe('FORBIDDEN');
  });

  it('propagates 401 when getAuthUser fails', async () => {
    mockCreateClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Expired' },
        }),
      },
    });

    const result = await requireRole(validTokenReq, 'handyman');
    expect(result.error).not.toBeNull();
    expect(result.error.status).toBe(401);
  });
});

describe('requireAdmin / requireHandyman', () => {
  it('requireAdmin calls requireRole with admin', async () => {
    const { requireAdmin } = require('../../supabase/functions/_shared/rbac');
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'bad' },
        }),
      },
    });

    const result = await requireAdmin(mockReq({ Authorization: 'Bearer token' }));
    expect(result.error.status).toBe(401);
  });

  it('requireHandyman calls requireRole with handyman', async () => {
    const { requireHandyman } = require('../../supabase/functions/_shared/rbac');
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: { id: 'u1', email: 'h@oki.test', user_metadata: {} },
          },
          error: null,
        }),
      },
    });
    mockFetch([{ id: 'u1' }]);

    const result = await requireHandyman(mockReq({ Authorization: 'Bearer token' }));
    expect(result.user.id).toBe('u1');
  });
});
