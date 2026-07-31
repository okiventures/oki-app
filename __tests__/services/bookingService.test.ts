import { BookingStatus, BookingType } from '../../src/types';
import type { CreateBookingInput } from '../../src/services/bookingService';

const mockGetSession = jest.fn();
const mockInvoke = jest.fn();
const mockRpc = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../src/mocks', () => ({
  MOCK_BOOKINGS: [
    {
      id: 'b1',
      clientId: 'c1',
      clientName: 'Test',
      handymanId: 'h1',
      handymanName: 'HM',
      serviceCategory: 'Plumbing' as const,
      bookingType: 'OnDemand' as const,
      status: 'WorkStarted' as const,
      description: 'Fix sink',
      location: 'Cebu',
      amount: 150,
      platformFee: 15,
      netAmount: 135,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'b2',
      clientId: 'c2',
      clientName: 'Test 2',
      handymanId: '',
      handymanName: '',
      serviceCategory: 'Cleaning' as const,
      bookingType: 'OnDemand' as const,
      status: 'Paid' as const,
      description: 'Deep clean',
      location: 'Cebu',
      amount: 200,
      platformFee: 20,
      netAmount: 180,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'b3',
      clientId: 'c3',
      clientName: 'Test 3',
      handymanId: '',
      handymanName: '',
      serviceCategory: 'Electrical' as const,
      bookingType: 'OnDemand' as const,
      status: 'Pending' as const,
      description: 'Wiring',
      location: 'Cebu',
      amount: 120,
      platformFee: 12,
      netAmount: 108,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}));

const ORIGINAL_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// USE_MOCK is computed at module load from EXPO_PUBLIC_SUPABASE_URL, so set a
// "real" backend URL and require the module afterwards.
let transitionBookingState: typeof import('../../src/services/bookingService').transitionBookingState;
let createBooking: typeof import('../../src/services/bookingService').createBooking;

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

beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://real.supabase.co';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- module env is set at load time
  const mod = require('../../src/services/bookingService');
  transitionBookingState = mod.transitionBookingState;
  createBooking = mod.createBooking;
});

afterAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
});

beforeEach(() => {
  jest.clearAllMocks();
  // authenticated session so we exercise the live-backend path, not the mock
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
});

describe('transitionBookingState — surfaces backend errors, never fakes success', () => {
  it('rethrows an edge-function rejection instead of falling back to a local mock', async () => {
    mockInvoke.mockResolvedValue(invokeError(422, { message: 'GUARD_NOT_SATISFIED' }));

    await expect(transitionBookingState('b1', 'ACCEPT')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      message: 'GUARD_NOT_SATISFIED',
      status: 422,
    });
  });

  it('throws BookingTransitionError on cancel 422 without local fallback', async () => {
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

  it('throws BookingTransitionError on cancel 409 without local fallback', async () => {
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

  it('returns the mapped booking on success', async () => {
    mockInvoke.mockResolvedValue({
      data: { data: { id: 'b1', status: 'ACCEPTED', handyman_id: 'h1', client_id: 'c1' } },
      error: null,
    });

    const result = await transitionBookingState('b1', 'ACCEPT');
    expect(result.status).toBe(BookingStatus.Accepted);
    expect(mockInvoke).toHaveBeenCalledWith(
      'accept-booking',
      expect.objectContaining({ body: expect.objectContaining({ bookingId: 'b1' }) })
    );
  });

  it('maps a successful cancel edge-function response', async () => {
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

  it('rethrows RPC errors for non-edge-function actions', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'BOOKING_TERMINAL' } });

    await expect(transitionBookingState('b1', 'START_WORK')).rejects.toMatchObject({
      name: 'BookingTransitionError',
      message: 'BOOKING_TERMINAL',
    });
  });

  // ─── Mock/local path: FSM error wrapping ─────────────────────────────────

  it('wraps FsmError from mock path as BookingTransitionError with status 422 (skip-state)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(
      transitionBookingState('b3', 'COMPLETE', { simulated: true })
    ).rejects.toMatchObject({
      name: 'BookingTransitionError',
      status: 422,
      body: expect.objectContaining({
        error: 'INVALID_STATE_TRANSITION',
        from_status: 'Pending',
        action: 'COMPLETE',
        reason_code: 'TRANSITION_NOT_ALLOWED',
      }),
    });
  });

  it('wraps FsmError from mock path as BookingTransitionError with status 422 (terminal state)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(transitionBookingState('b2', 'ACCEPT', { simulated: true })).rejects.toMatchObject(
      {
        name: 'BookingTransitionError',
        status: 422,
        body: expect.objectContaining({
          error: 'INVALID_STATE_TRANSITION',
          from_status: 'Paid',
          reason_code: 'BOOKING_TERMINAL',
        }),
      }
    );
  });

  it('wraps FsmError from mock path as BookingTransitionError with status 422 (guard failure — missing afterPhoto)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(
      transitionBookingState('b1', 'COMPLETE', { simulated: true })
    ).rejects.toMatchObject({
      name: 'BookingTransitionError',
      status: 422,
      body: expect.objectContaining({
        from_status: 'WorkStarted',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: expect.objectContaining({ guard_failure: expect.any(String) }),
      }),
    });
  });
});

describe('createBooking — no silent mock booking on a live session', () => {
  const baseInput: CreateBookingInput = {
    clientId: 'c1',
    clientName: 'Client',
    serviceCategory: 'Plumbing' as CreateBookingInput['serviceCategory'],
    bookingType: BookingType.OnDemand,
    description: 'Leaky faucet',
    location: '123 St',
    amount: 100,
    serviceId: '11111111-1111-1111-1111-111111111111',
    lat: 10,
    lng: 20,
  };

  it('throws when serviceId/coordinates are missing on a live session', async () => {
    const { serviceId, ...noService } = baseInput;
    await expect(createBooking(noService as CreateBookingInput)).rejects.toThrow(/serviceId/);
  });

  it('propagates an edge-function error instead of fabricating a booking', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'VALIDATION_ERROR' },
    });

    await expect(createBooking(baseInput)).rejects.toThrow('VALIDATION_ERROR');
  });
});
