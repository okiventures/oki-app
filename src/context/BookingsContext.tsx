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
} from '../services/bookingService';
import type { CreateBookingInput } from '../services/bookingService';

const STORAGE_KEY = 'oki_bookings_state_v2';

type HandymanNextAction = {
  label: string;
  nextStatus: BookingStatus;
};

const ACTION_STATUS_MAP: Record<string, BookingStatus> = {
  ACCEPT: BookingStatus.Accepted,
  START_TRANSIT: BookingStatus.InTransit,
  MARK_ARRIVED: BookingStatus.Arrived,
  START_WORK: BookingStatus.WorkStarted,
  COMPLETE: BookingStatus.Completed,
};

const HANDYMAN_WORKFLOW: Partial<Record<BookingStatus, HandymanNextAction>> = {
  [BookingStatus.Accepted]: {
    label: 'Head to job',
    nextStatus: BookingStatus.InTransit,
  },
  [BookingStatus.InTransit]: {
    label: 'Mark Arrived',
    nextStatus: BookingStatus.Arrived,
  },
  [BookingStatus.Arrived]: {
    label: 'Start Work',
    nextStatus: BookingStatus.WorkStarted,
  },
  [BookingStatus.WorkStarted]: {
    label: 'Complete Job',
    nextStatus: BookingStatus.Completed,
  },
  [BookingStatus.Completed]: {
    label: 'Mark Paid',
    nextStatus: BookingStatus.Paid,
  },
};

interface BookingsContextValue {
  bookings: Booking[];
  createBooking: (input: CreateBookingInput) => Promise<Booking>;
  acceptBooking: (bookingId: string) => void;
  declineBooking: (bookingId: string) => void;
  advanceBooking: (bookingId: string) => void;
  getBookingById: (bookingId: string) => Booking | undefined;
}

const BookingsContext = createContext<BookingsContextValue>({
  bookings: MOCK_BOOKINGS,
  createBooking: async () => MOCK_BOOKINGS[0],
  acceptBooking: () => {},
  declineBooking: () => {},
  advanceBooking: () => {},
  getBookingById: () => undefined,
});

function updateBooking(booking: Booking, status: BookingStatus): Booking {
  return {
    ...booking,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const unsubRef = useRef<(() => void) | null>(null);

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

  // Subscribe to real-time updates for active bookings
  const activeBookingIds = useMemo(
    () =>
      bookings
        .filter((b) => !['Completed', 'Paid', 'Cancelled'].includes(b.status))
        .map((b) => b.id),
    [bookings]
  );
  const trackedBookingId = activeBookingIds.length > 0 ? activeBookingIds[0] : null;

  useEffect(() => {
    // Clean up previous subscription
    if (unsubRef.current) {
      unsubRef.current();
    }

    // Subscribe to the first active booking for real-time events
    if (trackedBookingId) {
      unsubRef.current = subscribeToBooking(trackedBookingId, (event) => {
        // Update booking status when a state transition event is received
        setBookings((current) =>
          current.map((b) =>
            b.id === event.bookingId
              ? { ...b, status: event.toStatus, updatedAt: new Date().toISOString() }
              : b
          )
        );
      });
    }

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
      }
    };
  }, [trackedBookingId]);

  const createBooking = useCallback(async (input: CreateBookingInput) => {
    const booking = await createBookingService(input);
    setBookings((current) => [...current, booking]);

    // Simulate handyman acceptance after 5 seconds for demo
    setTimeout(async () => {
      try {
        await transitionBookingState(booking.id, 'ACCEPT');
      } catch {
        // Fallback: apply locally
      }
      setBookings((current) =>
        current.map((b) =>
          b.id === booking.id && b.status === BookingStatus.Pending
            ? {
                ...b,
                status: BookingStatus.Accepted,
                handymanId: 'h1',
                handymanName: 'Ceferino Jumao-as V',
                updatedAt: new Date().toISOString(),
              }
            : b
        )
      );
    }, 5000);

    return booking;
  }, []);

  const acceptBooking = useCallback(async (bookingId: string) => {
    try {
      const updated = await transitionBookingState(bookingId, 'ACCEPT');
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? { ...booking, ...updated, updatedAt: new Date().toISOString() }
            : booking
        )
      );
    } catch {
      // Fallback to local state transition
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId && booking.status === BookingStatus.Pending
            ? updateBooking(booking, BookingStatus.Accepted)
            : booking
        )
      );
    }
  }, []);

  const declineBooking = useCallback(async (bookingId: string) => {
    try {
      await transitionBookingState(bookingId, 'REJECT');
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId && booking.status === BookingStatus.Pending
            ? updateBooking(booking, BookingStatus.Cancelled)
            : booking
        )
      );
    } catch {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId && booking.status === BookingStatus.Pending
            ? updateBooking(booking, BookingStatus.Cancelled)
            : booking
        )
      );
    }
  }, []);

  const advanceBooking = useCallback(
    async (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const nextAction = HANDYMAN_WORKFLOW[booking.status];
      if (!nextAction) return;

      const actionKey = Object.entries(ACTION_STATUS_MAP).find(
        ([, s]) => s === nextAction.nextStatus
      )?.[0];

      if (actionKey) {
        try {
          const updated = await transitionBookingState(bookingId, actionKey as any);
          setBookings((current) =>
            current.map((b) =>
              b.id === bookingId ? { ...b, ...updated, updatedAt: new Date().toISOString() } : b
            )
          );
          return;
        } catch {
          // Fallback to local state transition
        }
      }

      setBookings((current) =>
        current.map((booking) => {
          if (booking.id !== bookingId) return booking;
          const action = HANDYMAN_WORKFLOW[booking.status];
          if (!action) return booking;
          return updateBooking(booking, action.nextStatus);
        })
      );
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
      getBookingById: (bookingId: string) => bookings.find((booking) => booking.id === bookingId),
    }),
    [bookings, createBooking, acceptBooking, declineBooking, advanceBooking]
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings(): BookingsContextValue {
  return useContext(BookingsContext);
}

export function getNextHandymanAction(status: BookingStatus): HandymanNextAction | null {
  return HANDYMAN_WORKFLOW[status] ?? null;
}

export const ACTIVE_HANDYMAN_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.Accepted,
  BookingStatus.InTransit,
  BookingStatus.Arrived,
  BookingStatus.WorkStarted,
];
