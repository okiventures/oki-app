import { supabase } from '../lib/supabase';
import { Booking, BookingEvent, BookingStatus, BookingType, ServiceCategory } from '../types';
import { generateId } from '../utils';

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
  'ACCEPT' | 'REJECT' | 'CANCEL' | 'START_TRANSIT' | 'MARK_ARRIVED' | 'START_WORK' | 'COMPLETE';

export class BookingTransitionError extends Error {
  readonly status?: number;
  readonly body?: Record<string, unknown>;

  constructor(message: string, status?: number, body?: Record<string, unknown>) {
    super(message);
    this.name = 'BookingTransitionError';
    this.status = status;
    this.body = body;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const USE_MOCK =
  !process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project');

async function checkSession(): Promise<boolean> {
  if (USE_MOCK) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// The database stores statuses as UPPER_SNAKE; the app layer uses the
// PascalCase BookingStatus enum. Translate on the way in so real Supabase rows
// match the UI's filters and enum comparisons.
const DB_STATUS_TO_UI: Record<string, BookingStatus> = {
  PENDING: BookingStatus.Pending,
  ACCEPTED: BookingStatus.Accepted,
  IN_TRANSIT: BookingStatus.InTransit,
  ARRIVED: BookingStatus.Arrived,
  WORK_STARTED: BookingStatus.WorkStarted,
  COMPLETED: BookingStatus.Completed,
  PAID: BookingStatus.Paid,
  CANCELLED: BookingStatus.Cancelled,
  REJECTED: BookingStatus.Rejected,
};

function toUiStatus(dbStatus: string): BookingStatus {
  return DB_STATUS_TO_UI[dbStatus] ?? (dbStatus as BookingStatus);
}

// Rows may arrive with a joined `services(category)` relation; the enum values
// mirror ServiceCategory exactly, so the joined string maps straight through.
type BookingRowWithJoins = BookingRow & { services?: { category?: string } | null };

function mapBookingRow(row: BookingRowWithJoins): Booking {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: '',
    handymanId: row.handyman_id ?? '',
    handymanName: '',
    serviceCategory: (row.services?.category ?? 'General Handyman') as ServiceCategory,
    bookingType: row.booking_type === 'ON_DEMAND' ? ('OnDemand' as any) : ('Scheduled' as any),
    status: toUiStatus(row.status as unknown as string),
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
    .select(
      '*, services!service_id(category), clients:users!client_id(full_name), handymen:users!handyman_id(full_name)'
    )
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
  REJECT: 'Rejected' as BookingStatus,
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

async function throwInvokeError(error: { message: string; context?: Response }): Promise<never> {
  if (error.context) {
    let body: Record<string, unknown> | undefined;
    const text = await error.context.text();
    if (text) {
      try {
        body = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // Response body may be empty or non-JSON.
      }
    }
    const message =
      (typeof body?.message === 'string' && body.message) ||
      error.message ||
      'State transition failed';
    throw new BookingTransitionError(message, error.context.status, body);
  }

  throw new BookingTransitionError(error.message || 'State transition failed');
}

function isInvokeTransportFailure(error: { context?: Response }): boolean {
  return !error.context;
}

function shouldUseLocalTransition(
  hasSession: boolean,
  metadata?: Record<string, unknown>
): boolean {
  return USE_MOCK || !hasSession || metadata?.simulated === true;
}

// ─── Transition booking state via Edge Function ──────────────────────────────

export async function transitionBookingState(
  bookingId: string,
  action: StateTransitionAction,
  metadata?: Record<string, unknown>
): Promise<Booking> {
  const hasSession = await checkSession();
  if (shouldUseLocalTransition(hasSession, metadata)) {
    return applyLocalTransition(bookingId, action);
  }

  // Map action to edge function name
  const functionMap: Record<string, string> = {
    ACCEPT: 'accept-booking',
    REJECT: 'reject-booking',
    CANCEL: 'cancel-booking',
    COMPLETE: 'complete-booking',
  };

  const functionName = functionMap[action];
  if (functionName) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { bookingId, ...(metadata ?? {}) },
    });

    if (error) {
      if (isInvokeTransportFailure(error)) {
        console.warn(
          `transitionBookingState: ${functionName} transport failure, falling back to local.`,
          error.message
        );
        return applyLocalTransition(bookingId, action);
      }

      await throwInvokeError(error);
    }

    // Edge functions respond via ok()/created(), which wrap the row as
    // `{ data: row }`. Unwrap it; fall back to the raw body defensively.
    const bookingRow = (data as { data?: BookingRow })?.data ?? (data as BookingRow);
    return mapBookingRow(bookingRow);
  }

  // For other transitions, call a generic state RPC or direct update
  const { data, error } = await supabase.rpc('transition_booking_state', {
    p_booking_id: bookingId,
    p_action: action,
    p_metadata: metadata ?? {},
  });

  if (error) {
    throw new BookingTransitionError(error.message);
  }

  return mapBookingRow(data as BookingRow);
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

// ─── Create booking ───────────────────────────────────────────────────────────

export interface CreateBookingInput {
  clientId: string;
  clientName: string;
  serviceCategory: ServiceCategory;
  bookingType: BookingType;
  description: string;
  location: string;
  amount: number;
  serviceId?: string;
  lat?: number;
  lng?: number;
  scheduledAt?: string;
  notes?: string;
}

function createMockBooking(input: CreateBookingInput): Booking {
  const id = generateId();
  const platformFee = Math.round(input.amount * 0.1);
  return {
    id,
    clientId: input.clientId,
    clientName: input.clientName,
    handymanId: '',
    handymanName: '',
    serviceCategory: input.serviceCategory,
    bookingType: input.bookingType,
    status: BookingStatus.Pending,
    description: input.description,
    location: input.location,
    amount: input.amount,
    platformFee,
    netAmount: input.amount - platformFee,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scheduledAt: input.scheduledAt,
    notes: input.notes,
  };
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const hasSession = await checkSession();
  if (!hasSession) {
    console.log('createBooking: no session, using mock');
    return createMockBooking(input);
  }

  if (!input.serviceId || input.lat === undefined || input.lng === undefined) {
    console.warn('createBooking: missing serviceId or coordinates, falling back to mock');
    return createMockBooking(input);
  }

  console.log('createBooking: calling Edge Function with serviceId', input.serviceId);
  try {
    const { data, error } = await supabase.functions.invoke('create-booking', {
      body: {
        serviceId: input.serviceId,
        bookingType: input.bookingType === BookingType.OnDemand ? 'ON_DEMAND' : 'SCHEDULED',
        description: input.description,
        addressText: input.location,
        lat: input.lat,
        lng: input.lng,
        scheduledAt: input.scheduledAt ?? null,
        notes: input.notes ?? null,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    const bookingRow = data.data as BookingRow;
    return {
      ...mapBookingRow(bookingRow),
      clientName: input.clientName,
      handymanName: '',
    };
  } catch (err) {
    console.warn('createBooking: Edge Function failed, falling back to mock', err);
    return createMockBooking(input);
  }
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
