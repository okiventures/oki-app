# App UI Diagnosis — 2026-08-15

Flow-by-flow audit of what works and what doesn't, mock data included. Run on `feat/week15-escrow-foundation` at commit `5ad11cf`.

**Coverage:** client, handyman and admin flows below were read end to end. **Not audited:** auth/signup/login/OTP/reset, the three `(verification)` onboarding screens, and the internals of the booking-detail tabs. Those need a separate pass.

Legend — [x] works · [!] works but wrong/misleading · [ ] broken or absent

---

## Fixed in this pass (commit `5ad11cf`)

| Issue | Cause |
| --- | --- |
| Client couldn't see declined bookings, no history | `BookingsContext.declineBooking` deleted the row from context. In mock mode the client's own booking vanished permanently; in live mode the 20s poll pulled it straight back into the handyman's inbox. Now records a local declined id and leaves the booking PENDING for re-broadcast. |
| Client bookings list hid declined jobs | `(client)/bookings.tsx` bucketed Completed/Paid and Cancelled, never `Rejected`. Also wasn't scoped to `clientId`, so the mock client saw c1–c4's bookings while the dashboard showed only c1's. |
| Handyman Past Jobs empty in live mode | `past-jobs.tsx` filtered on a bare `const HANDYMAN_ID = 'h1'` with no session fallback — unlike `requests.tsx` and `schedule.tsx`, which get it right. |
| Dashboard address hardcoded / wired from the booking form | The header took the last comma-segment of the most recent booking's `address_text`, so typing a one-off job address relabelled the whole dashboard. Nothing stores a client address, so it now shows "Set your location". |
| Booking confirm silently did nothing on failure | `new-booking.tsx` had a bare `catch {}`. A failed `create-booking` call left the user on the review step with no message. Also hardcoded `clientId: 'c1'` / `clientName: 'Ishah Bautista'`. |
| Ghost buttons | Track live, Rebook, profile Settings, the location chevron, and profile rows with no destination all rendered live-looking and did nothing. They now hide or dim. |
| Decline copy was wrong | Said "marked as Rejected and removed from your inbox". REJECT leaves the booking PENDING for re-broadcast — it never becomes REJECTED. |

---

## Client flows

**Dashboard** `(client)/index.tsx` — [x] works. Notification badge is `isMockEnv() ? 3 : 0` (no notifications table), so live always reads zero.

**Category tile → search** `(client)/search.tsx` — [!] two of ten tiles silently misbehave. `catalogService.toTile()` builds ids by lowercasing and hyphenating (`Appliance Repair` → `appliance-repair`), but `CATEGORY_PARAM_MAP` keys are single words (`appliance`, `general`). Those two tiles resolve to `null` and return **every** handyman unfiltered instead of an error. The header also renders the raw param, so it reads "Appliance-repair".

**Search → pick a handyman → book** — [ ] **broken.** `search.tsx:handleSelect` pushes `/new-booking?handymanId=...`, but `new-booking.tsx` only reads `mode`. The handyman id is dropped on the floor, so you land on a blank booking form that has forgotten who you picked. The entire browse-and-book-a-specific-handyman path does not connect.

**New booking** `new-booking.tsx` — [ ] **the catalog and the booking form disagree.** `NEW_BOOKING_CATEGORIES` offers four categories — massage, cleaning, painting, general — while the DB `service_category` enum and the dashboard grid both carry ten. Plumbing, Electrical, Carpentry, HVAC, Roofing, Landscaping and Appliance Repair are advertised on the home screen and **cannot be booked at all**. "Massage" isn't a handyman service and maps to `ServiceCategory.General`.

Also [!]: every booking is submitted with `lat: DEFAULT_LAT, lng: DEFAULT_LNG` (10.3157, 123.8854) regardless of the address typed. There's no geocoding, so distance-ranked search and dispatch are working off a fixed pin for every job.

**Bookings list** `(client)/bookings.tsx` — [x] fixed above.

**Booking detail** `booking/[id].tsx` — [x] loads via `get_booking_detail`, tabs render. Internals not audited.

**Messages tab** `(client)/messages.tsx` — [ ] 21-line permanent empty state. It's a primary tab in the client nav that can never show anything. Messaging is Week 19.

**Profile → Saved Addresses** `profile/addresses.tsx` — [ ] pure local `useState` seeded with three hardcoded **US** addresses ("123 Main St, New York", "456 Market St, San Francisco", "789 Elm St, Los Angeles"). Nothing persists; there is no addresses table and `users` has no address column. Saved addresses are Week 18.

**Profile → Payment Methods** `profile/payments.tsx` — [ ] same shape: local state from `INITIAL_METHODS`, nothing persists. Real payment methods land in Week 15/16.

**Notifications** `app/notifications.tsx` — [ ] hardcoded `INITIAL_NOTIFICATIONS` fixtures keyed to `userId: 'c1'`, with no role or identity check. Every dashboard header's bell routes here, so a handyman or admin sees a client's fake notifications.

**Review and Report** — [x] `review/[id].tsx` and `report/*` are wired to `reviewService` / `reportService`.

## Handyman flows

**Requests inbox** `(handyman)/requests.tsx` — [x] works; decline rebound fixed above.

**Active job workflow** — [x] solid. `advanceBooking` handles 422 guard failures with a real message and no longer optimistically advances on network failure.

**Past Jobs** — [x] fixed above. Reachable only from a `Link` on the handyman profile, not from the tab bar.

**Schedule / Earnings / Profile** — [x] wired (`useHandymanAvailability`, `useEarnings`, `profileService`), all with correct `isMockEnv()` fallbacks.

## Admin flows

[x] All six screens are wired to real data — `index` and `transactions` via `useAdminDashboard`, `users` / `disputes` / `reviews` via `AdminContext`, `bookings` via `BookingsContext`. No mock-only screens found.

---

## Cross-cutting

**`ErrorBoundary` is never mounted.** `src/components/ui/ErrorBoundary.tsx` exists and is correct, but nothing imports it — `app/_layout.tsx` wraps the tree in SafeArea/Theme/Auth/Bookings/Admin providers and no boundary. Any render throw white-screens the whole app with no recovery. Cheapest robustness win available.

**`BookingStatus.Rejected` is unreachable.** `bookingFsm.ts:89` defines `PENDING --REJECT--> PENDING` and `fsmTransition` returns the booking unchanged; `reject-booking/index.ts` does the same server-side and only writes a `booking_events` row. So nothing ever writes `REJECTED`. The DB enum value (migration 010), the theme label and colour, the `past-jobs` bucket, `ACTIVITY_STATUS`, `TERMINAL_STEPS[Rejected]` and `searchService`'s exclusion are all dead paths. **Decide:** either drop the enum value and the dead branches, or make per-handyman declines a real recorded state. Right now the code says both.

**`app/lifecycle-demo.tsx` is unreachable** — 594 lines, nothing links to it, still bundled.

**16 orphan components** never imported anywhere: `JobCard`, `EmergencySOS`, `MapPlaceholder`, `PriceBreakdown`, `StateIndicator`, `UserProfileHeader`, `FormField`, `Select`, `HeroHeader`, `TrustStrip`, `Categories`, `Drawer`, `TabBar`, `ProfileStatsBar`, `ErrorBoundary`, `Typography`.

---

## Suggested order

1. **Wire `handymanId` through `new-booking`** — the search→book path is the most visible break.
2. **Expand `NEW_BOOKING_CATEGORIES` to the full ten** and drop massage, or stop advertising the seven unbookable categories on the dashboard.
3. **Mount `ErrorBoundary`** in `app/_layout.tsx`.
4. **Fix `CATEGORY_PARAM_MAP`** for `appliance-repair` / `general-handyman`, and label from the tile name instead of the raw param.
5. **Decide the `Rejected` question** before Week 15 touches the FSM again.
6. **Geocode the booking address** instead of `DEFAULT_LAT/LNG` — Week 15 dispatch and Week 17 tracking both depend on it.
7. Leave addresses (Week 18), payment methods (Week 15/16), messages (Week 19) and notifications as known-missing, but consider hiding the Messages tab until it does something.
