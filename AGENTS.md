# oki-app

Expo SDK 54 + React Native 0.81 + NativeWind (preview) + TypeScript strict.

3-sided handyman marketplace: Client → Handyman → Admin. Philippine market (PHP currency).

## Karpathy Coder — Active Coding Discipline

**Think Before Coding.** State assumptions explicitly. Surface multiple interpretations—don't pick silently. If uncertain, ask. Push back when warranted.

**Simplicity First.** Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No "flexibility" not requested. If you write 200 lines and it could be 50, rewrite it. Test: would a senior engineer say this is overcomplicated?

**Surgical Changes.** Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Don't refactor things that aren't broken. Match existing style even if you'd do it differently. Remove imports/variables/functions YOUR changes made unused. Every changed line must trace directly to the user's request.

**Goal-Driven Execution.** Define success criteria before coding. For multi-step tasks, state a brief plan with verification checks. "Add validation" → "Write tests for invalid inputs, then make them pass." "Fix the bug" → "Write a test that reproduces it, then make it pass."

## Quick start

```sh
npm install
npx expo start           # dev server (iOS/Android/Web)
npx expo start --web     # web-only
npm run prebuild         # native dirs before first native build
```

## Verification commands (order independent, run in CI)

```sh
npm run lint             # ESLint 9 flat config + Prettier check
npm run type-check       # tsc --noEmit (strict mode)
npm run test:ci          # jest --ci (jest-expo preset)
npm test                 # jest (watch mode)
```

## Architecture

### Entry & Routing

- **Entry**: `expo-router/entry` (routes live under `app/`)
- **Route groups**: `(auth)` | `(client)` | `(handyman)` | `(admin)` | `(verification)`
- **Root layout** (`app/_layout.tsx`): `SafeAreaProvider` → `ThemeProvider` → `BookingsProvider` → font loading (Inter 400/500/600/700 + Nunito 700/800)
- **Tab layouts**: Client (4 tabs: Home / Bookings / Messages / Profile), Handyman (4 tabs: Dashboard / Requests / Schedule / Profile), Admin (5 tabs: Dashboard / Users / Bookings / Transactions / Disputes)
- **Standalone routes**: `new-booking.tsx` (4-step wizard), `notifications.tsx`, `booking/[id].tsx` (detail with Overview/Timeline/Payment tabs), `profile/edit|addresses|notifications|payments`

### Full Route Map

```
app/
├── _layout.tsx                    Root layout (providers, fonts)
├── index.tsx                      Landing / role nav hub
├── new-booking.tsx                Category → Details → Schedule → Review
├── notifications.tsx              Notification list
├── (auth)/login.tsx               Phone/email + password login
├── (client)/
│   ├── _layout.tsx                BottomNav (Home, Bookings, Messages, Profile)
│   ├── index.tsx                  Dashboard (header, active booking, categories, quick book, promo, activity)
│   ├── bookings.tsx               Active / Upcoming / History segments
│   ├── messages.tsx               Messages placeholder
│   └── profile.tsx                Avatar, account items, theme switcher, logout
├── (handyman)/
│   ├── _layout.tsx                BottomNav (Dashboard, Requests, Schedule, Profile)
│   ├── index.tsx                  Online toggle, earnings overview, active job
│   ├── requests.tsx               Incoming request inbox (accept/decline)
│   ├── schedule.tsx               Calendar + filtered bookings
│   ├── past-jobs.tsx              Completed/paid/cancelled jobs
│   └── profile.tsx                Avatar, rating, skills, wallet, settings
├── (admin)/
│   ├── _layout.tsx                TabBar (Dashboard, Users, Bookings, Transactions, Disputes)
│   ├── index.tsx                  KPI cards, chart, pending transactions, activity feed
│   ├── users.tsx                  User search, KYC queue, user list with suspend
│   ├── bookings.tsx               Search + status filter chips, expandable cards
│   ├── transactions.tsx           Search + payment status filter
│   └── disputes.tsx               Search + dispute status filter
├── (verification)/
│   ├── client/onboarding.tsx      Name, phone, city, service needs
│   ├── client/kyc-lite.tsx        ID, selfie, proof of address uploads
│   └── handyman/onboarding.tsx    4-step: Profile → Services → Documents → Pending
├── booking/[id].tsx               Detail with hero card + 3 info tabs
└── profile/
    ├── edit.tsx                   Avatar + name/email/phone fields
    ├── addresses.tsx              Saved address list + add modal
    ├── notifications.tsx          Push/Email/SMS toggles
    └── payments.tsx               Card list + add modal
```

### Component Organization

```
src/
├── components/
│   ├── ui/                 20 primitives (Avatar, Badge, Button, Card, ConfirmDialog,
│   │                       Dropdown, EmptyState, ErrorBoundary, IconButton, Input,
│   │                       LoadingSpinner, Modal, RatingDisplay, ScreenHeader,
│   │                       Stepper, Tabs, TimePicker, Toast, VerticalStepper)
│   ├── navigation/         BottomNav, Navbar, Drawer, TabBar, BackButton
│   ├── home/               DashboardHeader, GreetingBlock, CategoryGrid, QuickBookCards,
│   │                       PromoCard, ActiveBookingCard, RecentActivity, HeroHeader, TrustStrip
│   ├── cards/              ActiveBookingCard, BookingCard, JobCard, ReviewCard
│   ├── bookings/           BookingHeroCard, 3 detail tabs, 4-step new-booking wizard
│   ├── forms/              Form, FormError, FormField, FormLabel, Input, SearchBar, Select
│   ├── features/           EmergencySOS, MapPlaceholder, NotificationCenter, PriceBreakdown,
│   │                       StateIndicator, UserProfileHeader
│   ├── handyman/           ActiveJobWorkflowCard, RequestInboxCard, ScheduleCalendar, WalletSection
│   ├── admin/              Chart, Table
│   ├── profile/            ProfileMenuRow, ProfileStatsBar
│   └── onboarding/handyman/  4-step onboarding flow + shared types/hook
├── constants/theme.ts      Color schemes, status labels/colors, category palette/icons
├── context/                BookingsContext (state + localStorage), ThemeContext (3 schemes)
├── hooks/                  useLocalStorage
├── types/index.ts          All enums + interfaces (User, Booking, Review, Transaction, etc.)
├── mocks/                  Mock data for all entity types
└── utils/index.ts          formatCurrency (PHP), dates, initials, generateId
```

### Imports

- `components/*` → root `components/` dir
- `@/*` → `src/*`
- Barrel exports: `src/mocks/index.ts`, `src/components/onboarding/handyman/index.ts`

### Styles

- **NativeWind** via `className` string literals (primary)
- Inline `style` prop for dynamic/computed values (theme colors, shadows, pressed state)
- `const styles = {}` at component bottom for truly static RN-only styles
- `global.css` imports Tailwind v4 layers + NativeWind theme at app root
- 3 themeable color schemes: `crimson` (default), `teal`, `indigo` — each with primary/secondary 50-900 + ui colors
- Fixed semantic colors: booking statuses, membership tiers, service categories (not theme-dependent)
- Shadow pattern: inline `{ shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation }`

### Fonts

| Class | Font |
|-------|------|
| `font-sans` | Inter Regular |
| `font-heading` | NunitoBold |
| `font-inter-medium` | InterMedium |
| `font-inter-semibold` | InterSemiBold |
| `font-inter-bold` | InterBold |
| `font-nunito` | NunitoBold |
| `font-nunito-extrabold` | NunitoExtraBold |

Min font size: 12px (`text-xs`).

## Build toolchain

NativeWind → PostCSS (`@tailwindcss/postcss`) → Metro (`withNativewind`) → Babel (`babel-preset-expo` + `react-native-worklets/plugin`)

## Config quirks

- `lightningcss` pinned to `1.30.1` in package.json overrides
- ESLint 9 flat config: `eslint.config.js` uses `defineConfig`/`require`, extends `eslint-config-expo/flat`
- Prettier: printWidth 100, singleQuote, bracketSameLine, trailingComma es5, `prettier-plugin-tailwindcss` sorts `className`
- TSConfig: `strict: true`, paths `@/*` → `src/*`, extends `expo/tsconfig.base`
- Jest: `jest-expo` preset, CSS files mocked, bare `components/` imports mapped

## Interaction patterns

- Use `Pressable` (not `TouchableOpacity`) for new interactive rows/buttons
- `android_ripple` + `style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}`
- `Button` / `IconButton` components for semantic actions
- Shared `Modal` component for confirmation dialogs

## Booking state machine

Full FSM: `PENDING → ACCEPTED → IN_TRANSIT → ARRIVED → WORK_STARTED → COMPLETED → PAID`
Side exit: `PENDING → CANCELLED`
See `backend/docs/booking-state-machine.md` for guard conditions, audit log, and API contract.

## Backend docs

| File | What |
|------|------|
| `backend/docs/booking-state-machine.md` | FSM spec, guard conditions, API contract, error schema |
| `backend/docs/database-architecture.md` | ER diagram, 11 tables, PostGIS, RLS boundaries |
| `backend/docs/openapi.yaml` | Full OpenAPI 3.0.3 (auth, profiles, KYC, bookings, wallet, admin) |
| `backend/migrations/001_core_schema.sql` | Extensions, enums, tables, indexes, triggers, RLS helpers |
| `backend/rls-policies/001_core_rls.sql` | Per-table RLS policies for client/handyman/admin/service-role |

## Data model core enums

| Enum | Values |
|------|--------|
| `BookingStatus` | Pending → Accepted → InTransit → Arrived → WorkStarted → Completed → Paid → Cancelled |
| `ServiceCategory` | Plumbing, Electrical, Carpentry, Cleaning, Painting, HVAC, Roofing, Landscaping, Appliance Repair, General Handyman |
| `BookingType` | OnDemand, Scheduled |
| `KycStatus` | Pending, Approved, Rejected, Resubmit |
| `TransactionStatus` | Authorized, Captured, Failed, Refunded |
| `UserType` | client, handyman, admin |
| `ColorScheme` | crimson, teal, indigo |

## Git hygiene

- Husky pre-commit runs `npx lint-staged` (ESLint fix + Prettier on staged ts/tsx, Prettier on json/css/md)
- CI runs lint, type-check, test in parallel on PR to main/master/develop (`.github/workflows/ci.yml`)
- PR template at `.github/PULL_REQUEST_TEMPLATE.md`

## EAS Build

- `development`: dev client, internal distribution
- `staging`: internal APK/IPA
- `production`: store AAB/IPA
- `APP_ENV` env var set per profile

## Env vars (see .env.example)

```
SUPABASE_URL, SUPABASE_ANON_KEY, EXPO_PUBLIC_EAS_PROJECT_ID
```

Secrets stored in GitHub Secrets + Supabase Vault (not in repo).

## Reference docs

| File | What |
|------|------|
| `skills.md` | Developer conventions — styling, layout, components, interaction, typography |
| `App_Development_Guide.md` | Full product spec — all screens, features, phases |
| `Implementation_Checklist_by_Weeks.md` | 28-week project plan (May–Nov 2026) |
| `README.md` | Setup and running guide |

## Aspirational conventions (PR template references; not yet implemented)

- `src/constants/theme.ts` — design tokens (done)
- `src/components/ui/` — shared UI primitives (done)
- `src/mocks/` — mock data (done)
- `src/types/index.ts` — shared types (done)
- Route groups: `(auth)`, `(client)`, `(handyman)`, `(admin)` (done)
