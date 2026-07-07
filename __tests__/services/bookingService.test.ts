import { BookingStatus, BookingType } from '../../src/types';
import type { CreateBookingInput } from '../../src/services/bookingService';

// Mock the supabase client lib so we don't pull in expo-secure-store / RN.
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
    rpc: jest.fn(),
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

const { supabase } = require('../../src/lib/supabase');

const ORIGINAL_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// USE_MOCK is computed at module load from EXPO_PUBLIC_SUPABASE_URL, so set a
// "real" backend URL and require the module afterwards.
let transitionBookingState: typeof import('../../src/services/bookingService').transitionBookingState;
let createBooking: typeof import('../../src/services/bookingService').createBooking;

beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://real.supabase.co';
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
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
});

describe('transitionBookingState — H7: surfaces backend errors, never fakes success', () => {
  it('rethrows an edge-function rejection instead of falling back to a local mock', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'GUARD_NOT_SATISFIED' },
    });

    await expect(transitionBookingState('b1', 'ACCEPT')).rejects.toThrow('GUARD_NOT_SATISFIED');
  });

  it('returns the mapped booking on success', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { data: { id: 'b1', status: 'ACCEPTED', handyman_id: 'h1', client_id: 'c1' } },
      error: null,
    });

    const result = await transitionBookingState('b1', 'ACCEPT');
    expect(result.status).toBe(BookingStatus.Accepted);
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'accept-booking',
      expect.objectContaining({ body: expect.objectContaining({ bookingId: 'b1' }) })
    );
  });

  it('rethrows RPC errors for non-edge-function actions', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'BOOKING_TERMINAL' } });

    await expect(transitionBookingState('b1', 'START_WORK')).rejects.toThrow('BOOKING_TERMINAL');
  });
});

describe('createBooking — H7: no silent mock booking on a live session', () => {
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
    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'VALIDATION_ERROR' },
    });

    await expect(createBooking(baseInput)).rejects.toThrow('VALIDATION_ERROR');
  });
});
