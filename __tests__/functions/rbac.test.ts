// Tests for supabase/functions/_shared/rbac.ts (Deno edge function middleware)
// Node.js compat: mock Deno env globals + esm.sh CDN import via jest.config.js moduleNameMapper.

import { getCreateClientMock } from '../__mocks__/supabase-cdn';
import {
  badRequest,
  created,
  forbidden,
  getAuthUser,
  internalError,
  methodNotAllowed,
  notFound,
  ok,
  requireAdmin,
  requireHandyman,
  requireRole,
  unauthorized,
  type AuthFailure,
  type AuthSuccess,
} from '../../supabase/functions/_shared/rbac';

const mockCreateClient = getCreateClientMock();

function assertAuthFailure(result: AuthSuccess | AuthFailure): asserts result is AuthFailure {
  if (!('error' in result)) {
    throw new Error('Expected auth failure');
  }
}

function assertAuthSuccess(result: AuthSuccess | AuthFailure): asserts result is AuthSuccess {
  if (!('user' in result)) {
    throw new Error('Expected auth success');
  }
}

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
  it('unauthorized returns 401 with JSON', async () => {
    const r = unauthorized('No access');
    expect(r.status).toBe(401);
    const body = await r.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).toBe('No access');
  });

  it('forbidden returns 403 with JSON', async () => {
    const r = forbidden('Go away');
    expect(r.status).toBe(403);
    const body = await r.json();
    expect(body.error).toBe('FORBIDDEN');
  });

  it('badRequest returns 400 with JSON', async () => {
    const r = badRequest('Missing field');
    expect(r.status).toBe(400);
  });

  it('notFound returns 404 with JSON', async () => {
    const r = notFound('Gone');
    expect(r.status).toBe(404);
  });

  it('internalError returns 500 with JSON', async () => {
    const r = internalError('Boom');
    expect(r.status).toBe(500);
  });

  it('ok wraps data in { data: ... }', async () => {
    const r = ok({ id: 'x' });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.data).toEqual({ id: 'x' });
  });

  it('created wraps data with status 201', async () => {
    const r = created({ id: 'new' });
    expect(r.status).toBe(201);
  });

  it('methodNotAllowed returns 405', () => {
    const r = methodNotAllowed();
    expect(r.status).toBe(405);
  });
});

describe('getAuthUser', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const result = await getAuthUser(mockReq());
    assertAuthFailure(result);
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
    assertAuthFailure(result);
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

    assertAuthSuccess(result);
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

    assertAuthSuccess(result);
    expect(result.user.id).toBe('u1');
  });

  it('returns user when admin role check passes', async () => {
    mockFetch([{ user_type: 'admin' }]);

    const result = await requireRole(validTokenReq, 'admin');

    assertAuthSuccess(result);
    expect(result.user.id).toBe('u1');
  });

  it('returns 403 when role check fails (empty result)', async () => {
    mockFetch([]);

    const result = await requireRole(validTokenReq, 'handyman');

    assertAuthFailure(result);
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
    assertAuthFailure(result);
    expect(result.error.status).toBe(401);
  });
});

describe('requireAdmin / requireHandyman', () => {
  it('requireAdmin calls requireRole with admin', async () => {
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'bad' },
        }),
      },
    });

    const result = await requireAdmin(mockReq({ Authorization: 'Bearer token' }));
    assertAuthFailure(result);
    expect(result.error.status).toBe(401);
  });

  it('requireHandyman calls requireRole with handyman', async () => {
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
    assertAuthSuccess(result);
    expect(result.user.id).toBe('u1');
  });
});
