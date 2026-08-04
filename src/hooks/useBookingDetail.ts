import { useCallback, useEffect, useState } from 'react';
import { useBookings } from '../context/BookingsContext';
import { fetchBookingDetail } from '../services/bookingService';
import type { BookingDetail } from '../types';

interface UseBookingDetailReturn {
  detail: BookingDetail | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Full detail for one booking.
 *
 * The list in BookingsContext is the source of truth for status, so this
 * refetches whenever the booking's status or updated_at moves — that is how a
 * transition the counterparty made (or a realtime event) pulls a fresh
 * timeline and payment record without the screen polling on its own.
 */
export function useBookingDetail(bookingId: string | undefined): UseBookingDetailReturn {
  const { getBookingById } = useBookings();
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(!!bookingId);
  const [error, setError] = useState<string | null>(null);

  const liveBooking = bookingId ? getBookingById(bookingId) : undefined;
  const liveVersion = `${liveBooking?.status ?? ''}:${liveBooking?.updatedAt ?? ''}`;

  const load = useCallback(async () => {
    if (!bookingId) {
      setDetail(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      setDetail(await fetchBookingDetail(bookingId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load booking');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
    // liveVersion is intentionally a dependency: it changes when the booking
    // transitions, which is exactly when the detail is stale.
  }, [load, liveVersion]);

  return { detail, isLoading, error, refresh: load };
}
