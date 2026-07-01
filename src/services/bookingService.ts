import { supabase } from '../lib/supabase';
import { Booking, BookingEvent, BookingStatus } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingRow {
  id: string;
  client_id: string;
  handyman_id: string | null;
  service_id: string;
  booking_type: 'ON_DEMAND' | 'SCHEDULED';
  status: BookingStatus;
  description: string;
  address_text: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  surge_multiplier: number;
  scheduled_at: string | null;
  request_expires_at: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingEventRow {
  id: string;
  booking_id: string;
  actor_id: string | null;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

type StateTransitionAction =
  | 'ACCEPT'
  | 'REJECT'
  | 'CANCEL'
  | 'START_TRANSIT'
  | 'MARK_ARRIVED'
  | 'START_WORK'
  | 'COMPLETE';

// ─── Config ───────────────────────────────────────────────────────────────────

const USE_MOCK =
  !process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: '',
    handymanId: row.handyman_id ?? '',
    handymanName: '',
    serviceCategory: 'General Handyman' as any,
    bookingType: row.booking_type === 'ON_DEMAND' ? ('OnDemand' as any) : ('Scheduled' as any),
    status: row.status,
    description: row.description,
    location: row.address_text,
    amount: row.amount,
    platformFee: row.platform_fee,
    netAmount: row.net_amount,
    scheduledAt: row.scheduled_at ?? undefined,
    requestExpiresAt: row.request_expires_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    beforePhoto: row.before_photo_url ?? undefined,
    afterPhoto: row.after_photo_url ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapEventRow(row: BookingEventRow): BookingEvent {
  return {
    id: row.id,
    bookingId: row.booking_id,
    actorId: row.actor_id ?? undefined,
    fromStatus: row.from_status ?? undefined,
    toStatus: row.to_status,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

// ─── Fetch bookings ───────────────────────────────────────────────────────────

export async function fetchBookings(): Promise<Booking[]> {
  if (USE_MOCK) {
    const { MOCK_BOOKINGS } = await import('../mocks');
    return MOCK_BOOKINGS;
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*, clients:users!client_id(full_name), handymen:users!handyman_id(full_name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    ...mapBookingRow(row),
    clientName: row.clients?.full_name ?? '',
    handymanName: row.handymen?.full_name ?? '',
  }));
}

// ─── Fetch booking events (audit trail) ───────────────────────────────────────

export async function fetchBookingEvents(bookingId: string): Promise<BookingEvent[]> {
  if (USE_MOCK) {
    // Return synthetic events from mock booking details
    const { MOCK_BOOKING_DETAILS } = await import('../mocks/bookingDetails');
    const detail = MOCK_BOOKING_DETAILS.find((b) => b.id === bookingId);
    if (!detail) return [];
    return detail.timeline
      .filter((t) => t.timestamp !== null)
      .map((t, i) => ({
        id: t.id,
        bookingId: detail.id,
        actorId: undefined,
        fromStatus: i > 0 ? (detail.timeline[i - 1].status as BookingStatus) : undefined,
        toStatus: t.status as BookingStatus,
        metadata: {},
        createdAt: t.timestamp!,
      }));
  }

  const { data, error } = await supabase
    .from('booking_events')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch booking events: ${error.message}`);
  return (data ?? []).map(mapEventRow);
}

// ─── Local state transition (mock fallback) ──────────────────────────────────

const ACTION_TO_STATUS: Record<string, BookingStatus> = {
  ACCEPT: 'Accepted' as BookingStatus,
  REJECT: 'Cancelled' as BookingStatus,
  CANCEL: 'Cancelled' as BookingStatus,
  START_TRANSIT: 'InTransit' as BookingStatus,
  MARK_ARRIVED: 'Arrived' as BookingStatus,
  START_WORK: 'WorkStarted' as BookingStatus,
  COMPLETE: 'Completed' as BookingStatus,
};

async function applyLocalTransition(
  bookingId: string,
  action: StateTransitionAction
): Promise<Booking> {
  const { MOCK_BOOKINGS } = await import('../mocks');
  const booking = MOCK_BOOKINGS.find((b) => b.id === bookingId);
  if (!booking) throw new Error('Booking not found');

  const newStatus = ACTION_TO_STATUS[action];
  if (!newStatus) throw new Error(`Unknown action: ${action}`);

  return {
    ...booking,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Transition booking state via Edge Function ──────────────────────────────

export async function transitionBookingState(
  bookingId: string,
  action: StateTransitionAction,
  metadata?: Record<string, unknown>
): Promise<Booking> {
  if (USE_MOCK || metadata?.simulated) {
    return applyLocalTransition(bookingId, action);
  }

  try {
    // Map action to edge function name
    const functionMap: Record<string, string> = {
      ACCEPT: 'accept-booking',
      COMPLETE: 'complete-booking',
    };

    const functionName = functionMap[action];
    if (functionName) {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { bookingId, ...(metadata ?? {}) },
      });

      if (error) throw new Error(error.message);
      return mapBookingRow(data as BookingRow);
    }

    // For other transitions, call a generic state RPC or direct update
    const { data, error } = await supabase.rpc('transition_booking_state', {
      p_booking_id: bookingId,
      p_action: action,
      p_metadata: metadata ?? {},
    });

    if (error) throw new Error(error.message);
    return mapBookingRow(data as BookingRow);
  } catch (err) {
    // If Edge Function / RPC fails, fall back to local state change
    // so the UI demo remains functional without a live backend.
    console.warn(
      `transitionBookingState: remote call failed, falling back to local.`,
      err instanceof Error ? err.message : err
    );
    return applyLocalTransition(bookingId, action);
  }
}

// ─── Subscribe to real-time booking updates ──────────────────────────────────

export function subscribeToBooking(
  bookingId: string,
  onStateChange: (event: BookingEvent) => void
): () => void {
  if (USE_MOCK) {
    // No-op in mock mode
    return () => {};
  }

  const channel = supabase
    .channel(`booking:${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'booking_events',
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        onStateChange(mapEventRow(payload.new as BookingEventRow));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Guard condition descriptions ────────────────────────────────────────────

export const GUARD_DESCRIPTIONS: Record<string, string> = {
  ACCEPT: 'Booking is PENDING · Handyman is online · KYC approved · Not already assigned',
  REJECT: 'Booking is PENDING',
  CANCEL: 'Booking is PENDING · Caller is the client',
  START_TRANSIT:
    'Caller is assigned handyman · Booking is ACCEPTED · Scheduled window (if applicable)',
  MARK_ARRIVED:
    'Caller is assigned handyman · Booking is IN_TRANSIT · Within 200m geofence (recommended)',
  START_WORK: 'Caller is assigned handyman · Booking is ARRIVED · before_photo_url IS NOT NULL',
  COMPLETE: 'Caller is assigned handyman · Booking is WORK_STARTED · after_photo_url IS NOT NULL',
  CAPTURE_PAYMENT: 'Booking is COMPLETED · payments.status is CAPTURED · Platform fee deducted',
};
