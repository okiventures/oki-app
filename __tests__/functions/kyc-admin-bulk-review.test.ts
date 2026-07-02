import { __getHandler, serve } from '../__mocks__/deno-serve';

const DENO_ENV: Record<string, string> = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function callHandler(req: Request): Promise<Response> {
  const handler = __getHandler();
  if (!handler) throw new Error('No handler captured');
  return Promise.resolve(handler(req));
}

beforeAll(() => {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => DENO_ENV[key] ?? undefined,
    },
    serve,
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../supabase/functions/kyc-admin-bulk-review/index');
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('kyc-admin-bulk-review', () => {
  it('returns 405 for non-POST', async () => {
    const res = await callHandler(new Request('http://localhost/kyc-admin-bulk-review'));
    expect(res.status).toBe(405);
  });

  it('keeps handyman KYC status as PENDING when required latest docs are incomplete', async () => {
    const patchedBodies: string[] = [];
    jest.spyOn(globalThis, 'fetch' as any).mockImplementation(async (...args: any[]) => {
      const [input, init] = args as [string, RequestInit | undefined];
      const url = String(input);

      if (url.includes('/auth/v1/user')) return jsonResponse({ id: 'admin-1' });
      if (url.includes('/rest/v1/users?id=eq.admin-1'))
        return jsonResponse([{ user_type: 'admin' }]);
      if (url.includes('/rest/v1/kyc_documents?handyman_id=eq.hm-1&status=eq.PENDING&select=id')) {
        return jsonResponse([{ id: 'doc-1' }]);
      }
      if (
        url.includes('/rest/v1/kyc_documents?handyman_id=eq.hm-1&status=eq.PENDING') &&
        init?.method === 'PATCH'
      ) {
        return jsonResponse([{ id: 'doc-1' }]);
      }
      if (
        url.includes(
          '/rest/v1/kyc_documents?handyman_id=eq.hm-1&select=document_type,status,submitted_at'
        )
      ) {
        return jsonResponse([
          {
            document_type: 'GOVERNMENT_ID',
            status: 'APPROVED',
            submitted_at: '2026-07-01T00:00:00.000Z',
          },
        ]);
      }
      if (url.includes('/rest/v1/handymen?id=eq.hm-1') && init?.method === 'PATCH') {
        patchedBodies.push(String(init.body));
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    const res = await callHandler(
      new Request('http://localhost/kyc-admin-bulk-review', {
        method: 'POST',
        headers: {
          Authorization: '******',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handyman_id: 'hm-1',
          action: 'APPROVE',
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(patchedBodies).toHaveLength(1);
    expect(JSON.parse(patchedBodies[0]).kyc_status).toBe('PENDING');
  });
});
