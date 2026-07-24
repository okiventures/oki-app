/**
 * Customer booking flow — create path (service layer integration).
 *
 * Exercises createBooking() exactly the way app/new-booking.tsx calls it, so a
 * regression in the payload the wizard hands to the `create-booking` edge
 * function is caught here without a device build.
 *
 * Covers plan IDs: CB-01 (happy-path payload), CB-03 (now vs later),
 * CB-05 (service/coords mapping), plus the offline no-session fallback.
 * Failure modes (missing serviceId, edge-fn error) already live in
 * __tests__/services/bookingService.test.ts and are not duplicated here.
 */
import { BookingType } from '../../src/types';
import type { CreateBookingInput } from '../../src/services/bookingService';

const mockGetSession = jest.fn();
const mockInvoke = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    rpc: jest.fn(),
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

const ORIGINAL_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// USE_MOCK is computed at module load from EXPO_PUBLIC_SUPABASE_URL — set a
// "real" backend URL and require the module afterwards so we exercise the
// live-backend path, not the local mock.
let createBooking: typeof import('../../src/services/bookingService').createBooking;

beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://real.supabase.co';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- env is read at load time
  createBooking = require('../../src/services/bookingService').createBooking;
});

afterAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Authenticated session so createBooking takes the live-backend path.
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
});

// A minimal but complete row, matching what create-booking returns.
function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk-new-1',
    client_id: 'c1',
    handyman_id: null,
    service_id: 's-1',
    booking_type: 'ON_DEMAND',
    status: 'PENDING',
    description: 'Fix leaky sink',
    address_text: '123 Mango Ave',
    amount: 1000,
    platform_fee: 100,
    net_amount: 900,
    surge_multiplier: 1,
    scheduled_at: null,
    request_expires_at: null,
    before_photo_url: null,
    after_photo_url: null,
    notes: null,
    created_at: '2026-07-24T00:00:00.000Z',
    updated_at: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

const baseInput: CreateBookingInput = {
  clientId: 'c1',
  clientName: 'Ishah Bautista',
  serviceCategory: 'General Handyman' as CreateBookingInput['serviceCategory'],
  bookingType: BookingType.OnDemand,
  description: 'Fix leaky sink',
  location: '123 Mango Ave',
  amount: 1000,
  serviceId: 's-1',
  lat: 10.3157,
  lng: 123.8854,
};

describe('createBooking — customer wizard happy path (CB-01, CB-05)', () => {
  it('sends the ON_DEMAND payload the wizard builds and returns a mapped booking', async () => {
    mockInvoke.mockResolvedValue({ data: { data: bookingRow() }, error: null });

    const booking = await createBooking(baseInput);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('create-booking', {
      body: {
        serviceId: 's-1',
        bookingType: 'ON_DEMAND',
        description: 'Fix leaky sink',
        addressText: '123 Mango Ave',
        lat: 10.3157,
        lng: 123.8854,
        scheduledAt: null,
        notes: null,
      },
    });

    // The mapped booking keeps the caller's client name and blanks the handyman
    // until one accepts.
    expect(booking).toMatchObject({
      id: 'bk-new-1',
      clientId: 'c1',
      clientName: 'Ishah Bautista',
      handymanName: '',
      status: 'Pending',
      location: '123 Mango Ave',
    });
  });
});

describe('createBooking — schedule-for-later (CB-03)', () => {
  it('sends SCHEDULED with the scheduledAt timestamp untouched', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        data: bookingRow({ booking_type: 'SCHEDULED', scheduled_at: '2026-08-01T09:00:00' }),
      },
      error: null,
    });

    await createBooking({
      ...baseInput,
      bookingType: BookingType.Scheduled,
      scheduledAt: '2026-08-01T09:00:00',
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'create-booking',
      expect.objectContaining({
        body: expect.objectContaining({
          bookingType: 'SCHEDULED',
          scheduledAt: '2026-08-01T09:00:00',
        }),
      })
    );
  });

  it('forwards optional notes when the customer adds them', async () => {
    mockInvoke.mockResolvedValue({
      data: { data: bookingRow({ notes: 'Gate code 1234' }) },
      error: null,
    });

    await createBooking({ ...baseInput, notes: 'Gate code 1234' });

    expect(mockInvoke).toHaveBeenCalledWith(
      'create-booking',
      expect.objectContaining({ body: expect.objectContaining({ notes: 'Gate code 1234' }) })
    );
  });
});

describe('createBooking — offline demo fallback', () => {
  it('returns a local pending booking without hitting the edge function when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const booking = await createBooking(baseInput);

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(booking.id).toBeTruthy();
    expect(booking.status).toBe('Pending');
    expect(booking.clientName).toBe('Ishah Bautista');
  });
});
