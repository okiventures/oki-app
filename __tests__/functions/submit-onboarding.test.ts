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
  require('../../supabase/functions/submit-onboarding/index');
});

describe('submit-onboarding', () => {
  it('returns 401 when auth header is missing', async () => {
    const res = await callHandler(
      new Request('http://localhost/submit-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
  });
});
