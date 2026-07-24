# Booking flow tests — how to run & what's left

See `customer-booking-e2e-plan.md` for the full coverage matrix. This file is the
operational quick-start.

## Layer A — integration tests (runnable now)

Jest, in the existing CI `test` job. No extra setup.

```bash
pnpm test                    # everything
pnpm jest __tests__/flows    # just the customer booking flow tests
```

Files:

- `__tests__/flows/customer-booking-create.test.ts` — createBooking payload the
  wizard sends (CB-01, CB-03, CB-05) + offline fallback.
- `__tests__/flows/customer-booking-context.test.tsx` — BookingsContext: create
  appends (CB-01), realtime wiring + status apply (CB-08/CB-09), cancel guard
  (CB-11/CB-12).

These use only `jest` + `react-test-renderer` (already installed) and run in the
existing `.github/workflows/ci.yml` `test:ci` job with no changes.

### Not yet done in Layer A (needs a dependency)

Full-screen wizard render tests (CB-02 step gates, CB-04 blocked slot, CB-06/07
submit error surfacing at the UI) need `@testing-library/react-native`, which
must be added with pnpm so the lockfile stays in sync (CI runs
`pnpm install --frozen-lockfile`):

```bash
pnpm add -D @testing-library/react-native @testing-library/jest-native
```

Then render `app/new-booking.tsx` wrapped in `ThemeProvider` + `BookingsProvider`,
mock `expo-router`'s `useRouter`/`useLocalSearchParams`, and drive the steps.

## Layer B — Maestro true e2e (scaffolded, not in CI)

`.maestro/customer-booking-happy.yaml` runs against an EAS dev build hitting the
real dev Supabase.

### Run locally

```bash
# 1. install Maestro — https://maestro.mobile.dev
# 2. build & install a dev client, or use an existing dev APK/simulator build
eas build --profile development --platform android   # once
# 3. set env for the flow
export MAESTRO_APP_ID=com.oki.app            # match app.json / eas
export MAESTRO_CLIENT_EMAIL=...              # seeded dev test client
export MAESTRO_CLIENT_PASSWORD=...
# 4. run
maestro test .maestro/customer-booking-happy.yaml
```

### UI hooks to add (makes the flow stable)

The flow currently taps visible text. Add `testID`s and switch to `id:` selectors:

- new-booking Continue / Confirm button → `testID="booking-primary-cta"`
- category + sub-service cells → `testID="category-<id>"`, `testID="subservice-<id>"`
- address / description inputs → `testID="booking-address"`, `testID="booking-description"`
- post-create searching screen → `testID="booking-searching"`

### CI job to add (post-deploy gate, not per-PR)

Add as a **separate** workflow triggered on deploy-to-dev (needs an emulator +
secrets `MAESTRO_APP_ID`, `MAESTRO_CLIENT_EMAIL`, `MAESTRO_CLIENT_PASSWORD`, and
a dev Supabase URL). Sketch:

```yaml
name: E2E (dev)
on:
  workflow_dispatch:
  push:
    branches: [dev]
jobs:
  maestro:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: |
            curl -Ls https://get.maestro.mobile.dev | bash
            # install the dev build (EAS internal-distribution url or built apk)
            maestro test .maestro/
        env:
          MAESTRO_APP_ID: ${{ secrets.MAESTRO_APP_ID }}
          MAESTRO_CLIENT_EMAIL: ${{ secrets.MAESTRO_CLIENT_EMAIL }}
          MAESTRO_CLIENT_PASSWORD: ${{ secrets.MAESTRO_CLIENT_PASSWORD }}
```

Kept out of `ci.yml` on purpose — it needs a build + emulator and must not block
every PR.
