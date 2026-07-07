const mockGetSession = jest.fn();
const mockInvoke = jest.fn();
const mockRpc = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

function loadBookingService(): typeof import('../../src/services/bookingService') {
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.resetModules() needs a fresh require()
  return require('../../src/services/bookingService');
}

function invokeError(status: number, body: Record<string, unknown>) {
  return {
    data: null,
    error: {
      message: 'Edge Function returned a non-2xx status code',
      context: new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'c-1' } } } });
});

describe('transitionBookingState', () => {
  it('throws BookingTransitionError on edge-function 422 without local fallback', async () => {
    const { transitionBookingState } = loadBookingService();
    mockInvoke.mockResolvedValue(
      invokeError(422, {
        error: 'INVALID_STATE_TRANSITION',
        message: 'Cannot cancel booking in current state',
        reason_code: 'TRANSITION_NOT_ALLOWED',
      })
    );

    await expect(transitionBookingState('b1', 'CANCEL')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      message: 'Cannot cancel booking in current state',
      status: 422,
      body: expect.objectContaining({ reason_code: 'TRANSITION_NOT_ALLOWED' }),
    });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('throws BookingTransitionError on edge-function 409 without local fallback', async () => {
    const { transitionBookingState } = loadBookingService();
    mockInvoke.mockResolvedValue(
      invokeError(409, {
        error: 'INVALID_STATE_TRANSITION',
        message: 'Booking is no longer PENDING',
        reason_code: 'GUARD_NOT_SATISFIED',
      })
    );

    await expect(transitionBookingState('b1', 'CANCEL')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      message: 'Booking is no longer PENDING',
      status: 409,
      body: expect.objectContaining({ reason_code: 'GUARD_NOT_SATISFIED' }),
    });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('maps a successful edge-function response', async () => {
    const { transitionBookingState } = loadBookingService();
    mockInvoke.mockResolvedValue({
      data: {
        data: {
          id: 'b1',
          client_id: 'c-1',
          handyman_id: null,
          service_id: 's-1',
          booking_type: 'ON_DEMAND',
          status: 'CANCELLED',
          description: 'Fix sink',
          address_text: 'Manila',
          amount: 1000,
          platform_fee: 100,
          net_amount: 900,
          surge_multiplier: 1,
          scheduled_at: null,
          request_expires_at: null,
          before_photo_url: null,
          after_photo_url: null,
          notes: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      },
      error: null,
    });

    const updated = await transitionBookingState('b1', 'CANCEL');

    expect(mockInvoke).toHaveBeenCalledWith('cancel-booking', {
      body: { bookingId: 'b1' },
    });
    expect(updated.status).toBe('Cancelled');
  });
});
