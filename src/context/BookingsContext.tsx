import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { MOCK_BOOKINGS } from '../mocks';
import { Booking, BookingStatus } from '../types';
import {
  transitionBookingState,
  subscribeToBookingChanges,
  createBooking as createBookingService,
  fetchBookings,
  isMockEnv,
  BookingTransitionError,
} from '../services/bookingService';
import { getWorkflowAction, canTransition, WorkflowAction } from '../services/bookingFsm';
import type { CreateBookingInput } from '../services/bookingService';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'oki_bookings_state_v2';

// Unassigned PENDING bookings match no RLS policy, so realtime can't push a new
// request to a handyman who isn't on it yet. The inbox polls to close that gap.
const HANDYMAN_INBOX_POLL_MS = 20_000;

export type CancelBookingResult = { ok: true } | { ok: false; message: string };

interface BookingsContextValue {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createBooking: (input: CreateBookingInput) => Promise<Booking>;
  acceptBooking: (bookingId: string) => void;
  declineBooking: (bookingId: string) => void;
  advanceBooking: (bookingId: string) => void;
  cancelBooking: (bookingId: string) => Promise<CancelBookingResult>;
  getBookingById: (bookingId: string) => Booking | undefined;
  getNextHandymanAction: (status: BookingStatus) => WorkflowAction | null;
}

const BookingsContext = createContext<BookingsContextValue>({
  bookings: [],
  isLoading: false,
  error: null,
  refresh: async () => {},
  createBooking: async () => MOCK_BOOKINGS[0],
  acceptBooking: () => {},
  declineBooking: () => {},
  advanceBooking: () => {},
  cancelBooking: async () => ({ ok: false, message: 'This booking cannot be cancelled.' }),
  getBookingById: () => undefined,
  getNextHandymanAction: () => null,
});

function updateBooking(booking: Booking, status: BookingStatus): Booking {
  return {
    ...booking,
    status,
    updatedAt: new Date().toISOString(),
  };
}

// A state transition only changes status/assignment/photos. Merge just those
// from the API response so we don't clobber richer local fields (clientName,
// serviceCategory, amounts) with the edge function's placeholder values.
function mergeTransition(existing: Booking, updated: Booking): Booking {
  return {
    ...existing,
    status: updated.status,
    handymanId: updated.handymanId || existing.handymanId,
    beforePhoto: updated.beforePhoto ?? existing.beforePhoto,
    afterPhoto: updated.afterPhoto ?? existing.afterPhoto,
    updatedAt: new Date().toISOString(),
  };
}

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const mockMode = isMockEnv();
  const userId = session?.user?.id;
  const userType = session?.user?.userType;

  const [bookings, setBookings] = useState<Booking[]>(mockMode ? MOCK_BOOKINGS : []);
  const [isLoading, setIsLoading] = useState(!mockMode);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (mockMode) return;

    // Signed out against a live backend: RLS would return nothing anyway, and
    // showing the previous account's bookings after a logout would be wrong.
    if (!userId) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      setBookings(await fetchBookings(userType));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load bookings';
      setError(message);
      console.warn('BookingsContext: refresh failed:', message);
    } finally {
      setIsLoading(false);
    }
  }, [mockMode, userId, userType]);

  // Load once auth has settled, and again whenever the signed-in user changes.
  useEffect(() => {
    if (isAuthLoading) return;
    refresh();
  }, [isAuthLoading, refresh]);

  // Offline demo only: restore the locally-mutated mock set. Persisting live
  // rows to localStorage would leak one account's bookings into the next.
  useEffect(() => {
    if (!mockMode) return;
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setBookings(JSON.parse(saved) as Booking[]);
      }
    } catch {
      setBookings(MOCK_BOOKINGS);
    }
  }, [mockMode]);

  useEffect(() => {
    if (!mockMode) return;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
      }
    } catch {
      // noop
    }
  }, [mockMode, bookings]);

  // Refetch when anything the user can see changes: this is what makes the
  // client's screen move when the handyman accepts, and vice versa.
  useEffect(() => {
    if (mockMode || !userId) return;
    return subscribeToBookingChanges(() => {
      refresh();
    });
  }, [mockMode, userId, refresh]);

  // Realtime can't deliver unassigned PENDING bookings (no RLS match), so the
  // handyman inbox polls for new requests on top of the subscription.
  useEffect(() => {
    if (mockMode || !userId || userType !== 'handyman') return;
    const timer = setInterval(refresh, HANDYMAN_INBOX_POLL_MS);
    return () => clearInterval(timer);
  }, [mockMode, userId, userType, refresh]);

  const createBooking = useCallback(async (input: CreateBookingInput) => {
    const booking = await createBookingService(input);
    setBookings((current) => [...current, booking]);
    return booking;
  }, []);

  const acceptBooking = useCallback(
    async (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      const updated = await transitionBookingState(bookingId, 'ACCEPT', undefined, booking?.status);
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? mergeTransition(booking, updated) : booking
        )
      );
    },
    [bookings]
  );

  const declineBooking = useCallback(
    async (bookingId: string) => {
      const removedBooking = bookings.find((b) => b.id === bookingId);

      setBookings((current) => current.filter((b) => b.id !== bookingId));

      try {
        await transitionBookingState(bookingId, 'REJECT', undefined, removedBooking?.status);
      } catch (err) {
        if (removedBooking) setBookings((current) => [...current, removedBooking]);
        throw err;
      }
    },
    [bookings]
  );

  const advanceBooking = useCallback(
    async (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const nextAction = getWorkflowAction(booking.status);
      if (!nextAction) return;

      try {
        const updated = await transitionBookingState(
          bookingId,
          nextAction.action as any,
          undefined,
          booking.status
        );
        setBookings((current) =>
          current.map((b) =>
            b.id === bookingId ? { ...b, ...updated, updatedAt: new Date().toISOString() } : b
          )
        );
        return;
      } catch (err) {
        if (err instanceof BookingTransitionError && err.status === 422) {
          const details = err.body?.details as Record<string, unknown> | undefined;
          const message =
            typeof details?.guard_failure === 'string' ? details.guard_failure : err.message;
          Alert.alert('Cannot advance booking', message);
          return;
        }
      }

      setBookings((current) =>
        current.map((booking) => {
          if (booking.id !== bookingId) return booking;
          const action = getWorkflowAction(booking.status);
          if (!action) return booking;
          return updateBooking(booking, action.nextStatus);
        })
      );
    },
    [bookings]
  );

  const cancelBooking = useCallback(
    async (bookingId: string): Promise<CancelBookingResult> => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking || canTransition(booking.status, 'CANCEL') !== null) {
        return { ok: false, message: 'This booking cannot be cancelled.' };
      }

      try {
        const updated = await transitionBookingState(
          bookingId,
          'CANCEL',
          undefined,
          booking.status
        );
        setBookings((current) =>
          current.map((b) =>
            b.id === bookingId ? { ...b, ...updated, updatedAt: new Date().toISOString() } : b
          )
        );
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof BookingTransitionError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not cancel booking. Please try again.';
        return { ok: false, message };
      }
    },
    [bookings]
  );

  const value = useMemo(
    () => ({
      bookings,
      isLoading,
      error,
      refresh,
      createBooking,
      acceptBooking,
      declineBooking,
      advanceBooking,
      cancelBooking,
      getBookingById: (bookingId: string) => bookings.find((booking) => booking.id === bookingId),
      getNextHandymanAction: (status: BookingStatus) => getWorkflowAction(status),
    }),
    [
      bookings,
      isLoading,
      error,
      refresh,
      createBooking,
      acceptBooking,
      declineBooking,
      advanceBooking,
      cancelBooking,
    ]
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings(): BookingsContextValue {
  return useContext(BookingsContext);
}

export function getNextHandymanAction(status: BookingStatus): WorkflowAction | null {
  return getWorkflowAction(status);
}

export { ACTIVE_HANDYMAN_BOOKING_STATUSES } from '../services/bookingFsm';
