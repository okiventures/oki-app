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
  require('../../supabase/functions/kyc-upload/index');
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('kyc-upload', () => {
  it('returns 405 for non-POST', async () => {
    const res = await callHandler(new Request('http://localhost/kyc-upload'));
    expect(res.status).toBe(405);
  });

  it('returns 429 when DB-backed rate limit threshold is reached', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch' as any)
      .mockImplementation(async (...args: any[]) => {
        const [input, init] = args as [string, RequestInit | undefined];
        const url = String(input);
        if (url.includes('/auth/v1/user')) return jsonResponse({ id: 'hm-1' });
        if (url.includes('/rest/v1/handymen?id=eq.hm-1&select=id'))
          return jsonResponse([{ id: 'hm-1' }]);
        if (url.includes('/rest/v1/rpc/kyc_check_rate_limit'))
          return jsonResponse({ allowed: false, retry_after: 60 });

        throw new Error(`Unhandled fetch: ${url} ${init?.method ?? 'GET'}`);
      });

    const res = await callHandler(
      new Request('http://localhost/kyc-upload', {
        method: 'POST',
        headers: {
          Authorization: '******',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_type: 'GOVERNMENT_ID',
          file_name: 'id.jpg',
          file_mime_type: 'image/jpeg',
          file_content: 'AA==',
        }),
      })
    );

    expect(res.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});
