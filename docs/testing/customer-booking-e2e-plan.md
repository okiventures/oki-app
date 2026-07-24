# Customer Booking Flow — E2E / Integration Test Plan

Status: draft · Target branch: `dev` · Owner: TBD

## 1. Context

The real app lives on `dev` and feature branches (`main` is a scaffold). Testing
today is **Jest unit tests only** — edge functions and services with a mocked
Supabase. There is no UI-render, navigation, or flow coverage, and no e2e tooling
(no Detox / Maestro / Playwright / `@testing-library/react-native`).

CI (`.github/workflows/ci.yml`) runs on push/PR to `dev`: `lint`, `type-check`,
`test:ci` (jest). No build or post-deploy verification step.

**Conclusion:** the customer booking flow has zero coverage above the service
layer. This plan closes that gap.

## 2. The path under test

```
(client) home  →  new-booking wizard          →  create-booking edge fn  →  booking detail
app/(client)/     app/new-booking.tsx             src/services/               app/booking/[id].tsx
index.tsx         Category→Details→Schedule→Review  bookingService.ts          Overview/Timeline/Payment
                                                                                + BookingSearchingState (realtime)
```

Key facts pinned from source:

- `createBooking` requires a session; with a session it **requires** `serviceId`,
  `lat`, `lng` or it throws `createBooking requires serviceId and coordinates`.
- Edge-fn body: `{ serviceId, bookingType('ON_DEMAND'|'SCHEDULED'), description,
addressText, lat, lng, scheduledAt, notes }`.
- `BookingStatus` enum: `Pending, Accepted, InTransit, Arrived, WorkStarted,
Completed, Paid, Cancelled, Rejected`. "Searching" is a UI state while `Pending`.
- Client cancel is allowed **only** pre-acceptance; `NON_CANCELLABLE_STATUSES`
  blocks `Accepted`+ (see `src/context/BookingsContext.tsx`).
- "Book later" uses `useHandymanAvailability` → blocked time slots.

## 3. Two-layer strategy

| Layer               | Tooling                                               | Runs                  | Speed   | Catches                                                                                   |
| ------------------- | ----------------------------------------------------- | --------------------- | ------- | ----------------------------------------------------------------------------------------- |
| **A — Integration** | `@testing-library/react-native` + jest (existing job) | every PR to `dev`     | seconds | wizard logic, validation gates, submit payload, navigation, error surfacing, cancel guard |
| **B — True e2e**    | Maestro on an EAS dev build vs real dev Supabase      | post-deploy / nightly | minutes | real DB writes, RLS, realtime, edge-fn wiring, auth+KYC gating                            |

Layer A first (highest ROI, no device build). Layer B mirrors the same happy path
as the deploy gate.

## 4. Coverage matrix — customer booking

Priority: P0 = launch-blocking, P1 = important, P2 = nice-to-have.
Layer: A = integration (jest+RTL), B = device e2e (Maestro).

| ID    | Path / scenario                                                                               | Pri | Layer | Assertion                                                                           |
| ----- | --------------------------------------------------------------------------------------------- | --- | ----- | ----------------------------------------------------------------------------------- |
| CB-01 | Wizard happy path: category → sub-service → address+description → date/time → review → submit | P0  | A+B   | `create-booking` invoked once with correct mapped body; navigates to `booking/[id]` |
| CB-02 | Step validation gates (`canAdvance`) — cannot advance without required field per step         | P0  | A     | Next disabled / blocked until field set, each step                                  |
| CB-03 | "Book now" (ON_DEMAND) vs "Book later" (SCHEDULED) mode                                       | P0  | A+B   | `bookingType` + `scheduledAt` correct for each mode                                 |
| CB-04 | "Book later" blocked time slot (`useHandymanAvailability`)                                    | P1  | A     | Blocked slot not selectable / submit prevented                                      |
| CB-05 | Category→service slug + coords mapping (`CATEGORY_TO_SERVICE`, `SUB_SERVICE_TO_SLUG`)         | P1  | A     | Correct `serviceId` slug + default lat/lng in payload                               |
| CB-06 | Submit failure: edge-fn non-2xx (422 guard)                                                   | P0  | A+B   | Error shown; user stays on Review; no navigation                                    |
| CB-07 | Submit failure: missing serviceId/coords guard                                                | P1  | A     | `createBooking` throws; UI shows error, not a fake booking                          |
| CB-08 | Searching state after create (Pending)                                                        | P0  | A+B   | `BookingSearchingState` renders; `subscribeToBooking` established                   |
| CB-09 | Realtime: handyman accepts → customer sees `Accepted`                                         | P0  | B     | UI transitions out of searching to accepted view                                    |
| CB-10 | Booking detail tabs render (Overview / Timeline / Payment)                                    | P1  | A+B   | Each tab renders from seeded booking                                                |
| CB-11 | Cancel allowed pre-acceptance (`Pending`)                                                     | P0  | A+B   | Cancel succeeds → `Cancelled`                                                       |
| CB-12 | Cancel blocked post-acceptance (`NON_CANCELLABLE_STATUSES`)                                   | P0  | A     | Cancel disabled / returns `{ ok:false }`                                            |
| CB-13 | Lifecycle reflected to customer: Accepted→InTransit→Arrived→WorkStarted→Completed→Paid        | P1  | B     | Each realtime transition updates customer view                                      |
| CB-14 | Review/rating after Completed (`app/review/[id].tsx`)                                         | P1  | A+B   | Rating submit persists                                                              |
| CB-15 | Payment tab reflects `payment-webhook` capture                                                | P1  | B     | Payment status shown as captured/paid                                               |
| CB-16 | Auth precondition: unauthenticated → login before booking (`useProtectedRoute`)               | P0  | B     | Redirect to login when no session                                                   |
| CB-17 | KYC-lite gating before booking (`app/(verification)/client/kyc-lite.tsx`)                     | P1  | B     | Booking blocked until KYC-lite done                                                 |

## 5. Adjacent customer-side (out of scope for v1, track separately)

Messages, notifications, address book, payment-method management, reports.

## 6. Implementation notes

### Layer A setup

- Add dev deps: `@testing-library/react-native`, `@testing-library/jest-native`.
- Reuse `__tests__/__mocks__/supabase.ts`; add a `create-booking` invoke mock
  returning a canned `BookingRow`.
- Mock `expo-router` `useRouter`/`useLocalSearchParams`; assert `router.push`.
- Wrap render in `ThemeContext` + `BookingsContext` providers (or a test wrapper).
- Files: `__tests__/flows/new-booking.test.tsx`, `booking-detail.test.tsx`,
  `booking-cancel.test.tsx`.
- No CI change needed — picked up by the existing `test:ci` job.

### Layer B setup

- Add Maestro flows under `.maestro/` (e.g. `customer-booking-happy.yaml`).
- Seed a dev test client + service via `backend/supabase/functions/seed`.
- New CI job (or nightly workflow) that builds an EAS dev/preview build, boots an
  emulator, runs `maestro test .maestro/`. Gate on deploy-to-dev, not every PR.
- Needs test-account credentials + dev Supabase URL as CI secrets.

## 7. Suggested sequencing

1. Layer A: CB-01, CB-02, CB-06, CB-07 (wizard + submit success/failure).
2. Layer A: CB-03, CB-11, CB-12 (modes + cancel guard).
3. Layer B: CB-01, CB-08, CB-09, CB-16 (happy path + searching + accept + auth) as deploy gate.
4. Fill remaining P1s.
