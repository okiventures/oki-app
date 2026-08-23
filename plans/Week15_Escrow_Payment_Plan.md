# Week 15 — Escrow Foundation: Payment Provider Options + Implementation Plan

Covers `Implementation_Checklist_by_Weeks.md` lines 479–506 (Week 15 · Aug 13–19).

---

## Part 1 — Payment provider options for the Philippines

### Why Stripe is out

Stripe does not onboard PH-domiciled businesses. No PHP settlement to local banks, no GCash/Maya/GrabPay acceptance, no InstaPay/PESONet payout rail. For a marketplace that has to pay Filipino handymen in pesos there is no workaround worth building — a Stripe Atlas / US-entity setup gives you card acceptance and nothing else, and it still leaves you without a payout rail.

### The options

**A. PayMongo — recommended for acceptance**

- Methods: Visa/Mastercard, GCash, Maya, GrabPay, QR Ph, online banking (BPI, UnionBank), BNPL.
- Escrow primitive: **Hold-then-Capture**. Set `capture_type: manual` on a PaymentIntent, it lands in `awaiting_capture`, then `POST /payment_intents/:id/capture` within **7 days** or it auto-voids. **Cards only** — this is documented under "advanced card features", the e-wallets do not support it.
- Payouts: **Money Movement** product — wallets, ledgers, disbursements to any PH bank or e-wallet over InstaPay/PESONet/QR Ph, up to 2,500 payouts per batch. This is the Week 16 rail.
- Fees (published June 2026): QR Ph 1.34%, domestic cards 3.125% + ₱13.39, international cards 4.02% + ₱13.39, GCash 2.23%, Maya 1.79%, GrabPay 1.96%.
- Licensed by BSP as both OPS and EMI.
- Fit: best docs and DX of the PH options, and the PaymentIntent model maps almost 1:1 onto what is already in `001_core_schema.sql` — `payments.provider` already defaults to `'paymongo'`.

**B. Xendit / xenPlatform — recommended if you want the money off Oki's balance sheet**

- Sub-account per handyman, **Split Rule** for automatic commission, payouts and refunds via API. Split Rule is enabled for PH by default.
- Strongest marketplace primitives of any PH provider: funds can sit in a handyman's Xendit sub-account under Xendit's license instead of pooling in an account Oki controls. That materially reduces the regulatory problem below.
- BSP-supervised (Xendit Philippines Inc. / XenRemit Inc.).
- Downsides: no card auth-hold as clean as PayMongo's, so escrow is modeled as "hold in sub-account, then transfer". KYB onboarding for every sub-merchant is real work — it would collide with the KYC flow already built.

**C. Maya Business**

- Native Authorize & Capture with longer hold windows than a standard auth. Best conversion on Maya wallet, plus cards and QR Ph.
- Disbursement is a separate product and a separate contract. Enterprise-flavored onboarding, slower to get sandbox credentials.
- Reasonable as a *second* acceptance provider later, not as the one you build Week 15 on.

**D. Dragonpay — supplementary only**

- OTC channels (7-Eleven, Cebuana, bayad centers) and online banking. Genuinely useful for unbanked clients.
- No auth-hold, confirmation is asynchronous and can take hours, API is dated. Only worth adding as an extra funding channel once the core rail works.

**E. Cash on completion**

- No gateway, no fee, no escrow. Handyman collects cash, Oki debits the platform fee from the handyman wallet. Fee collection becomes a receivable problem and every dispute becomes manual.
- Keep it as a *fallback method* in the payment sheet, not a primary rail. Decide in Week 15 whether it ships at all (see open decisions).

### Recommendation

**PayMongo for acceptance in Week 15.** Keep the payout rail decision open until Week 16 by putting everything behind a `PaymentProvider` adapter. If PayMongo Money Movement onboarding stalls, Xendit drops in for payouts without touching booking code.

### The constraint that shapes the entire design

Hold-then-capture is card-only and capped at 7 days, and most PH volume is GCash/Maya. Gateway-level escrow therefore cannot be the mechanism. The design is **platform-ledger escrow** with two funding modes:

| Payment method | Gateway behavior | Escrow mechanism |
| --- | --- | --- |
| Card, job completes within 7 days | `capture_type: manual` → `awaiting_capture` | real gateway hold, capture at `COMPLETED` |
| Card, scheduled more than 7 days out | immediate charge | ledger escrow |
| GCash / Maya / GrabPay / QR Ph | immediate charge at booking | ledger escrow |
| Cash | none | no escrow, fee debited from handyman wallet |

Ledger escrow means the money is captured into Oki's merchant account at booking time, recorded as an `escrow_holds` row, and only credited to `handymen.wallet_balance` after the 24-hour dispute window closes. Client refunds go through the provider refund API rather than a void.

### Regulatory flag — start this now, it gates real-money launch

Pooling client funds and disbursing them makes Oki an Operator of Payment System under BSP Circular 1049. Registration is required before, or within one month of, commencing operations. Two ways to reduce exposure:

1. Use Xendit sub-accounts so the licensed entity holds the money, not Oki.
2. Register as an OPS.

This is a founder/legal task, not a code task, but it should start in Week 15 alongside the build. Sandbox work is unaffected.

---

## Part 2 — What already exists

Audited against the current branch. Worth reading before planning any of the work below.

| Thing | State |
| --- | --- |
| `payments` table (`001_core_schema.sql:157`) | exists — `booking_id` UNIQUE, status enum `AUTHORIZED/CAPTURED/FAILED/REFUNDED`, `provider` defaults `'paymongo'`, `provider_payment_id`, `provider_auth_id`, `authorized_at`/`captured_at`/`refunded_at`, `failure_reason` |
| `wallet_transactions` (`001_core_schema.sql:206`) | exists — handyman ledger with `balance_after` |
| `create_booking` RPC | inserts a `payments` row at `AUTHORIZED` with **no gateway call**. Fake. Must change. |
| `payment-webhook` edge function | exists with a good HMAC + timestamp-skew + timing-safe-compare implementation, but it's a made-up signature scheme, not PayMongo's, and idempotency keys off `bookings.status` rather than an event id |
| `execute_payment_transaction` RPC (`002_rpcs.sql:8`) | credits `handymen.wallet_balance` **immediately on capture**. Directly violates the 24-hour escrow requirement. Must be split. |
| FSM trigger (`20260724000000_014_booking_fsm_trigger.sql`) | enforces transitions and photo guards, **no payment guard at all** |
| `pg_cron` + `pg_net` | installed, with an env-driven unschedule-then-schedule pattern already established in `20260730000000_019_notification_cron_env.sql` — reuse it for the release sweeper |
| `notification_queue` | exists, ready for the payment-failure and escrow-release notifications |
| Admin transactions — React Native (`app/(admin)/transactions.tsx`) | **live**, via `useAdminDashboard`. This is the console that is actually running |
| Admin transactions — Next.js (`apps/admin/app/transactions/page.tsx`) | separate app in the pnpm workspace, imports `MOCK_TRANSACTIONS`. Not wired to anything real |

**Migration numbering:** prefixes 010, 012, 015, 016, 017 and 018 are each used twice in `supabase/migrations/`. PR #57 fixed the schema-*version* conflict that broke fresh provisioning; the duplicated numeric prefixes remain and are cosmetic, because the real version Supabase orders on is the 14-digit timestamp. Continue at **025** and do not reuse a number.

---

## Part 3 — Day-by-day plan

### Day 0 — reconcile catalog pricing (blocker, do this before anything else)

**The app quotes one price and the server charges another.** The booking form shows `NEW_BOOKING_CATEGORIES[].subServices[].startingPrice`, a hardcoded constant. `create_booking` ignores the client's `amount` and derives it from `services.base_rate` — correct, and the right defence, but `SUB_SERVICE_TO_SLUG` collapses 15 sub-services onto 3 catalog slugs, so the two numbers are unrelated:

| Sub-service | Quoted | Resolves to | Charged | |
| --- | --- | --- | --- | --- |
| Touch-Up & Repair | ₱350 | `painting-interior` | ₱2,000 | 5.7× |
| Interior Painting | ₱800 | `painting-interior` | ₱2,000 | 2.5× |
| Exterior Painting | ₱1,200 | `painting-interior` | ₱2,000 | 1.7× |
| Laundry & Ironing | ₱200 | `cleaning-general` | ₱350 | 1.75× |
| Deep Cleaning | ₱600 | `cleaning-general` | ₱350 | under |
| Deep Tissue | ₱450 | `general-handyman` | ₱300 | under |
| Foot Reflexology | ₱250 | `general-handyman` | ₱300 | over |
| Furniture Assembly | ₱300 | `general-handyman` | ₱300 | only exact match |

14 of 15 sub-services are wrong. Today it is cosmetic because no money moves. Week 15 makes it a billing defect: escrow, disputes and refunds all sit downstream of an amount the client never agreed to. Charging ₱2,000 for a ₱350 touch-up is not a rounding argument, it is a chargeback.

**Fix: make the catalog authoritative, the same way `src/constants/bookableCategories.ts` made the category list authoritative.**

- `20260813000000_025_service_catalog.sql` — one `services` row per bookable sub-service, slug equal to the sub-service id, `base_rate` equal to the price the app currently advertises. Idempotent (`ON CONFLICT (slug) DO UPDATE`) so it corrects the three overlapping slugs (`cleaning-general`, `painting-interior`, `general-handyman`) as well as inserting the twelve missing ones.
- `catalogService` gains sub-service fetching; the booking form renders prices and passes `serviceId` straight from catalog rows.
- **Delete `SUB_SERVICE_TO_SLUG`.** That map is the bug.
- Keep the hardcoded constants as the `isMockEnv()` fallback only, matching the pattern in `src/services/bookingService.ts:77`.

Only three catalog slugs are reachable from the UI today, because the MVP ships four categories. The seeded Plumbing, Electrical, Carpentry and HVAC rows are real but unbookable, so the escrow test matrix exercises three price points unless this step widens it.

### Day 1 — provider adapter + PayMongo sandbox

New files under `supabase/functions/_shared/payments/`:

- `types.ts` — `PaymentProvider` interface: `createIntent`, `capture`, `void`, `refund`, `verifyWebhook(rawBody, sigHeader) -> ProviderEvent`. `ProviderEvent` is an internal union, not PayMongo's event names, so a provider swap doesn't reach the webhook handler's business logic.
- `paymongo.ts` — Basic-auth against `/v1/payment_intents`, `/v1/payment_intents/:id/capture`, `/v1/refunds`.
- `mock.ts` — deterministic provider for local dev and CI, selected by `PAYMENT_PROVIDER=mock`. Mirrors the `isMockEnv()` pattern already in `src/services/bookingService.ts:77`.
- `index.ts` — `getProvider()` reading `PAYMENT_PROVIDER`.

Secrets to add (`supabase/config.toml` + a `.env.example`): `PAYMENT_PROVIDER`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET`.

Client side: `src/services/paymentService.ts` following the existing service shape, and `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` in `env.d.ts`.

### Day 1–2 — migration 026/027: escrow schema

Split into two files, because `ALTER TYPE ... ADD VALUE` cannot be used in the same transaction that references the new value:

`20260813010000_026_payment_enums.sql`

- `ALTER TYPE payment_status ADD VALUE 'PENDING_AUTH'`, `ADD VALUE 'VOIDED'`
- `CREATE TYPE escrow_status AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED')`

`20260813020000_027_escrow_foundation.sql`

- `escrow_holds` — `id`, `booking_id` UNIQUE, `payment_id`, `handyman_id`, `gross_amount`, `platform_fee`, `net_amount`, `status escrow_status`, `held_at`, `release_at` (default `now() + 24h`), `released_at`, `released_by` (nullable admin), `release_reason`.
- `webhook_events` — `id`, `provider`, `provider_event_id` UNIQUE, `event_type`, `payload jsonb`, `received_at`, `processed_at`, `status`, `error`. **This UNIQUE column is the idempotency key** the checklist asks for.
- `payment_attempts` — `id`, `booking_id`, `attempt_no`, `provider_payment_id`, `status`, `failure_code`, `failure_message`, `created_at`. Drives the 3-strike auto-cancel.
- `payments` gains `capture_type` (`automatic`|`manual`), `escrow_mode` (`GATEWAY_HOLD`|`LEDGER`), `auth_expires_at`, `attempt_count`.
- Indexes: partial index on `escrow_holds (release_at) WHERE status = 'HELD'` for the sweeper; `webhook_events (provider, provider_event_id)`.
- RLS following `20260728000000_015_core_rls_dispatch_realtime.sql`: client reads own payments and escrow via booking ownership; handyman reads `net_amount` and `release_at` only, through a view, so client payment method and gross never leak; admin full read; `webhook_events` and `payment_attempts` are service_role only.
- Grants following `20260805010000_024_service_role_grants.sql`.

### Day 2 — RPC surgery

`20260813030000_028_escrow_rpcs.sql` — split `execute_payment_transaction` into three:

- `record_payment_capture(booking_id, provider_payment_id, amount, platform_fee)` — guards booking is `COMPLETED`, re-derives amounts from `bookings` (keep the existing server-owned-amount check, it's the right defence), sets `payments.status = 'CAPTURED'`, inserts an `escrow_holds` row as `HELD` with `release_at = now() + interval '24 hours'`, transitions the booking `COMPLETED → PAID`. **Does not touch `wallet_balance`.**
- `release_escrow_hold(hold_id, actor_id, reason)` — `SELECT ... FOR UPDATE` on the hold, guard `status = 'HELD'`, lock the `handymen` row, credit `wallet_balance`, insert the `wallet_transactions` CREDIT, mark the hold `RELEASED`. Idempotent: a second call returns the existing state instead of double-crediting.
- `release_due_escrow_holds()` — sweeper over `HELD` holds where `release_at <= now()` and no open dispute, calling the above with `actor_id = null`.

Delete `execute_payment_transaction` in the same PR — `payment-webhook/index.ts:180` is its only caller and that file is being rewritten anyway.

**Decision to lock in: `PAID` means captured, not released.** The booking hits `PAID` when funds are captured and the escrow hold is created. That matches the FSM doc ("escrow captured, reviews unlocked") and keeps `20260803000001_018_reviews_paid_only.sql` working — reviews unlock at completion, which is what Week 13 assumed. Wallet credit is a separate ledger event 24 hours later. Adding a `RELEASED` booking state instead would break the FSM doc, the trigger, the reviews migration and the app-side `BookingStatus` enum. Don't.

### Day 2–3 — FSM payment guards

`20260813040000_029_payment_guards.sql` extends `check_booking_transition()`:

- `PENDING → ACCEPTED` requires `payments.status IN ('AUTHORIZED', 'CAPTURED')`. The FSM doc already specifies this guard; it was never implemented.
- `ARRIVED → WORK_STARTED` requires the same. This is the checklist's "payment authorization confirmed before WORK_STARTED".
- `COMPLETED → PAID` requires `payments.status = 'CAPTURED'`, reason code `PAYMENT_NOT_CAPTURED`.

**These guards apply to rows that already exist.** The seed creates 69 bookings and `create_booking` currently writes a fake `AUTHORIZED` payment; once it writes `PENDING_AUTH` instead, every booking from a fresh `db reset` becomes unacceptable and local dev breaks the day this migration lands. Either grandfather bookings created before the migration timestamp, or update `seed.sql` in the same PR. Decide which and write it down.

Mirror all three in `src/services/bookingFsm.ts` and in `supabase/functions/accept-booking/index.ts` so callers get a structured 422 instead of a raw Postgres exception. Update the escrow-coupling table in `backend/docs/booking-state-machine.md` to cover ledger-escrow mode and the `escrow_holds` lifecycle.

### Day 3 — payment intent creation

New edge function `supabase/functions/create-payment-intent/index.ts`. Client-authenticated, takes `bookingId` and `paymentMethod`, picks `escrow_mode` (`GATEWAY_HOLD` if method is card and the job is on-demand or scheduled within 6 days; otherwise `LEDGER`), calls the provider, writes the `payments` row at `PENDING_AUTH`, returns the client key or redirect URL for the checkout sheet. Idempotent per booking — reuse a live intent instead of creating a second one.

**This deviates from the checklist wording and should.** The checklist says "create PaymentIntent on booking acceptance". With e-wallets that doesn't work: there is no hold, so payment has to be collected before dispatch or handymen end up accepting unfunded jobs and eating the no-pay risk. Collect at booking *creation*, and guard `ACCEPT` on the payment being authorized or captured — which is what the FSM doc already says. Concretely: amend the `create_booking` RPC to insert `payments` at `PENDING_AUTH` instead of the current fake `AUTHORIZED`.

### Day 3–4 — webhook rewrite

Rewrite `supabase/functions/payment-webhook/index.ts`:

- Parse PayMongo's `Paymongo-Signature` header (`t=…,te=…,li=…`, HMAC-SHA256 over `${t}.${rawBody}`). Keep the existing timing-safe compare and the 300-second skew check — that code is good, only the header parsing changes.
- **Idempotency by event id, before any business logic:** `INSERT INTO webhook_events (provider, provider_event_id, ...) ... ON CONFLICT DO NOTHING RETURNING id`. No row returned means duplicate delivery, return 200 `{received: true, deduplicated: true}`. This replaces the current status-based dedupe at `index.ts:142`, which silently no-ops for reasons unrelated to redelivery.
- Map provider events to the internal union: paid, failed, refunded, awaiting-capture, dispute-opened. A dispute sets `escrow_holds.status = 'DISPUTED'` so the sweeper skips it.
- Keep the amount reconciliation against server-owned `bookings.amount` (`index.ts:165`) — that's the right defence and it stays.
- Return 200 for anything handled and recorded. Only 4xx on signature or parse failure, since PayMongo retries on non-2xx.

Extend `__tests__/functions/payment-webhook.test.ts`: duplicate event id, bad signature, stale timestamp, amount mismatch, unknown event type, capture attempt on a non-`COMPLETED` booking.

### Day 4 — capture at COMPLETED

In `complete-booking/index.ts`, after the status update: if `escrow_mode = 'GATEWAY_HOLD'`, call `provider.capture(intentId)`; if `LEDGER`, funds are already in, so call `record_payment_capture` directly. Either way the webhook stays the source of truth for the DB write — the inline call is only the trigger. Guard on `payments.status` against double capture.

Edge case worth building now: a card auth older than 7 days is already voided, so capture fails. Mark `payments.status = 'FAILED'`, leave the booking at `COMPLETED`, and push the client into the retry flow. This is exactly why scheduled bookings more than 6 days out are routed to `LEDGER` mode.

### Day 4–5 — escrow release

- `20260813050000_030_escrow_release_cron.sql` — `cron.schedule('release-due-escrow-holds', '*/5 * * * *', ...)`. Follow the unschedule-first, env-driven pattern from migration 019 so it doesn't double-schedule or hardcode a project ref.
- `supabase/functions/admin-release-escrow/index.ts` — `requireAdmin`, calls `release_escrow_hold(hold_id, admin_id, reason)`, writes a `booking_events` row. This is the checklist's "admin manual release".
- Admin UI: add an Escrow tab listing `HELD` holds with a `release_at` countdown and a Release Now action. **Target `app/(admin)/transactions.tsx`, not `apps/admin/`** — the Next.js app under `apps/` runs on `MOCK_TRANSACTIONS` and is not the console anyone is using. Putting a money-movement control there ships it into a mock. If `apps/admin` is meant to be the real console, that decision has to be made before this task, not during it.
- Enqueue a `notification_queue` entry to the handyman on release.

### Day 5 — failure and retry

- Every failed intent inserts a `payment_attempts` row and increments `payments.attempt_count`.
- On failure, enqueue push + email to the client with a deep link to `oki://booking/:id/pay`. `src/components/bookings/BookingPaymentTab.tsx` gains a retry CTA and a payment-method switcher.
- Third failure calls `cancel_booking_for_payment_failure(booking_id)`: `PENDING → CANCELLED` with `metadata.reason = 'PAYMENT_FAILED_MAX_ATTEMPTS'`, notifies the handyman if one is assigned, voids or refunds any hold.
- `app/booking/[id].tsx` payment section renders the states: awaiting payment, held, captured, in escrow with countdown, failed with retry.

### Day 5 — tests and docs

- Unit: mock provider adapter, signature verification, event dedupe, the three FSM guards, `release_escrow_hold` idempotency, and a concurrency test that two parallel releases credit the wallet exactly once.
- Integration against local Supabase: full `PENDING → PAID → released` path, asserting `wallet_balance` is unchanged until the sweeper runs.
- Update `backend/docs/openapi.yaml` with the new endpoints and add `backend/docs/escrow-and-payments.md`.

---

## Part 4 — Success criteria, with one restated

| Checklist criterion | How it's verified | Note |
| --- | --- | --- |
| PaymentIntent created within 2 s of booking acceptance | timing assertion in the integration test | intent is created at booking *creation*, see Day 3 |
| Handyman wallet does not credit until after the 24 h escrow window | integration test asserts `wallet_balance` unchanged pre-sweeper | |
| Each webhook event processed exactly once | duplicate-delivery test against `webhook_events.provider_event_id` | |
| Webhook rejects invalid signatures with 400 | signature test | currently returns 403; pick one and make the docs match |
| Payment failure triggers client notification and retry flow | `payment_attempts` + `notification_queue` assertions | |
| No funds captured before `WORK_STARTED` | **cannot hold as written** | see below |

**"No funds captured before WORK_STARTED" conflicts with PH e-wallets.** GCash, Maya and GrabPay have no authorization primitive — the money moves at payment time or not at all. For those methods funds are captured at booking creation, held in `escrow_holds`, and fully refundable until release. Restate the criterion as: *no funds are released to the handyman before `COMPLETED` plus the dispute window*. That is what the ledger-escrow design actually guarantees, and it's the same guarantee Grab and Lalamove ship in this market.

---

## Part 5 — Blockers and open decisions

### Blockers — settle these before the code they touch

1. **Catalog pricing** (Day 0). The app quotes prices the server does not charge. Everything downstream of an amount is wrong until this is fixed.
2. **`BookingStatus.Rejected` semantics.** Nothing writes it — `bookingFsm.ts:89` and `reject-booking/index.ts` both keep the booking `PENDING` — yet the enum value, theme label, `past-jobs` bucket and `TERMINAL_STEPS` entry all exist. PR #58 added `declinedBookingIds` as client-local, non-persisted state, so a decline is forgotten on app restart. Day 2–3 rewrites `check_booking_transition()`; doing that with this unresolved means doing it twice. Either drop the dead branches or make per-handyman declines a recorded state.
3. **Which admin console is real** — `app/(admin)/` (live) or `apps/admin/` (mock). Day 4–5 puts an escrow release control in one of them.
4. **Refund on cancel is required, not optional.** Clients can cancel today and `bookings_handyman_required_after_pending` permits it. In `LEDGER` mode the money is already captured, so the first cancelled booking strands real funds. `provider.refund` for `LEDGER` and a void for `GATEWAY_HOLD` both belong in `cancel-booking/index.ts` this week.

### Open decisions

1. **Provider** — PayMongo for acceptance is the recommendation. The adapter keeps it reversible; nothing else in the plan changes if you pick Xendit.
2. **OPS/EMI registration** — legal track, start Week 15, gates real-money launch not sandbox work.
3. **`PAID` semantics** — capture, not release. Locked in above; flag if you disagree, because it ripples into reviews and the FSM doc.
4. **Payment collected at booking creation, not acceptance** — deviates from the checklist. Recommended.
5. **Cash on completion** — in or out for Week 15? If in, it needs a handyman-wallet DEBIT path for the platform fee and it has no escrow at all.
6. **`app/profile/payments.tsx`** — currently a local-state stub advertising "Payment Methods" from the client profile. Week 15 ships real payments, so it gets wired to saved methods or hidden. Shipping escrow behind a settings screen that lies is worse than not having the screen.
7. **Migration numbering** — continue at 025, don't reuse.

### Amount handling — get this right once

`PLATFORM_FEE_PERCENT` is 10 and the client currently does `Math.round(amount * 0.1)`. Once `escrow_holds` stores gross, fee and net as three columns, they have to reconcile exactly or the sweeper credits a net that does not match gross minus fee. Derive all three server-side in `record_payment_capture`, never client-side. Send integer centavos to the provider, and check PayMongo's minimum charge (₱100 at time of writing) against the lowest advertised price of ₱200.
