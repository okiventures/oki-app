import { __getHandler, serve } from '../__mocks__/deno-serve';

const DENO_ENV: Record<string, string> = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

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
  require('../../supabase/functions/kyc-admin-review/index');
});

describe('kyc-admin-review', () => {
  it('returns 405 for non-PATCH', async () => {
    const res = await callHandler(
      new Request('http://localhost/kyc-admin-review/doc-id', {
        method: 'POST',
      })
    );
    expect(res.status).toBe(405);
  });
});
