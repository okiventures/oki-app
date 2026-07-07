import { createHmac } from 'node:crypto';
import { __getHandler, serve } from '../__mocks__/deno-serve';
import { getCreateClientMock } from '../__mocks__/supabase-cdn';

const SECRET = 'test-webhook-secret';
const DENO_ENV: Record<string, string> = {
  PAYMENT_WEBHOOK_SECRET: SECRET,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function sign(ts: string, body: string): string {
  return createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');
}

function callHandler(req: Request): Promise<Response> {
  const handler = __getHandler();
  if (!handler) throw new Error('No handler captured — did serve() run?');
  return Promise.resolve(handler(req));
}

// Build a signed POST request. Overrides let individual tests corrupt the
// timestamp/signature to exercise the rejection paths.
function makeReq(
  payload: object,
  opts: { ts?: string; signature?: string; omitTs?: boolean; omitSig?: boolean } = {}
): Request {
  const body = JSON.stringify(payload);
  const ts = opts.ts ?? String(Math.floor(Date.now() / 1000));
  const signature = opts.signature ?? sign(ts, body);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!opts.omitTs) headers['x-webhook-timestamp'] = ts;
  if (!opts.omitSig) headers['x-webhook-signature'] = signature;
  return new Request('http://localhost/payment-webhook', { method: 'POST', headers, body });
}

// Configurable supabase client stand-in returned by createClient().
function supabaseWith(opts: {
  booking?: Record<string, unknown> | null;
  bookingError?: { message: string } | null;
  rpc?: jest.Mock;
}) {
  const rpc = opts.rpc ?? jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: opts.booking ?? null,
      error: opts.bookingError ?? null,
    }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ error: null }),
  }));
  return { from, rpc } as any;
}

beforeAll(() => {
  (globalThis as any).Deno = { env: { get: (k: string) => DENO_ENV[k] }, serve };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../supabase/functions/payment-webhook/index');
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('payment-webhook — method + signature', () => {
  it('returns 405 for non-POST', async () => {
    const res = await callHandler(new Request('http://localhost/payment-webhook'));
    expect(res.status).toBe(405);
  });

  it('returns 403 when signature or timestamp header is missing', async () => {
    getCreateClientMock().mockReturnValue(supabaseWith({}));
    const noSig = await callHandler(makeReq({ event: 'x' }, { omitSig: true }));
    expect(noSig.status).toBe(403);
    const noTs = await callHandler(makeReq({ event: 'x' }, { omitTs: true }));
    expect(noTs.status).toBe(403);
  });

  it('returns 403 for a stale timestamp (replay window)', async () => {
    const staleTs = String(Math.floor(Date.now() / 1000) - 10_000);
    const res = await callHandler(
      makeReq({ event: 'payment_intent.succeeded', bookingId: 'b1', amount: 100 }, { ts: staleTs })
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 for a bad signature (tampered body)', async () => {
    const res = await callHandler(
      makeReq(
        { event: 'payment_intent.succeeded', bookingId: 'b1', amount: 100 },
        { signature: 'deadbeef' }
      )
    );
    expect(res.status).toBe(403);
  });
});

describe('payment-webhook — amount integrity', () => {
  it('rejects a non-positive amount with 400', async () => {
    getCreateClientMock().mockReturnValue(supabaseWith({}));
    const res = await callHandler(
      makeReq({ event: 'payment_intent.succeeded', bookingId: 'b1', amount: -5 })
    );
    expect(res.status).toBe(400);
  });

  it('rejects when payload amount does not match the booking amount (422)', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    getCreateClientMock().mockReturnValue(
      supabaseWith({
        booking: {
          id: 'b1',
          status: 'COMPLETED',
          handyman_id: 'h1',
          amount: 100,
          platform_fee: 10,
        },
        rpc,
      })
    );
    const res = await callHandler(
      // valid signature over an inflated amount — signature can't save a wrong amount
      makeReq({ event: 'payment_intent.succeeded', bookingId: 'b1', amount: 999 })
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('AMOUNT_MISMATCH');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('captures using the booking amount, never the payload amount', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    getCreateClientMock().mockReturnValue(
      supabaseWith({
        booking: {
          id: 'b1',
          status: 'COMPLETED',
          handyman_id: 'h1',
          amount: 100,
          platform_fee: 10,
        },
        rpc,
      })
    );
    const res = await callHandler(
      makeReq({
        event: 'payment_intent.succeeded',
        bookingId: 'b1',
        paymentIntentId: 'pi_1',
        amount: 100,
      })
    );
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      'execute_payment_transaction',
      expect.objectContaining({ amount: 100, platform_fee: 10, net_amount: 90, handyman_id: 'h1' })
    );
  });

  it('is idempotent: a replay of an already-PAID booking is a no-op 200', async () => {
    const rpc = jest.fn();
    getCreateClientMock().mockReturnValue(
      supabaseWith({
        booking: { id: 'b1', status: 'PAID', handyman_id: 'h1', amount: 100, platform_fee: 10 },
        rpc,
      })
    );
    const res = await callHandler(
      makeReq({ event: 'payment_intent.succeeded', bookingId: 'b1', amount: 100 })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deduplicated).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects capture when the booking is not COMPLETED (422)', async () => {
    getCreateClientMock().mockReturnValue(
      supabaseWith({
        booking: { id: 'b1', status: 'ACCEPTED', handyman_id: 'h1', amount: 100, platform_fee: 10 },
      })
    );
    const res = await callHandler(
      makeReq({ event: 'payment_intent.succeeded', bookingId: 'b1', amount: 100 })
    );
    expect(res.status).toBe(422);
  });
});
