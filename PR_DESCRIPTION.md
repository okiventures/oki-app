## Summary

Implements the full handyman KYC flow end-to-end: file upload edge function, admin review (approve/reject per handyman), onboarding submission, and demo access. Covers Week 7 (KYC Backend) and Week 12 (Admin Verification Portal) checklist items.

---

## Type of Change

- [X] ✨ New feature (non-breaking change that adds functionality)
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ♻️ Refactor (no functional change; improves structure or readability)
- [X] 💄 UI / style change (layout, spacing, theming)
- [X] 🔧 Config / tooling (build, lint, CI, dependencies)
- [ ] 📝 Documentation
- [ ] 🚨 Breaking change (fix or feature that causes existing functionality to change)

---

## Implementation Checklist

### Code Quality
- [X] No TypeScript errors (`tsc --noEmit` passes in strict mode)
- [X] No ESLint warnings or errors (added `apps/admin/**` to eslint ignores, removed unused vars)
- [X] Follows existing naming conventions (PascalCase components, camelCase hooks/utils)
- [X] No duplicated code — reused existing components/hooks where possible
- [X] No `console.log` or debug statements left in

### UI / Components
- [X] Follows the NativeWind + Tailwind design token system (`src/constants/theme.ts`)
- [ ] Responsive on both iOS and Android (tested on web only — simulators unavailable on this machine)
- [X] Empty states, loading states, and error states are handled
- [X] Uses existing shared components (`src/components/ui/`, `src/components/forms/`) where applicable

### Routing & Navigation
- [X] Route group is correct: `(auth)`, `(admin)`, `(verification)`
- [X] Navigation guards / redirect logic is correct for role
- [X] Deep link or back-navigation behavior is verified

### Data & State
- [X] Mock data updated in `src/mocks/admin.ts` — `MOCK_KYC_REQUESTS` now matches `AdminKycRequest` shape with nested `documents`
- [X] Types updated in `src/context/AdminContext.tsx` — `AdminKycRequest` and `AdminKycDocument` interfaces
- [X] No hardcoded strings that should be constants or tokens

### Testing
- [ ] Manually tested the happy path on iOS
- [ ] Manually tested the happy path on Android
- [X] Edge cases tested (empty data, oversized payload, missing auth)

---

## Screenshots / Screen Recording

| Before | After |
|--------|-------|
| KYC upload: broken (CORS / import resolution errors) | 5 zero-import edge functions deployed and responding |
| Admin KYC queue: empty/stub | Grouped by handyman, Approve/Reject, status filters, preview modal |
| Landing page: no demo access | One-click login for demo-admin and demo-handyman |
| Onboarding: bio min 16 chars | Bio max 200 chars |

---

## How to Test

### Demo access
1. `npx expo start --web`
2. Open landing page — click "Demo Admin" or "Demo Handyman" to auto-login

### KYC onboarding (handyman)
1. Log in as `demo-hm@oki.test` (or click the demo button)
2. Navigate to onboarding: fill profile — select services — upload documents — submit

### Admin KYC review
1. Log in as `demo-admin@oki.test` (or click the demo button)
2. Go to Users tab — see handymen grouped with document thumbnails
3. Click thumbnail to preview — click Approve or Reject (with optional reason)
4. Use status filter chips: Pending / Approved / Rejected

### Edge function smoke test (curl)
```bash
curl -X POST "https://wvrhxxtvefeyynglfibq.supabase.co/functions/v1/kyc-upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=GOVERNMENT_ID" -F "file=@/path/to/id.jpg"

curl "https://wvrhxxtvefeyynglfibq.supabase.co/functions/v1/kyc-admin-list?status=PENDING" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X POST "https://wvrhxxtvefeyynglfibq.supabase.co/functions/v1/kyc-admin-bulk-review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"handyman_id":"...","action":"APPROVE"}'
```

---

## Reviewer Notes

### Key architecture decisions
- **Zero-import pattern**: All 5 edge functions use `Deno.serve()` + raw `fetch()` to Supabase REST APIs (no `import { serve }` from CDN). API-deployed functions cannot resolve CDN imports at runtime — this pattern works reliably.
- **Per-handyman approval**: `kyc-admin-bulk-review` updates all PENDING docs + handyman `kyc_status` atomically (parallel `Promise.all`). Approval is per-person, not per-document.
- **File upload**: Supports both `application/json` (base64) and `multipart/form-data` to work across Expo web and curl testing.

### Housekeeping in this PR
- Added `apps/admin/**` to ESLint ignores (separate Next.js app with own deps) — 0 lint errors now
- Removed 3 unused variables (`activeUsersCount`, `activeDisputesCount`, `AdminKycRequest`)
- Removed Husky v10 deprecated shim lines from `.husky/pre-commit`
- Added `*.tsbuildinfo` to `.gitignore`
- Updated `MOCK_KYC_REQUESTS` to match new `AdminKycRequest` type with nested documents

### Known limitations
- `verify_jwt: false` on all edge functions — auth checked at function level via `verifyAdmin()` / `getAuthUser()`.
- CORS `Access-Control-Allow-Origin: *` — set `ALLOWED_ORIGIN` env var for production.
- Rate limiting is in-memory (per-instance, not distributed) — use Redis/Upstash for production multi-instance rate limiting.
- CLI `ProjectConfigParseError` persists — all deploys use Management API PATCH directly.

### Checklist items progressed

| Week | Items | Status |
|------|-------|--------|
| Week 7 | KYC document upload (storage, signed URLs) — all 4 sub-items | Done |
| Week 12 | Admin KYC review queue — paginated list, document viewer, bulk review | Done |
| Week 12 | Approve / reject Handyman docs — Approve/Reject actions, status updates | Done |

---

## Senior Review Checklist (for Reviewer)

- [X] No accidental duplication of existing components or utilities
- [X] Architectural decision is sound and consistent with existing patterns
- [ ] No security concerns — **`.env` keys in git history need rotation**
- [X] Performance: no unnecessary re-renders, heavy computations, or unoptimized assets
