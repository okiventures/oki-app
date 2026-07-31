import { Booking, BookingEvent, BookingStatus } from '../types';
import { generateId } from '../utils';

export type BookingAction =
  | 'ACCEPT'
  | 'REJECT'
  | 'CANCEL'
  | 'START_TRANSIT'
  | 'MARK_ARRIVED'
  | 'START_WORK'
  | 'COMPLETE'
  | 'CAPTURE_PAYMENT';

export interface WorkflowAction {
  label: string;
  action: BookingAction;
  nextStatus: BookingStatus;
}

export interface TransitionContext {
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export class FsmError extends Error {
  readonly error: 'INVALID_STATE_TRANSITION' = 'INVALID_STATE_TRANSITION';
  readonly fromStatus: BookingStatus;
  readonly toStatus: BookingStatus | null;
  readonly action: BookingAction;
  readonly reasonCode: 'TRANSITION_NOT_ALLOWED' | 'GUARD_NOT_SATISFIED' | 'BOOKING_TERMINAL';
  readonly details: Record<string, unknown>;

  constructor(opts: {
    message: string;
    fromStatus: BookingStatus;
    toStatus: BookingStatus | null;
    action: BookingAction;
    reasonCode: FsmError['reasonCode'];
    details?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.name = 'FsmError';
    this.fromStatus = opts.fromStatus;
    this.toStatus = opts.toStatus;
    this.action = opts.action;
    this.reasonCode = opts.reasonCode;
    this.details = opts.details ?? {};
  }
}

export interface TransitionResult {
  booking: Booking;
  event: BookingEvent;
}

type GuardResult = { ok: true } | { ok: false; reason: string };
type GuardFn = (booking: Booking) => GuardResult;

interface FsmTransitionDef {
  from: BookingStatus;
  action: BookingAction;
  to: BookingStatus;
  guard?: GuardFn;
}

const TERMINAL_STATUSES: BookingStatus[] = [BookingStatus.Paid, BookingStatus.Cancelled];

// ─── Guards ──────────────────────────────────────────────────────────────────

const beforePhotoGuard: GuardFn = (booking) => {
  if (!booking.beforePhoto) {
    return { ok: false, reason: 'Upload a before photo before starting work' };
  }
  return { ok: true };
};

const afterPhotoGuard: GuardFn = (booking) => {
  if (!booking.afterPhoto) {
    return { ok: false, reason: 'Upload an after photo before completing work' };
  }
  return { ok: true };
};

// ─── Transition definitions ──────────────────────────────────────────────────

export const TRANSITIONS: FsmTransitionDef[] = [
  { from: BookingStatus.Pending, action: 'ACCEPT', to: BookingStatus.Accepted },
  { from: BookingStatus.Pending, action: 'CANCEL', to: BookingStatus.Cancelled },
  { from: BookingStatus.Pending, action: 'REJECT', to: BookingStatus.Pending },
  { from: BookingStatus.Accepted, action: 'START_TRANSIT', to: BookingStatus.InTransit },
  { from: BookingStatus.InTransit, action: 'MARK_ARRIVED', to: BookingStatus.Arrived },
  {
    from: BookingStatus.Arrived,
    action: 'START_WORK',
    to: BookingStatus.WorkStarted,
    guard: beforePhotoGuard,
  },
  {
    from: BookingStatus.WorkStarted,
    action: 'COMPLETE',
    to: BookingStatus.Completed,
    guard: afterPhotoGuard,
  },
  { from: BookingStatus.Completed, action: 'CAPTURE_PAYMENT', to: BookingStatus.Paid },
];

const TRANSITION_MAP = new Map<string, FsmTransitionDef>();
for (const t of TRANSITIONS) {
  TRANSITION_MAP.set(`${t.from}:${t.action}`, t);
}

// ─── Workflow action map ────────────────────────────────────────────────────

const WORKFLOW_ACTIONS: Partial<Record<BookingStatus, WorkflowAction>> = {
  [BookingStatus.Accepted]: {
    label: 'Head to job',
    action: 'START_TRANSIT',
    nextStatus: BookingStatus.InTransit,
  },
  [BookingStatus.InTransit]: {
    label: 'Mark Arrived',
    action: 'MARK_ARRIVED',
    nextStatus: BookingStatus.Arrived,
  },
  [BookingStatus.Arrived]: {
    label: 'Start Work',
    action: 'START_WORK',
    nextStatus: BookingStatus.WorkStarted,
  },
  [BookingStatus.WorkStarted]: {
    label: 'Complete Job',
    action: 'COMPLETE',
    nextStatus: BookingStatus.Completed,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFsmError(
  fromStatus: BookingStatus,
  toStatus: BookingStatus | null,
  action: BookingAction,
  reasonCode: FsmError['reasonCode'],
  message: string,
  details: Record<string, unknown> = {}
): FsmError {
  return new FsmError({ message, fromStatus, toStatus, action, reasonCode, details });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getWorkflowAction(status: BookingStatus): WorkflowAction | null {
  return WORKFLOW_ACTIONS[status] ?? null;
}

export function getNextAction(status: BookingStatus): WorkflowAction | null {
  return WORKFLOW_ACTIONS[status] ?? null;
}

/** All booking statuses that are considered "active" for a handyman's workflow. */
export const ACTIVE_HANDYMAN_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.Accepted,
  BookingStatus.InTransit,
  BookingStatus.Arrived,
  BookingStatus.WorkStarted,
];

export function getAllowedActions(status: BookingStatus): BookingAction[] {
  if (TERMINAL_STATUSES.includes(status)) return [];
  return TRANSITIONS.filter((t) => t.from === status).map((t) => t.action);
}

export function canTransition(from: BookingStatus, action: BookingAction): FsmError | null {
  if (TERMINAL_STATUSES.includes(from)) {
    return makeFsmError(from, null, action, 'BOOKING_TERMINAL', `Booking is ${from}`);
  }
  const def = TRANSITION_MAP.get(`${from}:${action}`);
  if (!def) {
    return makeFsmError(
      from,
      null,
      action,
      'TRANSITION_NOT_ALLOWED',
      `Cannot transition from ${from} with action ${action}`
    );
  }
  return null;
}

export function getToStatus(from: BookingStatus, action: BookingAction): BookingStatus | null {
  const def = TRANSITION_MAP.get(`${from}:${action}`);
  return def?.to ?? null;
}

function checkGuards(booking: Booking, action: BookingAction): GuardResult {
  const def = TRANSITION_MAP.get(`${booking.status}:${action}`);
  if (!def?.guard) return { ok: true };
  return def.guard(booking);
}

export function transition(
  booking: Booking,
  action: BookingAction,
  context: TransitionContext = {}
): TransitionResult {
  const fromStatus = booking.status;

  const checkError = canTransition(fromStatus, action);
  if (checkError) throw checkError;

  const guardResult = checkGuards(booking, action);
  if (!guardResult.ok) {
    throw makeFsmError(
      fromStatus,
      getToStatus(fromStatus, action),
      action,
      'GUARD_NOT_SATISFIED',
      guardResult.reason,
      { guard_failure: guardResult.reason }
    );
  }

  const def = TRANSITION_MAP.get(`${fromStatus}:${action}`)!;
  const toStatus = def.to;
  const now = new Date().toISOString();

  const updatedBooking: Booking =
    action === 'REJECT' ? booking : { ...booking, status: toStatus, updatedAt: now };

  const event: BookingEvent = {
    id: generateId(),
    bookingId: booking.id,
    actorId: context.actorId,
    fromStatus,
    toStatus: action === 'REJECT' ? fromStatus : toStatus,
    metadata: { action, ...(context.metadata ?? {}) },
    createdAt: now,
  };

  return { booking: updatedBooking, event };
}

export const ACTION_LABELS: Record<BookingAction, string> = {
  ACCEPT: 'Accept Booking',
  REJECT: 'Reject Booking',
  CANCEL: 'Cancel Booking',
  START_TRANSIT: 'Head to Job',
  MARK_ARRIVED: 'Mark Arrived',
  START_WORK: 'Start Work',
  COMPLETE: 'Complete Job',
  CAPTURE_PAYMENT: 'Capture Payment',
};

export const GUARD_DESCRIPTIONS: Record<BookingAction, string> = {
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
