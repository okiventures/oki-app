import { Booking, BookingStatus, BookingType, ServiceCategory } from '../../src/types';
import {
  transition,
  canTransition,
  getWorkflowAction,
  getAllowedActions,
  getNextAction,
  getToStatus,
  TRANSITIONS,
  FsmError,
  BookingAction,
  TransitionResult,
} from '../../src/services/bookingFsm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b-1',
    clientId: 'c-1',
    clientName: 'Test Client',
    handymanId: '',
    handymanName: '',
    serviceCategory: ServiceCategory.Plumbing,
    bookingType: BookingType.OnDemand,
    status: BookingStatus.Pending,
    description: 'Fix leaky faucet',
    location: '123 Test St',
    amount: 1500,
    platformFee: 150,
    netAmount: 1350,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  } as Booking;
}

function expectFsmError(
  fn: () => TransitionResult,
  expected: {
    reasonCode: FsmError['reasonCode'];
    fromStatus: BookingStatus;
  }
): FsmError {
  try {
    fn();
    throw new Error('Expected FsmError to be thrown');
  } catch (err) {
    const fsmErr = err as FsmError;
    expect(fsmErr.error).toBe('INVALID_STATE_TRANSITION');
    expect(fsmErr.reasonCode).toBe(expected.reasonCode);
    expect(fsmErr.fromStatus).toBe(expected.fromStatus);
    return fsmErr;
  }
}

// ─── Valid Happy-Path Transitions ────────────────────────────────────────────

describe('valid transitions — happy path', () => {
  it('PENDING → ACCEPT (ACCEPT)', () => {
    const booking = makeBooking();
    const result = transition(booking, 'ACCEPT');

    expect(result.booking.status).toBe(BookingStatus.Accepted);
    expect(result.booking.updatedAt).not.toBe(booking.updatedAt);
  });

  it('ACCEPTED → IN_TRANSIT (START_TRANSIT)', () => {
    const booking = makeBooking({ status: BookingStatus.Accepted });
    const result = transition(booking, 'START_TRANSIT');

    expect(result.booking.status).toBe(BookingStatus.InTransit);
  });

  it('IN_TRANSIT → ARRIVED (MARK_ARRIVED)', () => {
    const booking = makeBooking({ status: BookingStatus.InTransit });
    const result = transition(booking, 'MARK_ARRIVED');

    expect(result.booking.status).toBe(BookingStatus.Arrived);
  });

  it('ARRIVED → WORK_STARTED (START_WORK) with beforePhoto', () => {
    const booking = makeBooking({
      status: BookingStatus.Arrived,
      beforePhoto: 'https://example.com/before.jpg',
    });
    const result = transition(booking, 'START_WORK');

    expect(result.booking.status).toBe(BookingStatus.WorkStarted);
  });

  it('WORK_STARTED → COMPLETED (COMPLETE) with afterPhoto', () => {
    const booking = makeBooking({
      status: BookingStatus.WorkStarted,
      afterPhoto: 'https://example.com/after.jpg',
    });
    const result = transition(booking, 'COMPLETE');

    expect(result.booking.status).toBe(BookingStatus.Completed);
  });

  it('COMPLETED → PAID (CAPTURE_PAYMENT)', () => {
    const booking = makeBooking({ status: BookingStatus.Completed });
    const result = transition(booking, 'CAPTURE_PAYMENT');

    expect(result.booking.status).toBe(BookingStatus.Paid);
  });
});

describe('valid transitions — side exits', () => {
  it('PENDING → CANCELLED (CANCEL)', () => {
    const booking = makeBooking();
    const result = transition(booking, 'CANCEL');

    expect(result.booking.status).toBe(BookingStatus.Cancelled);
  });

  it('PENDING → PENDING (REJECT) — status unchanged but event recorded', () => {
    const booking = makeBooking();
    const result = transition(booking, 'REJECT');

    expect(result.booking.status).toBe(BookingStatus.Pending);
    expect(result.booking.updatedAt).toBe(booking.updatedAt);
  });
});

// ─── Invalid Transitions ─────────────────────────────────────────────────────

describe('invalid transitions — skip states', () => {
  const invalidPairs: [BookingStatus, BookingAction][] = [
    [BookingStatus.Pending, 'COMPLETE'],
    [BookingStatus.Pending, 'CAPTURE_PAYMENT'],
    [BookingStatus.Pending, 'START_WORK'],
    [BookingStatus.Accepted, 'COMPLETE'],
    [BookingStatus.Accepted, 'MARK_ARRIVED'],
    [BookingStatus.InTransit, 'START_WORK'],
    [BookingStatus.WorkStarted, 'PAID' as BookingAction],
  ];

  it.each(invalidPairs)('rejects %s → %s with TRANSITION_NOT_ALLOWED', (from, action) => {
    const booking = makeBooking({ status: from });
    expectFsmError(() => transition(booking, action), {
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      fromStatus: from,
    });
  });
});

describe('invalid transitions — terminal states', () => {
  const terminalStatuses: [BookingStatus, BookingAction][] = [
    [BookingStatus.Paid, 'ACCEPT'],
    [BookingStatus.Paid, 'CANCEL'],
    [BookingStatus.Paid, 'COMPLETE'],
    [BookingStatus.Cancelled, 'ACCEPT'],
    [BookingStatus.Cancelled, 'CANCEL'],
    [BookingStatus.Cancelled, 'START_TRANSIT'],
  ];

  it.each(terminalStatuses)('rejects %s → %s with BOOKING_TERMINAL', (status, action) => {
    const booking = makeBooking({ status });
    expectFsmError(() => transition(booking, action), {
      reasonCode: 'BOOKING_TERMINAL',
      fromStatus: status,
    });
  });
});

describe('invalid transitions — post-acceptance cancellation', () => {
  it('rejects ACCEPTED → CANCEL (client cannot cancel after acceptance)', () => {
    const booking = makeBooking({ status: BookingStatus.Accepted });
    expectFsmError(() => transition(booking, 'CANCEL'), {
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      fromStatus: BookingStatus.Accepted,
    });
  });

  it('rejects IN_TRANSIT → CANCEL', () => {
    const booking = makeBooking({ status: BookingStatus.InTransit });
    expectFsmError(() => transition(booking, 'CANCEL'), {
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      fromStatus: BookingStatus.InTransit,
    });
  });
});

// ─── Guard Conditions ────────────────────────────────────────────────────────

describe('guard conditions — photo prerequisites', () => {
  it('blocks START_WORK when beforePhoto is missing', () => {
    const booking = makeBooking({ status: BookingStatus.Arrived, beforePhoto: undefined });
    const err = expectFsmError(() => transition(booking, 'START_WORK'), {
      reasonCode: 'GUARD_NOT_SATISFIED',
      fromStatus: BookingStatus.Arrived,
    });
    expect(err.message).toMatch(/before photo/i);
    expect(err.details.guard_failure).toMatch(/before photo/i);
  });

  it('blocks COMPLETE when afterPhoto is missing', () => {
    const booking = makeBooking({ status: BookingStatus.WorkStarted, afterPhoto: undefined });
    const err = expectFsmError(() => transition(booking, 'COMPLETE'), {
      reasonCode: 'GUARD_NOT_SATISFIED',
      fromStatus: BookingStatus.WorkStarted,
    });
    expect(err.message).toMatch(/after photo/i);
    expect(err.details.guard_failure).toMatch(/after photo/i);
  });

  it('allows START_WORK when beforePhoto is present', () => {
    const booking = makeBooking({
      status: BookingStatus.Arrived,
      beforePhoto: 'https://example.com/before.jpg',
    });
    const result = transition(booking, 'START_WORK');
    expect(result.booking.status).toBe(BookingStatus.WorkStarted);
  });

  it('allows COMPLETE when afterPhoto is present', () => {
    const booking = makeBooking({
      status: BookingStatus.WorkStarted,
      afterPhoto: 'https://example.com/after.jpg',
    });
    const result = transition(booking, 'COMPLETE');
    expect(result.booking.status).toBe(BookingStatus.Completed);
  });
});

// ─── Event Generation ────────────────────────────────────────────────────────

describe('event generation', () => {
  it('creates a BookingEvent on every successful transition', () => {
    const booking = makeBooking();
    const result = transition(booking, 'ACCEPT');

    expect(result.event).toBeDefined();
    expect(result.event.bookingId).toBe('b-1');
    expect(result.event.fromStatus).toBe(BookingStatus.Pending);
    expect(result.event.toStatus).toBe(BookingStatus.Accepted);
    expect(result.event.metadata?.action).toBe('ACCEPT');
    expect(result.event.createdAt).toBeDefined();
  });

  it('generates events with unique IDs', () => {
    const booking = makeBooking();
    const r1 = transition(booking, 'ACCEPT');
    const b2 = makeBooking({ id: 'b-2' });
    const r2 = transition(b2, 'ACCEPT');

    expect(r1.event.id).not.toBe(r2.event.id);
  });

  it('includes actorId when provided', () => {
    const booking = makeBooking();
    const result = transition(booking, 'ACCEPT', { actorId: 'hm-1' });

    expect(result.event.actorId).toBe('hm-1');
  });

  it('includes metadata when provided', () => {
    const booking = makeBooking();
    const result = transition(booking, 'ACCEPT', {
      metadata: { source: 'mobile' },
    });

    expect(result.event.metadata).toMatchObject({
      action: 'ACCEPT',
      source: 'mobile',
    });
  });

  it('records PENDING → PENDING for REJECT with fromStatus === toStatus', () => {
    const booking = makeBooking();
    const result = transition(booking, 'REJECT');

    expect(result.event.fromStatus).toBe(BookingStatus.Pending);
    expect(result.event.toStatus).toBe(BookingStatus.Pending);
    expect(result.event.metadata?.action).toBe('REJECT');
  });
});

// ─── canTransition ───────────────────────────────────────────────────────────

describe('canTransition', () => {
  it('returns null for allowed transitions', () => {
    expect(canTransition(BookingStatus.Pending, 'ACCEPT')).toBeNull();
    expect(canTransition(BookingStatus.Accepted, 'START_TRANSIT')).toBeNull();
    expect(canTransition(BookingStatus.Completed, 'CAPTURE_PAYMENT')).toBeNull();
  });

  it('returns FsmError with TRANSITION_NOT_ALLOWED for invalid transitions', () => {
    const err = canTransition(BookingStatus.Pending, 'COMPLETE');
    expect(err).not.toBeNull();
    expect(err!.reasonCode).toBe('TRANSITION_NOT_ALLOWED');
    expect(err!.fromStatus).toBe(BookingStatus.Pending);
  });

  it('returns FsmError with BOOKING_TERMINAL for terminal states', () => {
    for (const status of [BookingStatus.Paid, BookingStatus.Cancelled]) {
      const err = canTransition(status, 'ACCEPT');
      expect(err).not.toBeNull();
      expect(err!.reasonCode).toBe('BOOKING_TERMINAL');
      expect(err!.fromStatus).toBe(status);
    }
  });
});

// ─── getAllowedActions ────────────────────────────────────────────────────────

describe('getAllowedActions', () => {
  it('returns ACCEPT, CANCEL, REJECT for PENDING', () => {
    const actions = getAllowedActions(BookingStatus.Pending);
    expect(actions).toContain('ACCEPT');
    expect(actions).toContain('CANCEL');
    expect(actions).toContain('REJECT');
    expect(actions).not.toContain('COMPLETE');
    expect(actions).not.toContain('CAPTURE_PAYMENT');
  });

  it('returns only START_TRANSIT for ACCEPTED', () => {
    const actions = getAllowedActions(BookingStatus.Accepted);
    expect(actions).toEqual(['START_TRANSIT']);
  });

  it('returns empty array for terminal states', () => {
    expect(getAllowedActions(BookingStatus.Paid)).toEqual([]);
    expect(getAllowedActions(BookingStatus.Cancelled)).toEqual([]);
  });
});

// ─── Workflow Actions ─────────────────────────────────────────────────────────

describe('getWorkflowAction / getNextAction', () => {
  it('returns correct action for each non-terminal active status', () => {
    const cases: [BookingStatus, string, BookingAction, BookingStatus][] = [
      [BookingStatus.Accepted, 'Head to job', 'START_TRANSIT', BookingStatus.InTransit],
      [BookingStatus.InTransit, 'Mark Arrived', 'MARK_ARRIVED', BookingStatus.Arrived],
      [BookingStatus.Arrived, 'Start Work', 'START_WORK', BookingStatus.WorkStarted],
      [BookingStatus.WorkStarted, 'Complete Job', 'COMPLETE', BookingStatus.Completed],
      [BookingStatus.Completed, 'Mark Paid', 'CAPTURE_PAYMENT', BookingStatus.Paid],
    ];

    for (const [status, expectedLabel, expectedAction, expectedNext] of cases) {
      const action = getWorkflowAction(status);
      expect(action).not.toBeNull();
      expect(action!.label).toBe(expectedLabel);
      expect(action!.action).toBe(expectedAction);
      expect(action!.nextStatus).toBe(expectedNext);

      const next = getNextAction(status);
      expect(next).toEqual(action);
    }
  });

  it('returns null for Pending (no handyman action yet)', () => {
    expect(getWorkflowAction(BookingStatus.Pending)).toBeNull();
  });

  it('returns null for terminal statuses', () => {
    expect(getWorkflowAction(BookingStatus.Paid)).toBeNull();
    expect(getWorkflowAction(BookingStatus.Cancelled)).toBeNull();
  });
});

// ─── getToStatus ──────────────────────────────────────────────────────────────

describe('getToStatus', () => {
  it('returns the correct destination status for each transition', () => {
    const cases: [BookingStatus, BookingAction, BookingStatus][] = [
      [BookingStatus.Pending, 'ACCEPT', BookingStatus.Accepted],
      [BookingStatus.Pending, 'CANCEL', BookingStatus.Cancelled],
      [BookingStatus.Pending, 'REJECT', BookingStatus.Pending],
      [BookingStatus.Accepted, 'START_TRANSIT', BookingStatus.InTransit],
      [BookingStatus.InTransit, 'MARK_ARRIVED', BookingStatus.Arrived],
      [BookingStatus.Arrived, 'START_WORK', BookingStatus.WorkStarted],
      [BookingStatus.WorkStarted, 'COMPLETE', BookingStatus.Completed],
      [BookingStatus.Completed, 'CAPTURE_PAYMENT', BookingStatus.Paid],
    ];

    for (const [from, action, expectedTo] of cases) {
      expect(getToStatus(from, action)).toBe(expectedTo);
    }
  });

  it('returns null for invalid transitions', () => {
    expect(getToStatus(BookingStatus.Pending, 'COMPLETE')).toBeNull();
    expect(getToStatus(BookingStatus.Paid, 'ACCEPT')).toBeNull();
  });
});

// ─── TRANSITIONS table completeness ───────────────────────────────────────────

describe('TRANSITIONS table', () => {
  it('includes all 8 transitions (6 happy-path + 2 side-exits)', () => {
    expect(TRANSITIONS).toHaveLength(8);
  });

  it('covers the full happy path: PENDING → PAID', () => {
    const steps: [BookingStatus, BookingAction, BookingStatus][] = [
      [BookingStatus.Pending, 'ACCEPT', BookingStatus.Accepted],
      [BookingStatus.Accepted, 'START_TRANSIT', BookingStatus.InTransit],
      [BookingStatus.InTransit, 'MARK_ARRIVED', BookingStatus.Arrived],
      [BookingStatus.Arrived, 'START_WORK', BookingStatus.WorkStarted],
      [BookingStatus.WorkStarted, 'COMPLETE', BookingStatus.Completed],
      [BookingStatus.Completed, 'CAPTURE_PAYMENT', BookingStatus.Paid],
    ];

    for (const [from, action, to] of steps) {
      const def = TRANSITIONS.find((t) => t.from === from && t.action === action);
      expect(def).toBeDefined();
      expect(def!.to).toBe(to);
    }
  });
});
