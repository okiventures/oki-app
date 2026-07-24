---
name: oki-booking-fsm
description: 'Use when working on booking-related features in the Oki App. Triggers: modifying booking state transitions, adding booking lifecycle behavior, working on BookingsContext or bookingService, implementing handyman workflow CTAs, handling booking cancellation rules, working on booking-related edge functions, or debugging booking status issues.'
metadata:
  author: oki-app
  version: '1.0.0'
---

# Oki Booking State Machine

## States (8 total, 2 terminal)

```
PENDING → ACCEPTED → IN_TRANSIT → ARRIVED → WORK_STARTED → COMPLETED → PAID
                                                                          ↑
                                                            PENDING → CANCELLED
```

| Enum (`BookingStatus`) | DB (`booking_status`) | Terminal | Meaning |
|---|---|---|---|
| `Pending` | `PENDING` | No | Booking created; payment authorized (hold); awaiting handyman |
| `Accepted` | `ACCEPTED` | No | Handyman assigned; scheduled or ready for dispatch |
| `InTransit` | `IN_TRANSIT` | No | Handyman en route; live location published to client |
| `Arrived` | `ARRIVED` | No | Handyman at job site |
| `WorkStarted` | `WORK_STARTED` | No | Work in progress; before-photo captured |
| `Completed` | `COMPLETED` | No | Work finished; after-photo captured; awaiting payment capture |
| `Paid` | `PAID` | **Yes** | Escrow captured; handyman wallet credited; reviews unlocked |
| `Cancelled` | `CANCELLED` | **Yes** | Client cancelled pre-acceptance, or payment auth failed |

---

## Valid Transitions & Guard Conditions

Every transition validates: **actor role**, **booking ownership**, and all **guards**. A successful transition inserts one immutable row into `booking_events`.

| From → To | Action | Actor | Guards |
|---|---|---|---|
| `PENDING` → `ACCEPTED` | `ACCEPT` | Handyman | Booking is PENDING; handyman `is_online = true`; `kyc_status = APPROVED`; handyman offers booking's service category; `handyman_id` set; payment AUTHORIZED; booking not expired |
| `PENDING` → `CANCELLED` | `CANCEL` | Client | Booking is PENDING; caller is `client_id`; release payment hold |
| `ACCEPTED` → `IN_TRANSIT` | `START_TRANSIT` | Handyman | Caller is assigned `handyman_id`; booking is ACCEPTED; for SCHEDULED: within allowed window |
| `IN_TRANSIT` → `ARRIVED` | `MARK_ARRIVED` | Handyman | Caller is assigned `handyman_id`; booking is IN_TRANSIT; recommended geofence ≤ 200m |
| `ARRIVED` → `WORK_STARTED` | `START_WORK` | Handyman | Caller is assigned `handyman_id`; booking is ARRIVED; **`before_photo_url` IS NOT NULL** |
| `WORK_STARTED` → `COMPLETED` | `COMPLETE` | Handyman | Caller is assigned `handyman_id`; booking is WORK_STARTED; **`after_photo_url` IS NOT NULL** |
| `COMPLETED` → `PAID` | (automatic) | System | Booking is COMPLETED; `payments.status = CAPTURED`; platform fee deducted; wallet credited |

### Handyman Decline (NOT a state transition)

| Action | Actor | Behavior |
|---|---|---|
| `REJECT` | Handyman | Booking **remains** PENDING. Records rejection in `booking_events.metadata`; clears tentative assignment; re-broadcasts to other handymen. Does NOT use CANCELLED. |

### Escrow Coupling

| Booking Status | Expected `payments.status` |
|---|---|
| `PENDING` … `COMPLETED` | `AUTHORIZED` (hold active) |
| `PAID` | `CAPTURED` |
| `CANCELLED` (pre-accept) | Hold released |

**Hard rule:** Booking MUST pass through COMPLETED + payment capture before entering PAID.

---

## Invalid Transitions

Any transition not listed above returns `422 Unprocessable Entity` with `reason_code: TRANSITION_NOT_ALLOWED`.

| Attempt | Error |
|---|---|
| `PENDING` → `COMPLETED` | Cannot skip workflow states |
| `ACCEPTED` → `ARRIVED` | Must mark in transit before arrival |
| `IN_TRANSIT` → `WORK_STARTED` | Must mark arrived before starting work |
| `WORK_STARTED` → `PAID` | Must complete work before payment |
| `COMPLETED` → `ACCEPTED` | Cannot revert after completion |
| `PAID` / `CANCELLED` → any | `BOOKING_TERMINAL` (booking is closed) |
| `ACCEPTED` → CANCELLED (client) | Client cannot cancel after acceptance (use dispute flow) |
| `ARRIVED` → `WORK_STARTED` (no photo) | `GUARD_NOT_SATISFIED` (before photo required) |
| `PENDING` → `ACCEPTED` (offline/KYC pending) | `GUARD_NOT_SATISFIED` |

---

## App Implementation

### BookingsContext (`src/context/BookingsContext.tsx`)

The single source of truth for booking state on the frontend. Key patterns:

**HANDYMAN_WORKFLOW** — maps each active status to the next CTA:

```tsx
const HANDYMAN_WORKFLOW: Partial<Record<BookingStatus, HandymanNextAction>> = {
  [BookingStatus.Accepted]:   { label: 'Head to job',    nextStatus: BookingStatus.InTransit },
  [BookingStatus.InTransit]:  { label: 'Mark Arrived',   nextStatus: BookingStatus.Arrived },
  [BookingStatus.Arrived]:    { label: 'Start Work',     nextStatus: BookingStatus.WorkStarted },
  [BookingStatus.WorkStarted]:{ label: 'Complete Job',   nextStatus: BookingStatus.Completed },
  [BookingStatus.Completed]:  { label: 'Mark Paid',      nextStatus: BookingStatus.Paid },
};
```

**NON_CANCELLABLE_STATUSES** — client cancellation blocked after acceptance:

```tsx
const NON_CANCELLABLE_STATUSES = [
  BookingStatus.Accepted,
  BookingStatus.InTransit,
  BookingStatus.Arrived,
  BookingStatus.WorkStarted,
  BookingStatus.Completed,
  BookingStatus.Paid,
  BookingStatus.Cancelled,
  BookingStatus.Rejected,
];
```

**mergeTransition** — preserves richer local fields (clientName, serviceCategory, amounts) while only merging the status/assignment/photos from the API:

```tsx
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
```

### bookingService (`src/services/bookingService.ts`)

**USE_MOCK flag**: When `EXPO_PUBLIC_SUPABASE_URL` is not configured, all operations run on in-memory mock data. Always check `isMockEnv()` before adding demo-only behavior.

**transitionBookingState** — routes to the correct edge function by action:
- `ACCEPT` → `accept-booking`
- `REJECT` → `reject-booking`
- `CANCEL` → `cancel-booking`
- `COMPLETE` → `complete-booking`
- Others (START_TRANSIT, MARK_ARRIVED, START_WORK) → `transition_booking_state` RPC

**BookingTransitionError** — custom error class with optional `status` and `body`. Used by `BookingsContext` to distinguish FSM errors from network errors. Always catch this specifically before generic errors.

**Status mapping**: DB uses `UPPER_SNAKE`; app uses `PascalCase` `BookingStatus` enum. The `DB_STATUS_TO_UI` map handles conversion at the service boundary.

### Edge Functions (`supabase/functions/`)

| Function | Action | Endpoint |
|---|---|---|
| `accept-booking` | ACCEPT | `POST /accept-booking` |
| `reject-booking` | REJECT | `POST /reject-booking` |
| `cancel-booking` | CANCEL | `POST /cancel-booking` |
| `complete-booking` | COMPLETE | `POST /complete-booking` |
| `create-booking` | (creation) | `POST /create-booking` |

All use the shared `rbac.ts` middleware (`requireHandyman`, `requireClient`, `requireAdmin`) and return a consistent response shape: `{ data: bookingRow }` on success, `{ error, message, details }` on failure.

---

## Error Schema (422 Response)

```json
{
  "error": "INVALID_STATE_TRANSITION",
  "message": "Human-readable summary",
  "from_status": "PENDING",
  "to_status": "COMPLETED",
  "action": "COMPLETE",
  "reason_code": "TRANSITION_NOT_ALLOWED",
  "details": {}
}
```

| reason_code | When |
|---|---|
| `TRANSITION_NOT_ALLOWED` | (from, to) pair not in valid transition table |
| `GUARD_NOT_SATISFIED` | Transition valid but precondition failed (photo, payment, role) |
| `WRONG_ACTOR` | Authenticated user not permitted for this action |
| `BOOKING_TERMINAL` | Booking is already PAID or CANCELLED |
| `PAYMENT_NOT_CAPTURED` | Attempt to reach PAID without CAPTURED payment |

---

## Real-time Subscriptions

The `BookingsContext` subscribes to `booking_events` table inserts via Supabase Realtime:

```tsx
const channel = supabase
  .channel(`booking:${bookingId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'booking_events',
    filter: `booking_id=eq.${bookingId}`,
  }, (payload) => {
    onStateChange(mapEventRow(payload.new));
  })
  .subscribe();
```

Active subscriptions are managed per booking ID — cleaned up when a booking becomes terminal.

---

## Quick Reference for Development

- **Adding a new state**: Update `BookingStatus` enum in `src/types/index.ts`, add to `DB_STATUS_TO_UI` in `bookingService.ts`, add to `HANDYMAN_WORKFLOW` in `BookingsContext.tsx` if it has a next action
- **Changing transition rules**: Update the edge function's guard logic AND this skill file
- **Adding a new action**: Register in `StateTransitionAction` union type, add to `ACTION_TO_STATUS`, add edge function if needed
- **Cancellation rules**: Pre-acceptance = PENDING → CANCELLED (client). Post-acceptance = dispute flow only (not through FSM)
- **Photos**: `before_photo_url` required before WORK_STARTED; `after_photo_url` required before COMPLETED. Uploads happen via separate endpoint before the state transition.
