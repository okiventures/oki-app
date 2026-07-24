import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MOCK_BOOKINGS } from '../mocks';
import { Booking, BookingStatus } from '../types';
import {
  transitionBookingState,
  subscribeToBooking,
  createBooking as createBookingService,
  BookingTransitionError,
} from '../services/bookingService';
import { getWorkflowAction, canTransition, WorkflowAction } from '../services/bookingFsm';
import type { CreateBookingInput } from '../services/bookingService';

const STORAGE_KEY = 'oki_bookings_state_v2';

export type CancelBookingResult = { ok: true } | { ok: false; message: string };

interface BookingsContextValue {
  bookings: Booking[];
  createBooking: (input: CreateBookingInput) => Promise<Booking>;
  acceptBooking: (bookingId: string) => void;
  declineBooking: (bookingId: string) => void;
  advanceBooking: (bookingId: string) => void;
  cancelBooking: (bookingId: string) => Promise<CancelBookingResult>;
  getBookingById: (bookingId: string) => Booking | undefined;
  getNextHandymanAction: (status: BookingStatus) => WorkflowAction | null;
}

const BookingsContext = createContext<BookingsContextValue>({
  bookings: MOCK_BOOKINGS,
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
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const subsRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    setBookings(MOCK_BOOKINGS);
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setBookings(JSON.parse(saved) as Booking[]);
        }
      }
    } catch {
      setBookings(MOCK_BOOKINGS);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
      }
    } catch {
      // noop
    }
  }, [bookings]);

  // Subscribe to real-time updates for ALL active bookings (a user can have
  // several in flight at once). Join the ids into a stable key so the effect
  // only re-runs when the active set actually changes.
  const activeBookingIds = useMemo(
    () =>
      bookings
        .filter((b) => !['Completed', 'Paid', 'Cancelled', 'Rejected'].includes(b.status))
        .map((b) => b.id),
    [bookings]
  );
  const activeIdsKey = useMemo(() => [...activeBookingIds].sort().join(','), [activeBookingIds]);

  useEffect(() => {
    const active = new Set(activeIdsKey ? activeIdsKey.split(',') : []);
    const subs = subsRef.current;

    // Drop subscriptions for bookings that are no longer active
    for (const [id, unsub] of subs) {
      if (!active.has(id)) {
        unsub();
        subs.delete(id);
      }
    }

    // Add subscriptions for newly-active bookings
    for (const id of active) {
      if (!subs.has(id)) {
        subs.set(
          id,
          subscribeToBooking(id, (event) => {
            setBookings((current) =>
              current.map((b) =>
                b.id === event.bookingId
                  ? { ...b, status: event.toStatus, updatedAt: new Date().toISOString() }
                  : b
              )
            );
          })
        );
      }
    }
  }, [activeIdsKey]);

  // Tear down every channel on unmount
  useEffect(() => {
    const subs = subsRef.current;
    return () => {
      for (const unsub of subs.values()) unsub();
      subs.clear();
    };
  }, []);

  const createBooking = useCallback(async (input: CreateBookingInput) => {
    const booking = await createBookingService(input);
    setBookings((current) => [...current, booking]);
    return booking;
  }, []);

  const acceptBooking = useCallback(async (bookingId: string) => {
    const updated = await transitionBookingState(bookingId, 'ACCEPT');
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? mergeTransition(booking, updated) : booking
      )
    );
  }, []);

  const declineBooking = useCallback(async (bookingId: string) => {
    // Optimistically reflect the rejection so the inbox updates immediately.
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId && booking.status === BookingStatus.Pending
          ? updateBooking(booking, BookingStatus.Rejected)
          : booking
      )
    );

    try {
      const updated = await transitionBookingState(bookingId, 'REJECT');
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? mergeTransition(booking, updated) : booking
        )
      );
    } catch (err) {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId && booking.status === BookingStatus.Rejected
            ? updateBooking(booking, BookingStatus.Pending)
            : booking
        )
      );
      throw err;
    }
  }, []);

  const advanceBooking = useCallback(
    async (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const nextAction = getWorkflowAction(booking.status);
      if (!nextAction) return;

      try {
        const updated = await transitionBookingState(bookingId, nextAction.action as any);
        setBookings((current) =>
          current.map((b) =>
            b.id === bookingId ? { ...b, ...updated, updatedAt: new Date().toISOString() } : b
          )
        );
        return;
      } catch {}

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
        const updated = await transitionBookingState(bookingId, 'CANCEL');
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
      createBooking,
      acceptBooking,
      declineBooking,
      advanceBooking,
      cancelBooking,
      getBookingById: (bookingId: string) => bookings.find((booking) => booking.id === bookingId),
      getNextHandymanAction: (status: BookingStatus) => getWorkflowAction(status),
    }),
    [bookings, createBooking, acceptBooking, declineBooking, advanceBooking, cancelBooking]
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
