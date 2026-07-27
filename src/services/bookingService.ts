import { supabase } from '../lib/supabase';
import { Booking, BookingEvent, BookingStatus, BookingType, ServiceCategory } from '../types';
import { generateId } from '../utils';
import { transition as fsmTransition, canTransition, FsmError, BookingAction } from './bookingFsm';
import { MOCK_BOOKINGS } from '../mocks';

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

export type StateTransitionAction = BookingAction;

export class BookingTransitionError extends Error {
  status?: number;
  body?: Record<string, unknown>;

  constructor(
    message: string,
    { status, body }: { status?: number; body?: Record<string, unknown> } = {}
  ) {
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

// True when no real backend is configured — the app runs on local mock data.
// Demo-only behaviour (e.g. simulated auto-accept) must be gated on this so it
// never runs against a live backend.
export function isMockEnv(): boolean {
  return USE_MOCK;
}

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
    const local = localEvents.get(bookingId);
    if (local && local.length > 0) return [...local];

    // Fall back to synthetic events from mock booking details
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

// ─── Local event + override stores (mock fallback) ───────────────────────────

const localEvents = new Map<string, BookingEvent[]>();
const localOverrides = new Map<string, Partial<Booking>>();

function getLocalBooking(bookingId: string): Booking | undefined {
  const base = MOCK_BOOKINGS.find((b) => b.id === bookingId);
  if (!base) return undefined;
  const override = localOverrides.get(bookingId);
  return override ? { ...base, ...override } : base;
}

function setLocalOverride(bookingId: string, patch: Partial<Booking>) {
  const existing = localOverrides.get(bookingId) ?? {};
  localOverrides.set(bookingId, { ...existing, ...patch });
}

function addLocalEvent(event: BookingEvent) {
  const events = localEvents.get(event.bookingId) ?? [];
  events.push(event);
  localEvents.set(event.bookingId, events);
}

// ─── Local state transition (mock fallback) ──────────────────────────────────

async function applyLocalTransition(
  bookingId: string,
  action: StateTransitionAction
): Promise<Booking> {
  const booking = getLocalBooking(bookingId);
  if (!booking) throw new Error('Booking not found');

  const result = fsmTransition(booking, action, { actorId: 'local' });

  setLocalOverride(bookingId, result.booking);
  addLocalEvent(result.event);

  const updated = getLocalBooking(bookingId);
  if (!updated) throw new Error('Booking not found after transition');
  return updated;
}

// ─── Transition booking state via Edge Function ──────────────────────────────

export async function transitionBookingState(
  bookingId: string,
  action: StateTransitionAction,
  metadata?: Record<string, unknown>,
  currentStatus?: BookingStatus
): Promise<Booking> {
  // Fail-fast: reject invalid transitions before any round trip
  if (currentStatus) {
    const fsmError = canTransition(currentStatus, action);
    if (fsmError) {
      throw new BookingTransitionError(fsmError.message, {
        status: 422,
        body: {
          error: fsmError.error,
          from_status: fsmError.fromStatus,
          to_status: fsmError.toStatus,
          action: fsmError.action,
          reason_code: fsmError.reasonCode,
          details: fsmError.details,
        },
      });
    }
  }

  const hasSession = await checkSession();
  if (!hasSession || metadata?.simulated) {
    try {
      return await applyLocalTransition(bookingId, action);
    } catch (err) {
      if (err instanceof FsmError) {
        throw new BookingTransitionError(err.message, {
          status: 422,
          body: {
            error: err.error,
            from_status: err.fromStatus,
            to_status: err.toStatus,
            action: err.action,
            reason_code: err.reasonCode,
            details: err.details,
          },
        });
      }
      throw err;
    }
  }

  try {
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
        throw (error as any).context ? error : new Error(error.message);
      }

      const bookingRow = data?.data ?? data;
      return mapBookingRow(bookingRow as BookingRow);
    }

    const { data, error } = await supabase.rpc('transition_booking_state', {
      p_booking_id: bookingId,
      p_action: action,
      p_metadata: metadata ?? {},
    });

    if (error) {
      throw new Error(error.message);
    }

    return mapBookingRow(data as BookingRow);
  } catch (err) {
    const ctx = (err as any)?.context;
    let parsedBody: Record<string, unknown> | null = null;
    let status: number | undefined;

    if (ctx && typeof ctx.status === 'number') {
      status = ctx.status;
      try {
        parsedBody = JSON.parse(await ctx.text());
      } catch {
        // body is not valid JSON — fall through to raw error message
      }
    }

    const message =
      typeof parsedBody?.message === 'string'
        ? parsedBody.message
        : err instanceof Error
          ? err.message
          : String(err);

    throw new BookingTransitionError(message, {
      status,
      body: parsedBody ?? undefined,
    });
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
  // Offline demo only: no session → local mock booking.
  if (!hasSession) {
    return createMockBooking(input);
  }

  // With a live session, serviceId + coordinates are required to place a real
  // booking. Missing them is a caller bug — surface it instead of silently
  // fabricating a booking that doesn't exist on the server.
  if (!input.serviceId || input.lat === undefined || input.lng === undefined) {
    throw new Error('createBooking requires serviceId and coordinates for a live booking');
  }

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
    const ctx = (err as any)?.context;
    if (ctx && typeof ctx.status === 'number') {
      try {
        const body = await ctx.text();
        console.warn(
          `createBooking: Edge Function returned ${ctx.status}`,
          body.length < 500 ? body : body.slice(0, 500)
        );
      } catch {
        console.warn(`createBooking: Edge Function returned ${ctx.status}, could not read body`);
      }
    } else {
      console.warn('createBooking: Edge Function failed, falling back to mock', err);
    }
    throw err;
  }
}

// ─── Guard condition descriptions ────────────────────────────────────────────

export { GUARD_DESCRIPTIONS } from './bookingFsm';
