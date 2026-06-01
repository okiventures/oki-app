import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { MOCK_BOOKINGS } from '../mocks';
import { Booking, BookingStatus } from '../types';

const STORAGE_KEY = 'oki_bookings_state';

type HandymanNextAction = {
  label: string;
  nextStatus: BookingStatus;
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
  acceptBooking: (bookingId: string) => void;
  declineBooking: (bookingId: string) => void;
  advanceBooking: (bookingId: string) => void;
  getBookingById: (bookingId: string) => Booking | undefined;
}

const BookingsContext = createContext<BookingsContextValue>({
  bookings: MOCK_BOOKINGS,
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

  const acceptBooking = (bookingId: string) => {
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId && booking.status === BookingStatus.Pending
          ? updateBooking(booking, BookingStatus.Accepted)
          : booking,
      ),
    );
  };

  const declineBooking = (bookingId: string) => {
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId && booking.status === BookingStatus.Pending
          ? updateBooking(booking, BookingStatus.Cancelled)
          : booking,
      ),
    );
  };

  const advanceBooking = (bookingId: string) => {
    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== bookingId) {
          return booking;
        }

        const nextAction = HANDYMAN_WORKFLOW[booking.status];
        if (!nextAction) {
          return booking;
        }

        return updateBooking(booking, nextAction.nextStatus);
      }),
    );
  };

  const value = useMemo(
    () => ({
      bookings,
      acceptBooking,
      declineBooking,
      advanceBooking,
      getBookingById: (bookingId: string) => bookings.find((booking) => booking.id === bookingId),
    }),
    [bookings],
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