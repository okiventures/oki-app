import { supabase } from '../lib/supabase';
import {
  Booking,
  BookingDetail,
  BookingEvent,
  BookingStatus,
  BookingType,
  OrderDetail,
  ServiceCategory,
  TimelineEvent,
} from '../types';
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

// A row from list_available_bookings(): the same booking columns, flattened,
// plus the joined fields the RPC resolves on the server (it runs as owner, so
// it can read the client's name for a booking the handyman isn't part of yet).
type AvailableBookingRow = BookingRow & {
  service_category: string;
  client_name: string;
  distance_meters: number | null;
};

// bookings.handyman_id references handymen(id), NOT users(id), so the handyman's
// display name is two hops away: bookings → handymen → users. Embedding
// `users!handyman_id` instead fails the request outright with PGRST200.
const BOOKINGS_SELECT =
  '*, services!service_id(category), ' +
  'client:users!client_id(full_name), ' +
  'handyman:handymen!handyman_id(user:users!id(full_name)), ' +
  'reviews(rating, reviewer_id)';

function mapAvailableRow(row: AvailableBookingRow): Booking {
  return {
    ...mapBookingRow({ ...row, services: { category: row.service_category } }),
    clientName: row.client_name ?? '',
    distanceKm:
      row.distance_meters === null || row.distance_meters === undefined
        ? undefined
        : Math.round((row.distance_meters / 1000) * 10) / 10,
  };
}

/**
 * Every booking the signed-in user should see.
 *
 * Clients and the assigned handyman are covered by RLS on `bookings`. A PENDING
 * booking has no handyman yet, so it is invisible to RLS — handymen get that
 * pool from list_available_bookings(), which filters by the categories they
 * offer and their reported location. The two sets are merged and de-duplicated
 * by id (a booking cannot be in both, but the RPC is not transactional with the
 * select, so guard anyway).
 */
export async function fetchBookings(
  userType?: 'client' | 'handyman' | 'admin'
): Promise<Booking[]> {
  if (USE_MOCK) {
    const { MOCK_BOOKINGS } = await import('../mocks');
    return MOCK_BOOKINGS;
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKINGS_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);

  const own: Booking[] = (data ?? []).map((row: any) => ({
    ...mapBookingRow(row),
    clientName: row.client?.full_name ?? '',
    handymanName: row.handyman?.user?.full_name ?? '',
    // Both parties can review the same booking, so pick out the caller's own.
    ratingGiven: (row.reviews ?? []).find((r: any) => r.reviewer_id === userId)?.rating,
  }));

  if (userType !== 'handyman') return own;

  const { data: available, error: availableError } = await supabase.rpc('list_available_bookings');

  // The inbox is additive: a failure here should not blank out the jobs the
  // handyman already has. Surface it in the log and return what we do have.
  if (availableError) {
    console.warn('fetchBookings: list_available_bookings failed:', availableError.message);
    return own;
  }

  const seen = new Set(own.map((booking) => booking.id));
  const pool = ((available ?? []) as AvailableBookingRow[])
    .filter((row) => !seen.has(row.id))
    .map(mapAvailableRow);

  return [...pool, ...own];
}

// ─── Fetch booking detail ─────────────────────────────────────────────────────

// One row from get_booking_detail() (migration 017). The RPC flattens the
// booking, its service, both party names, the handyman's profile stats and the
// payment record, and resolves the geography column into plain lat/lng.
interface BookingDetailRow {
  id: string;
  client_id: string;
  client_name: string | null;
  client_photo_url: string | null;
  handyman_id: string | null;
  handyman_name: string | null;
  handyman_photo_url: string | null;
  handyman_rating: number | null;
  handyman_jobs: number | null;
  service_category: string;
  service_name: string;
  booking_type: 'ON_DEMAND' | 'SCHEDULED';
  status: string;
  description: string;
  address_text: string;
  latitude: number | null;
  longitude: number | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  scheduled_at: string | null;
  request_expires_at: string | null;
  created_at: string;
  updated_at: string;
  photos: string[] | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  notes: string | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  events: {
    id: string;
    from_status: string | null;
    to_status: string;
    actor_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
}

const PAYMENT_STATUS_TO_UI: Record<string, BookingDetail['paymentStatus']> = {
  AUTHORIZED: 'Pending',
  CAPTURED: 'Paid',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
};

const PAYMENT_METHODS: BookingDetail['paymentMethod'][] = ['GCash', 'Credit Card', 'Cash', 'Maya'];

// The happy path, in order. Steps the booking has not reached yet still render,
// greyed out, so the client can see what is coming — that is what a null
// timestamp means to VerticalStepper.
const TIMELINE_STEPS: {
  status: BookingStatus;
  label: string;
  describe: (who: string) => string;
}[] = [
  {
    status: BookingStatus.Pending,
    label: 'Booking Placed',
    describe: () => 'Your request was submitted and is being matched.',
  },
  {
    status: BookingStatus.Accepted,
    label: 'Accepted by Worker',
    describe: (who) => `${who} accepted your booking.`,
  },
  {
    status: BookingStatus.InTransit,
    label: 'Worker In Transit',
    describe: (who) => `${who} is on the way to your location.`,
  },
  {
    status: BookingStatus.Arrived,
    label: 'Worker Arrived',
    describe: (who) => `${who} has arrived at your address.`,
  },
  {
    status: BookingStatus.WorkStarted,
    label: 'Work In Progress',
    describe: (who) => `${who} has started the job.`,
  },
  {
    status: BookingStatus.Completed,
    label: 'Work Completed',
    describe: () => 'The job was marked complete and is awaiting payment.',
  },
  {
    status: BookingStatus.Paid,
    label: 'Payment Released',
    describe: () => 'Payment was captured and released to the worker.',
  },
];

const TERMINAL_STEPS: Partial<Record<BookingStatus, { label: string; description: string }>> = {
  [BookingStatus.Cancelled]: {
    label: 'Booking Cancelled',
    description: 'This booking was cancelled before any work started.',
  },
  [BookingStatus.Rejected]: {
    label: 'Booking Declined',
    description: 'The request was declined and returned to the pool.',
  },
};

/**
 * Turn the raw event trail into stepper rows.
 *
 * Events are the source of truth for *when* something happened; the canonical
 * step list supplies the labels and the not-yet-reached rows. A booking that
 * ended in CANCELLED or REJECTED stops at the steps it actually reached and
 * gets the terminal row appended, so a cancelled booking never shows a greyed
 * out "Payment Released" it will never get to.
 */
function buildTimeline(
  events: BookingDetailRow['events'],
  status: BookingStatus,
  handymanName: string
): TimelineEvent[] {
  const who = handymanName || 'Your handyman';
  const reachedAt = new Map<BookingStatus, string>();

  for (const event of events ?? []) {
    const uiStatus = toUiStatus(event.to_status);
    // First occurrence wins: a re-entered state (e.g. re-dispatch back to
    // PENDING) should keep the original timestamp for that step.
    if (!reachedAt.has(uiStatus)) reachedAt.set(uiStatus, event.created_at);
  }

  const terminal = TERMINAL_STEPS[status];
  const steps = terminal
    ? TIMELINE_STEPS.filter((step) => reachedAt.has(step.status))
    : TIMELINE_STEPS;

  const timeline: TimelineEvent[] = steps.map((step) => ({
    id: `step-${step.status}`,
    status: step.status,
    label: step.label,
    description: step.describe(who),
    timestamp: reachedAt.get(step.status) ?? null,
  }));

  if (terminal) {
    timeline.push({
      id: `step-${status}`,
      status,
      label: terminal.label,
      description: terminal.description,
      timestamp: reachedAt.get(status) ?? null,
    });
  }

  return timeline;
}

function peso(value: number): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// net_amount is a generated column (amount - platform_fee), so `amount` is what
// the client is charged and the fee comes out of the worker's payout. The last
// row is rendered bold as the total, so it goes last.
function buildOrderDetails(row: BookingDetailRow): OrderDetail[] {
  const details: OrderDetail[] = [
    {
      label: 'Service Type',
      value: `${row.service_name} — ${row.booking_type === 'ON_DEMAND' ? 'On Demand' : 'Scheduled'}`,
    },
  ];

  if (row.scheduled_at) {
    details.push({
      label: 'Scheduled For',
      value: new Date(row.scheduled_at).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    });
  }

  details.push(
    { label: 'Job Amount', value: peso(row.amount) },
    { label: 'Platform Fee', value: `−${peso(row.platform_fee)}` },
    { label: 'Worker Payout', value: peso(row.net_amount) },
    { label: 'Total Charged', value: peso(row.amount) }
  );

  return details;
}

function mapBookingDetailRow(row: BookingDetailRow): BookingDetail {
  const status = toUiStatus(row.status);
  const handymanName = row.handyman_name ?? '';
  const method = PAYMENT_METHODS.find((m) => m === row.payment_method);

  return {
    id: row.id,
    // No human-readable booking number exists in the schema yet; the id prefix
    // is stable and short enough to read out over the phone.
    reference: `#OKI-${row.id.slice(0, 8).toUpperCase()}`,
    clientId: row.client_id,
    clientName: row.client_name ?? '',
    handymanId: row.handyman_id ?? '',
    handymanName,
    handymanPhotoUrl: row.handyman_photo_url ?? undefined,
    handymanRating: row.handyman_rating ?? 0,
    handymanJobsCompleted: row.handyman_jobs ?? 0,
    serviceCategory: row.service_category as ServiceCategory,
    bookingType: row.booking_type === 'ON_DEMAND' ? BookingType.OnDemand : BookingType.Scheduled,
    status,
    description: row.description,
    location: row.address_text,
    fullAddress: row.address_text,
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    amount: row.amount,
    platformFee: row.platform_fee,
    netAmount: row.net_amount,
    scheduledAt: row.scheduled_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: row.photos ?? undefined,
    paymentMethod: method ?? 'GCash',
    paymentStatus: PAYMENT_STATUS_TO_UI[row.payment_status ?? ''] ?? 'Pending',
    paymentRef: row.payment_ref ?? undefined,
    paidAt: row.paid_at ?? undefined,
    notes: row.notes ?? undefined,
    orderDetails: buildOrderDetails(row),
    timeline: buildTimeline(row.events, status, handymanName),
  };
}

/**
 * Full detail for one booking, or null if it does not exist or the signed-in
 * user is not a participant (get_booking_detail is SECURITY INVOKER, so RLS
 * turns "not yours" into zero rows rather than an error).
 */
export async function fetchBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  if (USE_MOCK) {
    const { MOCK_BOOKING_DETAILS } = await import('../mocks/bookingDetails');
    return MOCK_BOOKING_DETAILS.find((b) => b.id === bookingId) ?? null;
  }

  const { data, error } = await supabase.rpc('get_booking_detail', { p_booking_id: bookingId });

  if (error) throw new Error(`Failed to fetch booking detail: ${error.message}`);

  const rows = (data ?? []) as BookingDetailRow[];
  if (rows.length === 0) return null;

  return mapBookingDetailRow(rows[0]);
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

/**
 * Fires whenever any booking the signed-in user can see changes.
 *
 * Realtime applies RLS per subscriber, so each side only receives rows it is
 * already allowed to read: the client sees their handyman's transitions, the
 * handyman sees their assigned jobs. Unassigned PENDING bookings match nobody's
 * policy, which is why the request inbox also polls (see BookingsContext).
 */
export function subscribeToBookingChanges(onChange: () => void): () => void {
  if (USE_MOCK) return () => {};

  const channel = supabase
    .channel('bookings:all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onChange)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'booking_events' },
      onChange
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
