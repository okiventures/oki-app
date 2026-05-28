#  **Implementation Checklist — Handyman Platform**

**Project Window:** May 6, 2026 → November 18, 2026 (\~28 weeks) **Approach:** Code-first prototyping → Iterative implementation **Cadence:** Team standups every 2 weeks (marked with 🟢)

**Legend:** ☐ to-do · ☑ done · 🟢 Bi-weekly standup · 🎯 Phase milestone

---

## **Phase 1 — System Design & Code Prototyping (May 5 – June 5, 2026\)**

### **Week 1 · May 6 – May 13 — Discovery, Requirements & Project Scaffolding**

- [x] ~~Kickoff meeting; align on scope, roles, and success metrics~~
  - [x] ~~Define MVP scope and explicit non-goals (out-of-scope for v1)~~
  - [x] ~~Assign roles: PM, Lead Dev, Mobile Dev(s)~~
  - [x] ~~Document success metrics (booking conversion rate, handyman acceptance rate, KYC pass rate)~~
- [x] ~~Finalize user personas (Client, Handyman, Admin)~~
  - [x] ~~Document pain points, goals, and tech literacy level for each persona~~
  - [x] ~~Validate personas against target market context~~
- [x] ~~Map end-to-end user journeys for each persona~~
  - [x] ~~Client journey: search → book → track → pay → review~~
  - [x] ~~Handyman journey: onboard → KYC → go online → accept job → complete → get paid~~
  - [x] ~~Admin journey: verify KYC → manage disputes → monitor platform health~~
- [x] ~~Initialize Expo + React Native project repo with TypeScript, NativeWind, and Expo Router~~
  - [x] ~~Configure TypeScript strict mode + path aliases in `tsconfig.json`~~
  - [x] ~~Set up Expo Router file-based routing with role-based route groups: `(auth)`, `(client)`, `(handyman)`, `(admin)`~~
  - [x] ~~Configure NativeWind + `tailwind.config.js` with custom theme extension~~
  - [x] ~~Establish folder structure: `app/`, `src/components/`, `src/hooks/`, `src/types/`, `src/mocks/`, `src/utils/`~~
- [x] ~~Define and implement design tokens (colors, typography, spacing) in `src/constants/theme.ts`~~
  - [x] ~~Brand color palette: primary, secondary, semantic (success/error/warning/info)~~
  - [x] ~~Typography scale: heading sizes (h1–h4), body, caption, label~~
  - [x] ~~Spacing scale: 4pt grid system (xs/sm/md/lg/xl)~~

> **✅ Week 1 Success Criteria**
> - Project runs on both iOS Simulator and Android Emulator from a fresh clone
> - All developers can install, build, and hot-reload the app locally without manual config
> - Personas and journeys documented and signed off by stakeholders
> - Design tokens resolve correctly in NativeWind `className` usage
> - TypeScript strict mode passes with zero errors on initial scaffold
> - Route groups render correct layout shells for each role

---

### **Week 2 · May 14 – May 20 — Client App Screens (Code Implementation)**

- [x] ~~Implement: onboarding, login, and KYC-lite screens (`app/(auth)/`)~~
  - [x] ~~3-step onboarding carousel (`onboarding.tsx`) with value proposition copy per step~~
  - [x] ~~Login screen: phone/email + password field with inline form validation~~
  - [x] ~~KYC-lite screen (`kyc-lite.tsx`): name, address, ID type selector, and upload prompt UI~~
  - [x] ~~Navigation guard: redirect unauthenticated users to `(auth)/login`~~
- [x] ~~Implement: search screen with filtering UI (`app/(client)/search.tsx`)~~
  - [x] ~~`SearchBar` component with debounced input (`src/components/forms/SearchBar.tsx`)~~
  - [x] ~~Category filter chips (Plumbing, Electrical, Cleaning, Carpentry, etc.)~~
  - [x] ~~Handyman result cards: name, avatar, star rating, distance badge, availability indicator~~
  - [x] ~~Empty state UI for no results~~
- [x] ~~Implement: bookings screen with On-Demand & Scheduled flows (`app/(client)/bookings.tsx`)~~
  - [x] ~~Tab view: Active bookings vs Booking history~~
  - [x] ~~`BookingCard` component with status badge and contextual action CTA~~
  - [x] ~~On-Demand booking creation flow: service → address → confirm~~
  - [x] ~~Scheduled booking flow: date/time picker + advance confirmation screen~~
- [x] ~~Implement: map placeholder and booking status UI (`src/components/features/MapPlaceholder.tsx`, `StateIndicator.tsx`)~~
  - [x] ~~`MapPlaceholder`: static map image with Client and Handyman pin markers~~
  - [x] ~~`StateIndicator`: horizontal stepper rendering all booking lifecycle states~~
  - [x] ~~Dynamic status banner: contextual message per state ("Looking for a handyman…", "On the way", etc.)~~
- [x] ~~Internal review of Client app screen implementations~~
  - [x] ~~Code review pass on all new files for type safety and component reuse~~
  - [x] ~~Visual QA against intended design intent~~
  - [x] ~~Feedback logged as issues for Week 4 polish~~

> **✅ Week 2 Success Criteria**
> - All Client screens navigable end-to-end using mock data from `src/mocks/`
> - Search screen renders filtered results without crash or layout overflow
> - Booking flow transitions correctly between On-Demand and Scheduled modes without state leak
> - `StateIndicator` renders all booking lifecycle steps in correct order
> - No TypeScript errors in any `app/(auth)/` or `app/(client)/` files
> - Mock data structures in `src/mocks/` match the planned API response shape

---

### **Week 3 · May 21 – May 27 — Handyman & Admin Screens (Code Implementation)**

- [ ] 🟢 **Standup \#1 — May 20** (review Phase 1 progress, blockers)
- [ ] Implement: Handyman onboarding flow and KYC document upload screen
  - [ ] Multi-step onboarding: personal info → services offered → document upload → pending screen
  - [ ] Service category multi-select with per-category custom pricing input
  - [ ] KYC document upload UI: file picker, image preview, upload progress indicator
  - [ ] Submission confirmation screen with "Pending Verification" status badge
- [ ] Implement: Online/Offline toggle, job requests inbox, and state-driven workflow UI (`app/(handyman)/requests.tsx`, `schedule.tsx`)
  - [ ] Persistent Online/Offline toggle in header with labeled status indicator
  - [ ] Job requests inbox: list of incoming `PENDING` bookings with per-request countdown timer
  - [ ] Accept/Decline action buttons with `ConfirmDialog` before committing
  - [ ] Active job card with state-driven CTA (e.g., "Mark Arrived" → "Start Work" → "Complete Job")
  - [ ] Schedule view: calendar with booked time slots highlighted (`app/(handyman)/schedule.tsx`)
- [ ] Implement: Handyman wallet & payout request screen (`app/(handyman)/profile.tsx` wallet section)
  - [ ] Wallet balance card: available vs pending earnings breakdown
  - [ ] Transaction history list with credit/debit entries and booking reference
  - [ ] Payout request button gated by minimum payout threshold
  - [ ] Payout status tracker: Requested → Processing → Paid
- [ ] Implement: Admin dashboard, verification portal, and dispute center (`app/(admin)/`)
  - [ ] Dashboard (`index.tsx`): KPI cards (total bookings, active handymen, platform revenue, open disputes)
  - [ ] Analytics: booking volume bar chart using `src/components/admin/Chart.tsx`
  - [ ] KYC verification queue (`users.tsx`): handyman list with document viewer, Approve / Reject actions
  - [ ] Dispute center (`disputes.tsx`): open disputes table with booking reference and photo evidence viewer
  - [ ] User management: searchable table with Suspend / Reinstate actions and reason field
- [ ] Stakeholder review of all implemented screens
  - [ ] Record a screen walkthrough demo for all three role flows
  - [ ] Collect and triage feedback; log as issues with priority labels
  - [ ] Identify and scope polish items for Week 4

> **✅ Week 3 Success Criteria**
> - Handyman app fully navigable: onboarding → online toggle → job acceptance → state-driven job completion
> - Admin can navigate Dashboard, KYC Queue, Disputes, and Users without any broken routes
> - Online/Offline toggle visually reflects state immediately (no perceptible lag)
> - All new screens source their UI from `src/components/` with no ad-hoc inline component definitions
> - All three role flows demonstrated and recorded; feedback backlog created
> - Zero TypeScript errors in `app/(handyman)/` and `app/(admin)/` files

---

### **Week 4 · May 28 – June 3 — UI Component Library & Screen Polish**

- [ ] Finalize shared UI component library (`src/components/ui/`)
  - [ ] `Button`: primary / secondary / destructive / ghost variants; loading spinner state; disabled state
  - [ ] `Card`: base card with elevation/border variants; pressable and static versions
  - [ ] `Modal`: animated bottom sheet and center modal; backdrop dismiss; keyboard-aware scroll
  - [ ] `Toast`: success / error / info / warning variants; auto-dismiss with configurable duration
  - [ ] `Avatar`: image with fallback initials; sm / md / lg size variants
  - [ ] `Badge`: semantic color mapping to booking states (e.g., `PENDING` → yellow, `COMPLETED` → green)
  - [ ] `LoadingSpinner`: full-screen and inline sizes
  - [ ] `ConfirmDialog`: reusable destructive-action confirmation with title, body, and cancel/confirm
- [ ] Polish and refine Client app screens with final component integration
  - [ ] Replace any inline/ad-hoc styles with `theme.ts` token classes
  - [ ] Add loading skeletons to Search results and Bookings list
  - [ ] Add visible empty states to Search (no results) and Bookings (no history)
  - [ ] Verify `KeyboardAvoidingView` behavior on all form screens (Login, KYC-lite)
- [ ] Polish and refine Handyman app screens with final component integration
  - [ ] Consistent header layout with Online/Offline `Badge` across all Handyman tabs
  - [ ] Animate state transition on active job card CTA change
  - [ ] Loading state on wallet balance fetch; error state on network failure
- [ ] Polish and refine Admin dashboard screens
  - [ ] Responsive `Table` layout for User Management and Dispute Center (`src/components/admin/Table.tsx`)
  - [ ] Chart axis labels, color legend, and tooltips for readability
  - [ ] `ConfirmDialog` on all destructive actions: Reject KYC, Suspend User
- [ ] End-to-end interactive navigation test across all role flows
  - [ ] Manual test pass: Client full booking flow (search → book → status tracking)
  - [ ] Manual test pass: Handyman full flow (receive request → accept → complete job)
  - [ ] Manual test pass: Admin KYC approval and dispute navigation

> **✅ Week 4 Success Criteria**
> - All `src/components/ui/` components render correctly for all documented prop variants
> - Zero hardcoded hex or color values in any screen file — all colors reference `theme.ts` via NativeWind
> - Every screen has a visible empty state, loading skeleton, and error state
> - All interactive elements have `accessibilityLabel` props set
> - Manual E2E navigation passes for all three roles on both iOS Simulator and Android Emulator
> - WCAG AA color contrast met on all primary text/background pairings (verified with contrast checker)

---

### **Week 5 · June 4 – June 10 — Database Architecture & Finalization**

- [ ] 🟢 **Standup \#2 — June 3** (review implemented screens, sign-off on scope)
- [ ] ER diagram \+ PostgreSQL/PostGIS schema draft
  - [ ] Define core entities: `users`, `handymen`, `bookings`, `services`, `payments`, `reviews`, `wallet_transactions`, `disputes`, `booking_events`
  - [ ] Map all foreign key relationships and cardinalities (one-to-many, many-to-many)
  - [ ] Identify PostGIS-enabled columns: `location GEOGRAPHY(Point, 4326)` on `handymen` and `bookings`
  - [ ] Define Row Level Security (RLS) policy boundaries per table per role
- [ ] State machine spec (booking lifecycle)
  - [ ] Document all valid states: `PENDING → ACCEPTED → IN_TRANSIT → ARRIVED → WORK_STARTED → COMPLETED → PAID`
  - [ ] Define guard conditions per transition (e.g., payment captured before `PAID`; photo required before `WORK_STARTED`)
  - [ ] Document invalid transitions and expected API error response (422 + reason)
  - [ ] Publish FSM diagram to shared project docs
- [ ] API contract / OpenAPI draft
  - [ ] Auth: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/reset-password`
  - [ ] Bookings: `POST /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/state`, `DELETE /bookings/:id`
  - [ ] Search: `GET /handymen/search?lat&lng&radius&category&page`
  - [ ] KYC, profiles, wallet, payout, admin, and review endpoints
  - [ ] Document request/response schemas, required auth headers, and error codes for each endpoint
- [ ] Tech stack lock-in for backend services
  - [ ] Confirm: Supabase (PostgreSQL + PostGIS + Auth + Storage + Realtime)
  - [ ] Backend API layer decision documented as an ADR: Supabase Edge Functions vs Node.js (Fastify)
  - [ ] Payment provider selected (Stripe or local equivalent) with sandbox credentials provisioned
  - [ ] Notification stack: Expo Push + Resend (email) + Twilio (SMS)
  - [ ] Secrets management strategy: Supabase Vault for all third-party API keys
- [ ] 🎯 **Milestone:** All role screens implemented + database architecture approved

> **✅ Week 5 Success Criteria**
> - ER diagram reviewed and approved by all stakeholders with no unresolved ambiguities
> - All booking lifecycle states and guard conditions documented, agreed, and published
> - OpenAPI spec covers 100% of planned Phase 2 endpoints with schema definitions
> - Tech stack ADR published with explicit rationale for each major service choice
> - RLS policy boundaries defined for every table before any backend code is written
> - Dev / staging / prod environment config templates committed to repo (no secrets)

---

## **Phase 2 — Core Build (June 8 – August 7, 2026\)**

### **Week 6 · June 11 – June 17 — Scaffolding & Auth**

- [ ] Initialize mobile (Client \+ Handyman) and web (Admin) projects
  - [ ] Verify Expo project structure is production-ready (EAS Build configured, app.json finalized)
  - [ ] Scaffold backend project: Node.js (Fastify) or Supabase Edge Functions per ADR
  - [ ] Configure monorepo or separate repos with shared types package if applicable
- [ ] Set up CI/CD, linting, environment configs
  - [ ] GitHub Actions: lint + type-check + test pipeline on every PR; block merge on failure
  - [ ] EAS Build workflow for dev/staging/prod build profiles
  - [ ] `.env` templates committed; actual secrets stored in GitHub Secrets and Supabase Vault
  - [ ] ESLint + Prettier enforced; Husky pre-commit hooks configured
- [ ] Implement authentication (signup/login, JWT/refresh, password reset)
  - [ ] Supabase Auth: email/phone signup with OTP verification
  - [ ] JWT session management with auto-refresh token rotation
  - [ ] Password reset via email deep link
  - [ ] Auth state persisted in `SecureStore`; app bootstraps into correct route on relaunch
- [ ] Provision database, base migrations, seed scripts
  - [ ] Create Supabase project; enable PostGIS extension
  - [ ] Run base migrations: `users`, `handymen`, `services` tables with RLS enabled
  - [ ] Seed script with representative test data for each role

> **✅ Week 6 Success Criteria**
> - CI pipeline runs end-to-end on a sample PR and correctly blocks on lint/type errors
> - A new user can sign up, verify via OTP, and receive a valid JWT in under 60 seconds
> - JWT refresh works silently without requiring re-login
> - Password reset email delivers and allows setting a new password
> - Database migrations run cleanly on a fresh Supabase project
> - No secrets present in any committed file (Gitleaks scan passes)

---

### **Week 7 · June 18 – June 24 — User Profiles & KYC Backend**

- [ ] 🟢 **Standup \#3 — June 17**
- [ ] Profile CRUD for Client and Handyman
  - [ ] `GET /profiles/:id` and `PATCH /profiles/:id` endpoints with RLS (own record only)
  - [ ] Avatar upload to Supabase Storage with public CDN URL stored on profile
  - [ ] Handyman profile includes: bio, services, hourly rate, rating average, location
- [ ] KYC document upload (storage, signed URLs)
  - [ ] `POST /kyc/upload` endpoint: validate file type (JPEG/PNG/PDF), max 5 MB, reject all others
  - [ ] Store documents in private Supabase Storage bucket
  - [ ] Generate short-lived signed URLs for Admin document review (not publicly accessible)
  - [ ] KYC status field on `handymen` table: `PENDING / APPROVED / REJECTED`
- [ ] Role-based access control middleware
  - [ ] RBAC middleware reads role from JWT claims; attaches to request context
  - [ ] Guard decorators/middleware for `client-only`, `handyman-only`, `admin-only` routes
  - [ ] Return `403 Forbidden` with descriptive message on role mismatch
- [ ] Unit tests for auth \+ profiles
  - [ ] Auth: signup, login, token refresh, password reset test cases
  - [ ] Profile: get, update, avatar upload test cases
  - [ ] RBAC: each role correctly permitted and rejected on guarded routes

> **✅ Week 7 Success Criteria**
> - Profile updates persist and return updated data; stale cache invalidated
> - KYC documents stored in private bucket — direct URL returns 403 without signed token
> - Signed URL expires after configured TTL (e.g., 15 minutes)
> - File upload endpoint rejects non-image/non-PDF files with a 400 + reason
> - Unauthorized role access returns 403 on all guarded routes
> - Unit test coverage ≥ 80% on auth and profile modules

---

### **Week 8 · June 25 – July 1 — Booking System Core**

- [ ] Booking entity \+ lifecycle states
  - [ ] Create `bookings` table with status enum, foreign keys to client/handyman/service, timestamps
  - [ ] `booking_events` audit table: logs every state transition with actor, from_state, to_state, timestamp
  - [ ] Migration and RLS policies: client sees own bookings; handyman sees assigned bookings
- [ ] PostGIS-based worker search (radius queries)
  - [ ] `ST_DWithin` radius query on `handymen.location` filtered by service category and `is_online = true`
  - [ ] Results sorted by distance ascending; include distance in meters in response
  - [ ] Add GiST index on `handymen.location` for query performance
- [ ] On-Demand booking flow (API \+ Client UI)
  - [ ] `POST /bookings` creates record in `PENDING` state and broadcasts to matching handymen
  - [ ] Client UI shows "Searching for a handyman…" state with live refresh
  - [ ] Booking confirmation screen shown after handyman accepts
- [ ] Scheduled booking flow with calendar
  - [ ] `scheduled_at` field validated: must be ≥ 2 hours in the future, no double-booking for same handyman
  - [ ] Calendar UI allows date/time selection with blocked slots greyed out
  - [ ] Booking created in `PENDING` state; handyman notified at configured lead time

> **✅ Week 8 Success Criteria**
> - Booking creation assigns `PENDING` state and creates an audit event record
> - PostGIS radius query returns only `is_online` handymen in the correct category, sorted by distance
> - GiST index confirmed on `handymen.location` via `EXPLAIN ANALYZE`
> - On-Demand booking notifies matched handymen within 5 seconds of creation
> - Scheduled booking rejects past dates and overlapping time slots with a 409
> - Booking model unit tests cover creation, state validation, and double-booking guard

---

### **Week 9 · July 2 – July 8 — Booking Flows (Continued)**

- [ ] 🟢 **Standup \#4 — July 1**
- [ ] Handyman job inbox (accept / reject)
  - [ ] `PATCH /bookings/:id/state` with `action: ACCEPT | REJECT` transitions state machine
  - [ ] Acceptance updates booking's `handyman_id` and transitions to `ACCEPTED`
  - [ ] Rejection marks booking as `REJECTED`; platform re-broadcasts or notifies client
  - [ ] Optimistic UI update: Handyman inbox reflects action immediately
- [ ] Booking detail screens (both apps)
  - [ ] Client view: service, handyman profile snippet, address, price, status stepper, action CTA
  - [ ] Handyman view: service details, client info, address, agreed price, state-driven CTA
  - [ ] Both views: booking reference ID, timestamps, and contact shortcut
- [ ] Cancellation logic (pre-acceptance)
  - [ ] Client can cancel a `PENDING` booking with no fee; booking moves to `CANCELLED`
  - [ ] API guard: cancellation endpoint rejects requests on `ACCEPTED` or later states with 422
  - [ ] Cancelled bookings appear in history with `CANCELLED` badge
- [ ] Integration tests for booking endpoints
  - [ ] Happy path: create → accept → view detail
  - [ ] Rejection path: create → reject → re-broadcast
  - [ ] Cancellation path: create → cancel; attempt cancel on `ACCEPTED` returns 422

> **✅ Week 9 Success Criteria**
> - Handyman acceptance transitions booking state and notifies Client in real time (< 3 s)
> - Booking detail screen renders all required fields for both Client and Handyman views
> - Pre-acceptance cancellation succeeds; post-acceptance cancellation returns 422
> - Integration tests cover all three paths (happy, rejection, cancellation) and pass on CI
> - No orphaned bookings (every state transition has a corresponding audit log entry)

---

### **Week 10 · July 9 – July 15 — Worker Management & Availability**

- [ ] Online/Offline toggle (visibility in search)
  - [ ] `PATCH /handymen/:id/status` updates `is_online` field and `last_seen_at` timestamp
  - [ ] Offline handymen excluded from `ST_DWithin` search results immediately
  - [ ] Toggle reflected in Handyman UI header within 1 second of API response
- [ ] Service categories, pricing per worker
  - [ ] `handyman_services` join table: handyman_id, service_category_id, custom_price_override
  - [ ] Handyman can add/edit/remove service categories with pricing from their profile settings
  - [ ] Search filter passes `category` param matched against `handyman_services`
- [ ] Handyman availability calendar
  - [ ] `availability_blocks` table: handyman_id, start_time, end_time, recurrence (one-off / weekly)
  - [ ] Booking creation validates against availability blocks to prevent scheduling conflicts
  - [ ] Calendar UI shows booked slots, available blocks, and blocked-off time
- [ ] Search ranking heuristics (distance, rating placeholder)
  - [ ] Primary sort: distance ascending
  - [ ] Secondary sort: `trust_score` descending (defaults to null/0 until Week 13)
  - [ ] Ranking logic isolated in a reusable service function for easy extension in Phase 3

> **✅ Week 10 Success Criteria**
> - Offline handyman disappears from search results within 30 seconds of toggling off
> - Handyman with 3 service categories at different prices all appear correctly in search
> - Scheduling a booking that overlaps an existing one returns 409 Conflict
> - Search results are ordered deterministically; order verified by unit test
> - Ranking function is unit-tested and isolated from the query layer

---

### **Week 11 · July 16 – July 22 — State Machine Workflow**

- [ ] 🟢 **Standup \#5 — July 15**
- [ ] Implement state machine: Accept → Arrived → Work Started → Complete
  - [ ] FSM implemented as a standalone service (e.g., XState or a typed transition map)
  - [ ] Valid transitions: `PENDING→ACCEPTED`, `ACCEPTED→IN_TRANSIT`, `IN_TRANSIT→ARRIVED`, `ARRIVED→WORK_STARTED`, `WORK_STARTED→COMPLETED`, `COMPLETED→PAID`
  - [ ] Each transition updates `bookings.status` and inserts a row into `booking_events`
- [ ] Guard rails: invalid transition rejection
  - [ ] FSM service throws a typed error on invalid transition (e.g., `PENDING→COMPLETED`)
  - [ ] API layer catches FSM error and returns `422 Unprocessable Entity` with transition details
  - [ ] Database-level check constraint on `status` enum as a secondary safety net
- [ ] Handyman action UI (state-driven buttons)
  - [ ] CTA button label and action derive entirely from `booking.status` (no hardcoded conditionals per screen)
  - [ ] Transitions that require prerequisites (photo, geofence) show a pre-check prompt first
  - [ ] Completed state shows summary card; no further CTAs visible
- [ ] Audit log for state transitions
  - [ ] `booking_events` table: `booking_id`, `actor_id`, `actor_role`, `from_state`, `to_state`, `created_at`
  - [ ] Audit log queryable by `booking_id` in Admin dispute view
  - [ ] Log entries are immutable (no UPDATE/DELETE RLS on `booking_events`)

> **✅ Week 11 Success Criteria**
> - Every valid transition succeeds via API and creates a `booking_events` record
> - Every invalid transition returns 422 with `from_state` and `to_state` in the error body
> - Handyman UI CTA updates correctly after each successful transition
> - FSM is unit-tested: all valid transitions pass, all invalid transitions throw
> - Audit log is immutable: direct DELETE attempt returns 403 via RLS
> - FSM diagram in docs matches the implemented transition map

---

### **Week 12 · July 23 – July 29 — Admin Verification Portal**

- [ ] Admin web: KYC review queue
  - [ ] Paginated list of `PENDING_VERIFICATION` handymen with name, submission date, and document count
  - [ ] Document viewer: renders signed-URL images/PDFs inline without downloading
  - [ ] Bulk review: can approve/reject multiple submissions in one session
- [ ] Approve / reject Handyman documents
  - [ ] `PATCH /admin/handymen/:id/kyc` with `action: APPROVE | REJECT` + optional `reason`
  - [ ] Approval sets `handymen.kyc_status = APPROVED`; handyman becomes searchable
  - [ ] Rejection sets `kyc_status = REJECTED`; triggers notification to handyman with reason
- [ ] User management (suspend, reinstate)
  - [ ] `PATCH /admin/users/:id/status` with `action: SUSPEND | REINSTATE` + mandatory `reason`
  - [ ] Suspended users receive `403` on all authenticated requests (checked in auth middleware)
  - [ ] All suspension/reinstatement actions logged in audit trail with admin actor ID
- [ ] Basic admin analytics widgets (bookings, signups)
  - [ ] Daily booking count for the last 30 days (bar chart)
  - [ ] Weekly new handyman and client signup counts
  - [ ] Revenue summary: total platform fees collected (mocked until payment integration in Week 15)

> **✅ Week 12 Success Criteria**
> - Admin can review, approve, and reject a KYC submission in under 3 clicks
> - Approved handyman is searchable by clients within 30 seconds of approval
> - Rejected handyman receives in-app and email notification with the rejection reason
> - Suspended user receives 403 on the very next authenticated request
> - All admin actions (approve, reject, suspend, reinstate) appear in the audit log
> - Analytics widgets render within 2 seconds with real data

---

### **Week 13 · July 30 – August 5 — Rating & Review Loop**

- [ ] 🟢 **Standup \#6 — July 29**
- [ ] Post-job rating (Client → Handyman, Handyman → Client)
  - [ ] Rating prompt triggers once per completed booking per actor, shown on `PAID` state transition
  - [ ] Rating schema: `booking_id`, `reviewer_id`, `reviewee_id`, `stars` (1–5), `comment` (optional), `created_at`
  - [ ] API guard: second submission for the same booking by the same reviewer returns 409
- [ ] Trust Score computation
  - [ ] Weighted rolling average of last 50 reviews stored as `trust_score` on `handymen` and `users`
  - [ ] Score recomputed asynchronously via a Supabase Function trigger on new review insert
  - [ ] Trust Score exposed in search results and profile cards
- [ ] Review display on profiles
  - [ ] Handyman profile screen: aggregate star display, total review count, paginated review list
  - [ ] Each review card: reviewer avatar, star rating, comment, relative timestamp
  - [ ] Default sort: most recent first; secondary sort option by rating
- [ ] Moderation flags for reviews
  - [ ] `POST /reviews/:id/flag` endpoint: any authenticated user can flag a review with a reason
  - [ ] Flagged reviews hidden from public profile pending admin decision
  - [ ] Admin review queue shows flagged reviews with flag reason and original content

> **✅ Week 13 Success Criteria**
> - Rating prompt appears exactly once per completed booking per actor (no repeat prompts)
> - Trust Score updates within 5 seconds of a new review being submitted
> - Attempting to rate the same booking twice returns 409 Conflict
> - Flagged reviews are hidden from the public profile immediately after flagging
> - Review list renders pagination correctly; no duplicate entries
> - Trust Score is reflected in search result ordering (higher score ranks higher at same distance)

---

### **Week 14 · August 6 – August 12 — Phase 2 Hardening**

- [ ] End-to-end manual QA on core flows
  - [ ] Full booking flow (Client → Handyman → Admin) tested on physical iOS and Android devices
  - [ ] Edge cases: no handymen available, cancellation at each state, network interruption mid-flow
  - [ ] QA test cases documented in a shared test plan with pass/fail status
- [ ] Bug triage and fix sweep
  - [ ] All P0 (app crash, data loss) and P1 (broken core flow) bugs resolved before milestone
  - [ ] P2 bugs logged with owner, ETA, and linked to issue tracker
  - [ ] Regression test run after each fix batch
- [ ] Performance baseline (DB indexing, query review)
  - [ ] `EXPLAIN ANALYZE` run on top 5 queries: search, booking fetch, audit log, wallet balance, KYC queue
  - [ ] Missing indexes added; query plans documented for future reference
  - [ ] API response time logged: target P95 < 300 ms for all read endpoints
- [ ] 🎯 **Milestone:** Functional booking, worker workflow, admin verification, rating loop

> **✅ Week 14 Success Criteria**
> - Zero P0 bugs; fewer than 5 P1 bugs remaining with owners assigned
> - Full booking lifecycle completes without crash on both iOS and Android physical devices
> - Top 5 queries execute in < 200 ms on a staging dataset (verified via EXPLAIN ANALYZE)
> - API P95 latency < 300 ms measured from staging environment
> - Phase 2 demo recorded and distributed to stakeholders
> - All QA test cases documented with pass/fail status

---

## **Phase 3 — Integration (August 10 – October 9, 2026\)**

### **Week 15 · August 13 – August 19 — Escrow Foundation**

- [ ] 🟢 **Standup \#7 — August 12**
- [ ] Payment provider integration (auth/capture)
  - [ ] Integrate Stripe (or local equivalent): configure SDK, sandbox credentials, and webhook secret
  - [ ] Create `PaymentIntent` on booking acceptance; store `payment_intent_id` on booking record
  - [ ] Payment authorization (hold) confirmed before `WORK_STARTED` transition is allowed
- [ ] Escrow Hold-and-Release implementation
  - [ ] Capture (release) payment automatically on `PAID` state transition
  - [ ] 24-hour dispute window: hold funds in escrow before releasing to Handyman wallet
  - [ ] Admin manual release: endpoint to release funds early if dispute is resolved in Handyman's favor
- [ ] Webhook handlers \+ idempotency
  - [ ] Handle `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`
  - [ ] Idempotency enforced via `webhook_event_id` deduplification in database
  - [ ] Webhook signature verification on every inbound event (reject unsigned payloads)
- [ ] Payment failure / retry logic
  - [ ] Failed payment triggers push + email notification to Client with retry CTA
  - [ ] Retry UI in-app: Client can update payment method and re-attempt
  - [ ] Auto-cancel booking after 3 failed payment attempts; notify Handyman

> **✅ Week 15 Success Criteria**
> - `PaymentIntent` created in Stripe sandbox within 2 s of booking acceptance
> - Funds held correctly: Handyman wallet does not credit until after 24 h escrow window
> - Each webhook event processed exactly once (duplicate delivery handled idempotently)
> - Webhook handler rejects payloads with invalid signatures with 400
> - Payment failure triggers Client notification and retry flow
> - No funds captured before `WORK_STARTED` transition

---

### **Week 16 · August 20 – August 26 — Digital Wallet & Payouts**

- [ ] Handyman wallet ledger (earnings, fees)
  - [ ] `wallet_transactions` table: `handyman_id`, `type` (CREDIT/DEBIT), `amount`, `fee_deducted`, `booking_id`, `created_at`
  - [ ] On `PAID`: insert CREDIT entry (booking amount minus platform fee percentage)
  - [ ] Platform fee deducted atomically in the same DB transaction as the credit insert
- [ ] Daily/weekly earnings dashboard
  - [ ] Earnings summary: today, this week, this month, all-time totals
  - [ ] Available balance vs pending balance (within 24 h escrow window)
  - [ ] Transaction history list with booking reference, date, amount, and status
- [ ] Payout request flow \+ admin approval
  - [ ] `POST /wallet/payout` validates minimum payout threshold; creates a `PENDING` payout record
  - [ ] Admin payout queue: list of pending requests with amount, handyman details, and Approve / Decline actions
  - [ ] Approval triggers bank transfer via payment provider; payout record moves to `PROCESSING → PAID`
  - [ ] Handyman notified at each payout status change
- [ ] Reconciliation report
  - [ ] Exportable CSV report: all transactions for a date range (bookings, fees, payouts, refunds)
  - [ ] Report balances to zero: sum of credits − sum of fees − sum of payouts = net platform revenue
  - [ ] Accessible to Admin only; generated on-demand or on a weekly schedule

> **✅ Week 16 Success Criteria**
> - Every completed booking creates a matching `wallet_transactions` CREDIT entry
> - Platform fee deducted correctly on every credit (verified by reconciliation)
> - Payout request updates `available_balance` atomically — no race condition under concurrent requests
> - Admin approval triggers payout initiation in Stripe sandbox within 60 s
> - Reconciliation CSV balances to zero on a sample 30-day dataset
> - Handyman receives push notification at each payout status change

---

### **Week 17 · August 27 – September 2 — PostGIS & Real-Time Tracking**

- [ ] 🟢 **Standup \#8 — August 26**
- [ ] WebSocket / pub-sub infra for live location
  - [ ] Supabase Realtime channel scoped per `booking_id`: `location:booking_{id}`
  - [ ] Channel access restricted by RLS: only the booking's Client and Handyman can subscribe
  - [ ] Location event schema: `{ lat, lng, heading, speed, timestamp }`
- [ ] Handyman location publisher (background-safe)
  - [ ] Expo Location `startLocationUpdatesAsync` with background task registration
  - [ ] Publishes GPS every 5 s when booking is in `IN_TRANSIT` or `ARRIVED` state
  - [ ] Stops publishing automatically on `WORK_STARTED` and beyond
  - [ ] Requests only `FOREGROUND` permission initially; escalates to `BACKGROUND` on acceptance
- [ ] Client live map view (In-Transit)
  - [ ] Subscribes to `location:booking_{id}` channel; updates Handyman map marker on each event
  - [ ] Smooth marker interpolation between location updates (linear interpolation)
  - [ ] Connection status indicator: "Live" badge or reconnecting spinner
- [ ] Geofence triggers (Arrived auto-detect option)
  - [ ] Server-side: check `ST_DWithin(handyman_location, job_address, 200)` on each location event
  - [ ] If within radius and state is `IN_TRANSIT`: prompt Handyman to confirm `ARRIVED` or auto-transition after 30 s
  - [ ] Configurable radius per booking type (default: 200 m)

> **✅ Week 17 Success Criteria**
> - Client map marker updates within 3 s of Handyman moving on a real device test
> - Background location continues publishing with app minimized (verified on physical device)
> - A third-party user cannot subscribe to another booking's location channel (RLS verified)
> - Location data is not persisted to the database beyond the active booking session
> - Geofence trigger fires correctly at 200 m radius in a field test
> - WebSocket channel reconnects automatically within 10 s after simulated network drop

---

### **Week 18 · September 3 – September 9 — Tracking Polish & Saved Addresses**

- [ ] Battery/throttling optimizations for location
  - [ ] Adaptive publish interval: 5 s when speed > 2 m/s (moving), 30 s when stationary
  - [ ] Stop location task when booking enters `WORK_STARTED` state
  - [ ] Battery usage target: < 5% per hour in background tracking mode (measured on test device)
- [ ] Saved addresses (Home, Office, etc.)
  - [ ] `saved_addresses` table: `user_id`, `label` (Home/Office/Custom), `address_text`, `location GEOGRAPHY`
  - [ ] CRUD endpoints with 10-address-per-user limit
  - [ ] Geocoding on save: convert address text to `GEOGRAPHY` point via PostGIS or geocoding API
  - [ ] Saved addresses surface as quick-select chips in the booking address input
- [ ] ETA computation
  - [ ] Haversine straight-line distance × 1.3 road-factor multiplier ÷ average speed (30 km/h default)
  - [ ] ETA label updates every 30 s during `IN_TRANSIT` state
  - [ ] "Arrived" label replaces ETA when geofence triggers
- [ ] Map UX refinements
  - [ ] Static polyline between Handyman current location and job address
  - [ ] "Handyman is X min away" banner anchored above the map card
  - [ ] Map renders at 60 fps on a mid-range Android device (Pixel 6 baseline)

> **✅ Week 18 Success Criteria**
> - Battery drain in background tracking mode < 5% per hour (measured over 1 h on test device)
> - Saved address geocodes correctly and surfaces as a quick-select option in booking flow
> - ETA display updates every 30 s without full screen re-render
> - Map renders without dropped frames at 60 fps on Pixel 6 baseline device
> - Adaptive interval correctly switches between 5 s and 30 s based on movement speed

---

### **Week 19 · September 10 – September 16 — Notifications & Messaging**

- [ ] 🟢 **Standup \#9 — September 9**
- [ ] Unified notification engine (push, email, SMS)
  - [ ] `NotificationService` class with adapters for Expo Push, Resend (email), and Twilio (SMS)
  - [ ] Delivery routing: attempt push first; fall back to email if push token invalid; SMS for critical alerts only
  - [ ] All notification sends logged to `notification_log` table with delivery status
- [ ] In-app messaging (private, masked identifiers)
  - [ ] Per-booking chat thread stored in `messages` table: `booking_id`, `sender_id`, `body`, `created_at`
  - [ ] Real-time message delivery via Supabase Realtime channel scoped to `booking_id`
  - [ ] Phone numbers, emails, and full names never included in message payloads to the other party
  - [ ] Chat thread auto-archives after booking reaches `PAID` state
- [ ] Notification preferences screen
  - [ ] `notification_preferences` table: per-user, per-channel (push/email/SMS), per-event-type opt-in flags
  - [ ] UI: toggle list grouped by event type (Booking Updates, Promotions, Safety Alerts)
  - [ ] Safety-related notifications (SOS, dispute escalation) are non-opt-outable
- [ ] Templated transactional notifications per state change
  - [ ] Templates for: Booking Confirmed, Handyman En Route, Handyman Arrived, Job Started, Job Completed, Payment Received, KYC Approved/Rejected, Payout Processed
  - [ ] Templates support variable interpolation: `{{handyman_name}}`, `{{booking_ref}}`, `{{amount}}`
  - [ ] All templates reviewed for tone consistency and localization readiness

> **✅ Week 19 Success Criteria**
> - Push notification delivered within 5 s of trigger event in staging
> - Email fallback fires when push token is invalid (verified with invalidated test token)
> - In-app message sent by Handyman does not expose their phone number or email to Client
> - User can disable any non-safety notification channel without breaking app function
> - All 8+ transactional event types have corresponding templates with variable interpolation
> - Notification delivery status visible in `notification_log` for admin debugging

---

### **Week 20 · September 17 – September 23 — Safety: SOS, Masked Calls, Photo Proof**

- [ ] Photo proof on Work Started \+ Complete (required)
  - [ ] `ARRIVED→WORK_STARTED` transition blocked at API level if no before-photo uploaded
  - [ ] `WORK_STARTED→COMPLETED` transition blocked if no after-photo uploaded
  - [ ] Photos stored in private Supabase Storage bucket linked to `booking_id`
  - [ ] Signed URLs generated for Admin dispute view; photos not accessible to the other party directly
- [ ] Emergency SOS button (GPS to admin/authorities)
  - [ ] SOS button visible on active booking screen for both Client and Handyman
  - [ ] Tap triggers: captures current GPS, creates `sos_events` record, pushes real-time alert to Admin dashboard
  - [ ] Admin dashboard shows live SOS alerts with map pin and booking context
  - [ ] Secondary action: pre-filled emergency call prompt to local emergency number
- [ ] Masked calling via VoIP / number masking provider
  - [ ] Integrate Twilio Proxy: generate a masked number pair per booking on acceptance
  - [ ] Calls routed through proxy; neither party's real number exposed in call logs
  - [ ] Masked number pair expires after booking reaches `PAID` state
  - [ ] Real phone numbers never logged by the app at any point
- [ ] Dispute Center photo evidence viewer (Admin)
  - [ ] Admin Dispute Center renders before/after photos linked to `booking_id`
  - [ ] Photos displayed alongside the booking audit log (state timeline)
  - [ ] Admin can download photos as evidence package for formal disputes

> **✅ Week 20 Success Criteria**
> - `WORK_STARTED` transition returns 422 if before-photo not uploaded
> - SOS alert appears in Admin dashboard within 10 s of trigger on a real device
> - Masked call connects both parties without Twilio logs showing real phone numbers
> - Real phone numbers are absent from all API responses, WebSocket payloads, and database logs
> - Admin can view both photos and the full audit trail for any disputed booking
> - Photo storage bucket returns 403 without a valid signed URL

---

### **Week 21 · September 24 – September 30 — Dynamic Pricing & Cancellation Fees**

- [ ] 🟢 **Standup \#10 — September 23**
- [ ] Surge pricing engine (supply/demand multipliers)
  - [ ] `pricing_rules` table: service_zone, service_category, multiplier, active_from, active_to
  - [ ] Multiplier applied to base price at booking creation time; stored as `surge_multiplier` on booking
  - [ ] Configurable cap: multiplier cannot exceed 3.0× without explicit Admin override
  - [ ] Surge indicator shown on search results and booking confirmation screen
- [ ] Cancellation policy logic \+ Travel Fee captures
  - [ ] Time-based tiers: free cancellation > 2 h before; 50% fee at 1–2 h; 100% fee < 1 h (post-acceptance)
  - [ ] Cancellation fee charged from Client's held `PaymentIntent` partial capture
  - [ ] Travel Fee: if Handyman has departed (state = `IN_TRANSIT`), travel fee applies regardless of time tier
  - [ ] Cancellation policy displayed to Client before booking confirmation and at cancellation prompt
- [ ] Pricing transparency UI (Client \+ Handyman)
  - [ ] Itemized price breakdown before confirmation: base price, surge, platform fee, travel fee (if applicable)
  - [ ] `PriceBreakdown` component (`src/components/features/PriceBreakdown.tsx`) used consistently
  - [ ] Handyman sees their net earnings after platform fee deduction on job card
- [ ] Admin overrides for surge windows
  - [ ] Admin can create, edit, or delete `pricing_rules` entries via Admin dashboard
  - [ ] Override takes effect within 60 s (cache TTL)
  - [ ] Audit log records who created/modified each pricing rule and when

> **✅ Week 21 Success Criteria**
> - Surge multiplier is correctly applied and stored on bookings created during an active rule window
> - Multiplier cannot exceed 3.0× without an explicit Admin override flag
> - Cancellation fee correctly calculated per tier and captured from the held PaymentIntent
> - Client cannot confirm a booking without seeing the full itemized price breakdown
> - Admin pricing rule change is reflected in new booking prices within 60 s
> - Pricing rule changes are logged in the audit trail with actor ID

---

### **Week 22 · October 1 – October 7 — Retention & Growth Features**

- [ ] Tiered membership (Gold Status, fee tiers, perks)
  - [ ] Gold Status threshold: auto-granted after 10 completed bookings; stored on `users.membership_tier`
  - [ ] Reduced platform fee for Gold clients (configurable percentage in Admin settings)
  - [ ] Gold badge rendered on Client profile and shown to Handymen on booking detail
  - [ ] Membership tier downgrade logic if bookings drop below threshold (with grace period)
- [ ] Geofenced contextual notifications (weather/seasonal)
  - [ ] Integration with weather API: detect rain/storm events in service zones
  - [ ] Trigger push notification to clients in affected zone: "Rainy season? Book a waterproofing handyman today"
  - [ ] Geofence zone defined as PostGIS polygon; client's saved Home address used for zone matching
  - [ ] Rate limit: max 1 contextual notification per user per 48 h
- [ ] Referral / promo codes
  - [ ] `promo_codes` table: `code`, `discount_type` (flat/percent), `discount_value`, `max_redemptions`, `expires_at`
  - [ ] Referral codes tied to a referrer user; referrer receives a wallet credit on first referee booking
  - [ ] Code validation at booking confirmation: one-time use per user, expiry checked server-side
  - [ ] Redemption creates a `wallet_transactions` DEBIT entry for the discount amount
- [ ] Saved addresses \+ smart suggestion notifications
  - [ ] After surge subsides in a zone matching a user's saved address, notify: "Rates are back to normal near your home"
  - [ ] Smart suggestion triggers at most once per surge event per user
  - [ ] Notification deep-links directly into the booking flow for the relevant service category

> **✅ Week 22 Success Criteria**
> - Gold Status auto-granted at the 10th completed booking without manual Admin action
> - Reduced fee tier correctly applied on the next booking after Gold Status is granted
> - Geofenced notification fires within 30 min of a weather trigger for the correct zone
> - Promo code validates, applies the correct discount, and is marked as redeemed (one-use enforced)
> - Smart suggestion notification fires exactly once per surge-subsiding event per user
> - Referral credit correctly credited to the referrer's wallet on the referee's first booking

---

### **Week 23 · October 8 – October 14 — Integration QA**

- [ ] 🟢 **Standup \#11 — October 7**
- [ ] End-to-end integration test pass
  - [ ] Automated E2E test suite (Maestro or Detox) covering 5 critical paths: full booking, cancellation, KYC approval, payout, SOS alert
  - [ ] Tests run on CI against staging environment on every main branch merge
  - [ ] All 5 paths green before milestone is signed off
- [ ] Cross-feature regression sweep
  - [ ] Payment + booking + real-time tracking tested as a combined flow
  - [ ] Notifications triggered at each state transition verified end-to-end
  - [ ] Dynamic pricing + escrow + payout tested as a single financial flow
  - [ ] All regression findings logged, triaged, and resolved before Phase 4
- [ ] Observability: logging, metrics, alerts
  - [ ] Sentry integrated for error tracking on mobile and backend; source maps uploaded
  - [ ] Datadog (or Grafana + Prometheus) dashboards: API latency P50/P95, error rate, active WebSocket connections
  - [ ] PagerDuty (or equivalent) alert configured: fire on error rate > 1% or P95 latency > 1 s
  - [ ] Structured logging with `request_id` correlation on all backend endpoints
- [ ] 🎯 **Milestone:** Escrow, real-time logistics, notifications, dynamic pricing live

> **✅ Week 23 Success Criteria**
> - All 5 E2E critical paths pass green on CI against staging
> - No cross-feature regression: payment, tracking, and notifications work together without conflict
> - Error rate < 0.1% on critical paths under normal staging load
> - API P95 latency < 500 ms across all endpoints in staging
> - PagerDuty alert fires correctly in a simulated error-spike test
> - All Phase 3 features enabled and confirmed functional in staging environment

---

## **Phase 4 — Launch & Audit (October 12 – November 13, 2026\)**

### **Week 24 · October 14 – October 21 — Security Audit**

- [ ] OWASP Top 10 review (mobile \+ web \+ API)
  - [ ] SQL Injection: verify all queries use parameterized statements or Supabase ORM (no raw interpolation)
  - [ ] Broken Access Control: verify RLS policies cover every sensitive table; test IDOR on booking, profile, and wallet endpoints
  - [ ] Security Misconfiguration: audit Supabase project settings (anon key scope, service role key exposure)
  - [ ] Insecure Direct Object References: ensure all resource IDs are UUIDs; sequential integer IDs blocked
- [ ] Penetration testing (auth, payments, file uploads)
  - [ ] Auth bypass attempts: JWT algorithm confusion, token replay, forged claims
  - [ ] Payment manipulation: attempt to capture without authorization, modify `amount` in transit
  - [ ] File upload exploitation: test MIME type bypass, path traversal, oversized payload
  - [ ] All High and Critical findings documented with CVSS score and remediation plan
- [ ] Secrets/key rotation, RBAC review
  - [ ] Rotate all third-party API keys (Stripe, Twilio, Resend) and Supabase service role key
  - [ ] Run Gitleaks scan on full commit history; remediate any historical secret leaks
  - [ ] RBAC audit: verify every admin-only endpoint returns 403 for client and handyman roles
  - [ ] Verify Supabase anon key has no write permissions beyond what RLS permits
- [ ] Privacy review (PII, masked calls/chat retention)
  - [ ] Map all PII fields across tables; verify encryption at rest and in transit (TLS 1.2+)
  - [ ] Chat message retention policy: auto-delete after 90 days post-booking completion
  - [ ] Masked call logs: confirm Twilio Proxy does not expose real numbers in any API response
  - [ ] Privacy policy published and linked in app; consent captured at signup

> **✅ Week 24 Success Criteria**
> - Zero OWASP Top 10 Critical or High vulnerabilities remaining after remediation pass
> - Pen test report produced; all High findings have documented fixes with verification
> - Gitleaks scan returns zero findings on the full commit history
> - All PII fields confirmed encrypted at rest; TLS enforced on all endpoints
> - Privacy policy live and accessible from the app's Settings screen
> - RBAC audit confirms no role boundary breaches on any endpoint

---

### **Week 25 · October 22 – October 28 — Stress Testing**

- [ ] 🟢 **Standup \#12 — October 21**
- [ ] Load tests (booking, search, sockets)
  - [ ] k6 script: 500 concurrent booking creation requests sustained for 5 minutes
  - [ ] k6 script: 1,000 concurrent search queries with varied radius and category parameters
  - [ ] k6 script: 200 concurrent WebSocket connections sending location updates at 5 s intervals
  - [ ] All scripts run against staging environment; results documented
- [ ] DB scale tests (PostGIS query plans, indexing)
  - [ ] Seed staging DB with 100,000 handyman records and 1,000,000 booking records
  - [ ] `EXPLAIN ANALYZE` on `ST_DWithin` search query; verify GiST index is hit
  - [ ] `EXPLAIN ANALYZE` on audit log query by `booking_id`; add index if needed
  - [ ] Identify and resolve any sequential scans on hot query paths
- [ ] Failover / disaster recovery drill
  - [ ] Simulate Supabase primary DB failover; measure time to read-replica promotion
  - [ ] Verify app handles 503 gracefully: queued retry, user-facing "We'll be right back" screen
  - [ ] Validate backup restoration: restore from last daily backup and verify data integrity
  - [ ] RTO target: < 60 s; RPO target: < 5 min
- [ ] Performance budget sign-off
  - [ ] API P95 latency < 500 ms under load test conditions
  - [ ] App cold start < 3 s on a mid-range device (Pixel 6 / iPhone 12 baseline)
  - [ ] Map screen renders at 60 fps under live location update load
  - [ ] All budgets signed off by tech lead in a documented performance review

> **✅ Week 25 Success Criteria**
> - System sustains 500 concurrent bookings with error rate < 0.1%
> - PostGIS radius query P95 < 100 ms at 100K handyman record dataset (GiST index confirmed active)
> - DB failover completes in < 60 s with zero committed data loss
> - App cold start meets the 3 s budget on both baseline devices
> - All performance budgets documented and signed off
> - k6 test scripts committed to repo for reproducible future load tests

---

### **Week 26 · October 29 – November 4 — Closed Beta**

- [ ] Internal/closed beta release (TestFlight \+ Play Internal)
  - [ ] iOS build submitted to TestFlight; distributed to internal testers (up to 100)
  - [ ] Android build uploaded to Play Internal Testing track
  - [ ] Release notes published; testers briefed on test scope and known issues
  - [ ] Feedback channel set up (Slack thread, form, or dedicated beta testing tool)
- [ ] Bug bash with stakeholders
  - [ ] Structured 2-hour test session covering all three role flows
  - [ ] Each tester assigned a specific role (Client, Handyman, Admin) and test script
  - [ ] All findings logged immediately into issue tracker with severity and reproduction steps
- [ ] Crash analytics \+ telemetry review
  - [ ] Sentry and Firebase Crashlytics dashboards reviewed daily during beta
  - [ ] Crash-free rate target: ≥ 98% within 48 h of beta release
  - [ ] Top 5 error types triaged and assigned to engineers on Day 1 of beta
- [ ] Hotfix sprint
  - [ ] P0 bugs fixed, reviewed, and pushed as patch releases within 48 h of discovery
  - [ ] Patch builds re-distributed via TestFlight / Play Internal immediately after merge
  - [ ] Beta sign-off: all P0 and P1 bugs resolved before proceeding to Week 27

> **✅ Week 26 Success Criteria**
> - Beta builds distributed to ≥ 20 testers on both platforms with zero install failures
> - Crash-free rate ≥ 98% after 48 h of active beta use
> - All P0 bugs patched and verified within the beta window
> - Structured bug bash session completed with all findings logged
> - Beta feedback summary document shared with full team
> - Go/no-go decision for store submission made and recorded

---

### **Week 27 · November 5 – November 11 — Store Submission Prep**

- [ ] 🟢 **Standup \#13 — November 4**
- [ ] Store assets (screenshots, descriptions, privacy policy)
  - [ ] Screenshots captured at required sizes: 6.7" iPhone, 12.9" iPad Pro, Pixel 8 Pro
  - [ ] App preview video (30 s) demonstrating core booking flow for each store
  - [ ] Short description (80 chars) and full description (4,000 chars) written and localized
  - [ ] Age rating questionnaire completed; content rating justified
- [ ] App Store \+ Play Store submission
  - [ ] App Store Connect: all metadata fields complete; build attached; review guidelines checklist passed
  - [ ] Play Store: content policy checklist passed; data safety form completed (all data types declared)
  - [ ] Both submissions include privacy policy URL and support contact
  - [ ] Expedited review requested on App Store if timeline is tight
- [ ] Marketing site / landing page
  - [ ] Landing page live: feature highlights, App Store / Play Store badge links (once live), waitlist CTA
  - [ ] SEO meta tags and Open Graph images configured
  - [ ] Contact / support email configured and monitored
- [ ] Support and onboarding documentation
  - [ ] In-app help center: FAQ for Client and Handyman roles (accessible offline)
  - [ ] Handyman onboarding guide: step-by-step KYC instructions with screenshots
  - [ ] Support email/chat configured; first-response SLA defined (< 24 h)

> **✅ Week 27 Success Criteria**
> - App Store submission passed metadata review (no rejection for incomplete information)
> - Play Store submission enters review within 3 business days of upload
> - Landing page live, indexed, and accessible; App Store badges link to correct store pages once approved
> - In-app help center accessible from Settings without requiring an internet connection
> - Support inbox configured and at least one team member assigned to monitor it

---

### **Week 28 · November 12 – November 18 — Production Launch**

- [ ] Address store review feedback (if any)
  - [ ] Respond to any Apple / Google reviewer notes within 24 h
  - [ ] If rejected: root cause identified, fix applied, and resubmission made within 48 h
  - [ ] All reviewer-requested changes documented for future submissions
- [ ] Production rollout (phased if needed)
  - [ ] Play Store: staged rollout at 10% → 50% → 100% over 48 h, monitoring for crash spikes
  - [ ] App Store: full release (App Store does not support percentage rollout natively)
  - [ ] Feature flags ready to remotely disable any unstable feature without a new build
- [ ] Monitor live metrics; on-call rotation
  - [ ] Sentry and Datadog dashboards actively monitored for first 7 days post-launch
  - [ ] PagerDuty on-call rotation: at least 2 engineers available 24/7 for the launch week
  - [ ] Escalation runbook published: who to contact for DB, payment, and push notification incidents
  - [ ] Rollback plan documented: criteria for reverting to previous build via Play Store staged rollout halt
- [ ] Post-launch retro \+ roadmap handoff
  - [ ] Sprint retro: what went well, what to improve, team recognition
  - [ ] v1.1 backlog groomed: top user feedback items from beta and launch week prioritized
  - [ ] Handoff documentation: architecture decisions, runbooks, on-call guide delivered to ops team
- [ ] 🎯 **Milestone:** Public launch on App Store & Play Store

> **✅ Week 28 Success Criteria**
> - App live and downloadable on both App Store and Play Store
> - Zero P0 incidents in the first 48 h post-launch
> - Crash-free rate ≥ 99% in the first 24 h of production traffic
> - On-call rotation covers all 7 days of launch week with documented escalation paths
> - Post-launch retro completed; v1.1 backlog document published
> - Platform metrics (bookings, signups, revenue) being tracked on the Datadog/Grafana dashboard

---

## **Standup Quick Index**

| \# | Date | Phase |
| :---- | :---- | :---- |
| 1 | May 19, 2026 | Phase 1 |
| 2 | June 2, 2026 | Phase 1 |
| 3 | June 16, 2026 | Phase 2 |
| 4 | June 30, 2026 | Phase 2 |
| 5 | July 14, 2026 | Phase 2 |
| 6 | July 28, 2026 | Phase 2 |
| 7 | August 11, 2026 | Phase 3 |
| 8 | August 25, 2026 | Phase 3 |
| 9 | September 8, 2026 | Phase 3 |
| 10 | September 22, 2026 | Phase 3 |
| 11 | October 6, 2026 | Phase 3 |
| 12 | October 20, 2026 | Phase 4 |
| 13 | November 3, 2026 | Phase 4 |

