/**
 * Customer booking flow — BookingsContext integration.
 *
 * Renders the real BookingsProvider (pure React — no native components) with
 * react-test-renderer and a stubbed service layer, so the customer-facing
 * behaviours that live in context, not in the service, are covered without a
 * device build or @testing-library/react-native.
 *
 * Covers plan IDs: CB-01 (create adds to list), CB-08/CB-09 (realtime wiring +
 * status update), CB-11 (cancel allowed pre-acceptance), CB-12 (cancel blocked
 * once accepted, via NON_CANCELLABLE_STATUSES).
 */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { BookingsProvider, useBookings } from '../../src/context/BookingsContext';
import {
  createBooking,
  subscribeToBooking,
  transitionBookingState,
} from '../../src/services/bookingService';
import { Booking, BookingStatus, BookingType, ServiceCategory } from '../../src/types';

// ─── Stub the service layer ──────────────────────────────────────────────────
jest.mock('../../src/services/bookingService', () => {
  class BookingTransitionError extends Error {
    status?: number;
    constructor(message: string) {
      super(message);
      this.name = 'BookingTransitionError';
    }
  }
  return {
    __esModule: true,
    transitionBookingState: jest.fn(),
    subscribeToBooking: jest.fn(() => jest.fn()),
    createBooking: jest.fn(),
    BookingTransitionError,
  };
});

const PENDING_ID = 'bk-pending';
const ACCEPTED_ID = 'bk-accepted';

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'bk-1',
    clientId: 'c1',
    clientName: 'Ishah Bautista',
    handymanId: '',
    handymanName: '',
    serviceCategory: ServiceCategory.General,
    bookingType: BookingType.OnDemand,
    status: BookingStatus.Pending,
    description: 'Fix leaky sink',
    location: '123 Mango Ave',
    amount: 1000,
    platformFee: 100,
    netAmount: 900,
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

// Deterministic seed so the provider doesn't start from the shipped fixtures.
jest.mock('../../src/mocks', () => ({
  MOCK_BOOKINGS: [
    {
      id: 'bk-pending',
      clientId: 'c1',
      clientName: 'Ishah Bautista',
      handymanId: '',
      handymanName: '',
      serviceCategory: 'General Handyman',
      bookingType: 'OnDemand',
      status: 'Pending',
      description: 'Fix leaky sink',
      location: '123 Mango Ave',
      amount: 1000,
      platformFee: 100,
      netAmount: 900,
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
    },
    {
      id: 'bk-accepted',
      clientId: 'c1',
      clientName: 'Ishah Bautista',
      handymanId: 'h1',
      handymanName: 'Handy Handz',
      serviceCategory: 'General Handyman',
      bookingType: 'OnDemand',
      status: 'Accepted',
      description: 'Mount TV',
      location: '456 Rizal St',
      amount: 800,
      platformFee: 80,
      netAmount: 720,
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
    },
  ],
}));

const mockTransition = transitionBookingState as jest.Mock;
const mockSubscribe = subscribeToBooking as jest.Mock;
const mockCreate = createBooking as jest.Mock;

// Render the provider and hand back the live context value via a ref that the
// tests read after each act().
function renderProvider() {
  const ref: { current: ReturnType<typeof useBookings> | null } = { current: null };
  function Capture() {
    ref.current = useBookings();
    return null;
  }
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <BookingsProvider>
        <Capture />
      </BookingsProvider>
    );
  });
  return { ref, renderer };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscribe.mockImplementation(() => jest.fn());
});

describe('BookingsContext — create (CB-01)', () => {
  it('appends the created booking to the list', async () => {
    mockCreate.mockResolvedValue(makeBooking({ id: 'bk-created', status: BookingStatus.Pending }));
    const { ref } = renderProvider();

    const before = ref.current!.bookings.length;
    await act(async () => {
      await ref.current!.createBooking({
        clientId: 'c1',
        clientName: 'Ishah Bautista',
        serviceCategory: ServiceCategory.General,
        bookingType: BookingType.OnDemand,
        description: 'Fix leaky sink',
        location: '123 Mango Ave',
        amount: 1000,
      });
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(ref.current!.bookings).toHaveLength(before + 1);
    expect(ref.current!.getBookingById('bk-created')).toBeDefined();
  });
});

describe('BookingsContext — realtime wiring (CB-08, CB-09)', () => {
  it('subscribes to every active booking on mount', () => {
    renderProvider();
    const subscribedIds = mockSubscribe.mock.calls.map((c) => c[0]);
    expect(subscribedIds).toEqual(expect.arrayContaining([PENDING_ID, ACCEPTED_ID]));
  });

  it('applies a realtime status change to the matching booking', async () => {
    const { ref } = renderProvider();

    const call = mockSubscribe.mock.calls.find((c) => c[0] === PENDING_ID);
    expect(call).toBeDefined();
    const onStateChange = call![1] as (event: unknown) => void;

    await act(async () => {
      onStateChange({ id: 'evt-1', bookingId: PENDING_ID, toStatus: BookingStatus.Accepted });
    });

    expect(ref.current!.getBookingById(PENDING_ID)?.status).toBe(BookingStatus.Accepted);
  });
});

describe('BookingsContext — cancel guard (CB-11, CB-12)', () => {
  it('cancels a still-pending booking through the service', async () => {
    mockTransition.mockResolvedValue(
      makeBooking({ id: PENDING_ID, status: BookingStatus.Cancelled })
    );
    const { ref } = renderProvider();

    let result: { ok: boolean } | undefined;
    await act(async () => {
      result = await ref.current!.cancelBooking(PENDING_ID);
    });

    expect(result).toEqual({ ok: true });
    expect(mockTransition).toHaveBeenCalledWith(PENDING_ID, 'CANCEL');
    expect(ref.current!.getBookingById(PENDING_ID)?.status).toBe(BookingStatus.Cancelled);
  });

  it('refuses to cancel once accepted and never calls the service', async () => {
    const { ref } = renderProvider();

    let result: { ok: boolean; message?: string } | undefined;
    await act(async () => {
      result = await ref.current!.cancelBooking(ACCEPTED_ID);
    });

    expect(result?.ok).toBe(false);
    expect(mockTransition).not.toHaveBeenCalled();
    // Booking is untouched.
    expect(ref.current!.getBookingById(ACCEPTED_ID)?.status).toBe(BookingStatus.Accepted);
  });
});
