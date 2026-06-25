## Summary

Add dedicated verification flows for both clients and handymen, and route authentication into those flows.

This PR:
- moves client KYC screens into a dedicated `(verification)` route group
- adds a new client onboarding entry screen before KYC-lite
- adds a multi-step handyman onboarding flow with profile, services, document upload, and pending states
- updates auth entry and landing links to point to the new verification routes
- improves keyboard handling for login and client service request screens
- adds `expo-document-picker` and Android keyboard resize support for the new upload-heavy forms
- documents the screen layout and flex ownership rules in `skills.md`

Closes #

---

## Type of Change

- [x] ✨ New feature (non-breaking change that adds functionality)
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [x] ♻️ Refactor (no functional change; improves structure or readability)
- [x] 💄 UI / style change (layout, spacing, theming)
- [x] 🔧 Config / tooling (build, lint, CI, dependencies)
- [x] 📝 Documentation
- [ ] 🚨 Breaking change (fix or feature that causes existing functionality to change)

---

## Implementation Checklist

### Code Quality
- [ ] No TypeScript errors (`tsc --noEmit` passes in strict mode)
- [ ] No ESLint warnings or errors
- [x] Follows existing naming conventions (PascalCase components, camelCase hooks/utils)
- [x] No duplicated code — reused existing components/hooks where possible
- [x] No `console.log` or debug statements left in

### UI / Components
- [x] Follows the NativeWind + Tailwind design token system (`src/constants/theme.ts`)
- [ ] Responsive on both iOS and Android (tested on simulator/emulator)
- [ ] Empty states, loading states, and error states are handled
- [x] Uses existing shared components (`src/components/ui/`, `src/components/forms/`) where applicable

### Routing & Navigation
- [x] Route group is correct: `(auth)`, `(client)`, `(handyman)`, or `(admin)`
- [x] Navigation guards / redirect logic is correct for role
- [ ] Deep link or back-navigation behavior is verified

### Data & State
- [ ] Mock data updated in `src/mocks/` if new entity shape was introduced
- [ ] Types updated in `src/types/index.ts` for any new data structures
- [x] No hardcoded strings that should be constants or tokens

### Testing
- [ ] Manually tested the happy path on iOS
- [ ] Manually tested the happy path on Android
- [ ] Edge cases tested (empty data, long strings, network error state)

---

## Screenshots / Screen Recording

Attach screenshots or a short recording for:
- auth login keyboard behavior
- client onboarding and KYC-lite flow
- handyman onboarding steps: profile, services, documents, and pending review
- client request form keyboard behavior

| Before | After |
|--------|-------|
|        |       |

---

## How to Test

1. Run `npx expo start`.
2. Open the landing screen and verify the new links for `Auth Entry`, `Client Verification`, and `Handyman Verification`.
3. Open `/(auth)/login`, enter a valid email or a phone number with at least 10 digits plus a password, and verify `Continue` routes to `/(verification)/client/onboarding`.
4. Complete the client onboarding form and verify `Continue to KYC-lite` routes to `/(verification)/client/kyc-lite`.
5. Mark all KYC-lite requirements complete and verify `Finish and go to Home` remains disabled until all items are done.
6. Open `/(verification)/handyman/onboarding` and verify the profile, services, documents, and pending steps advance only when their validation rules are satisfied.
7. Use the handyman document upload controls and verify file picking works and the mock upload progress completes to 100%.
8. Open `/(client)/search`, focus the description field, and verify the footer CTA remains usable while the keyboard is open.

---

## Reviewer Notes

- Commit: `e655ab3`
- Added `expo-document-picker` for handyman document uploads.
- Added Android `softwareKeyboardLayoutMode: resize` in `app.json` to improve keyboard interaction with bottom actions.
- Focused diagnostics on the touched screens, verification routes, shared button, and onboarding hook returned no file-level errors.
- Full repo lint/typecheck was not run in this pass.

---

## Senior Review Checklist (for Reviewer)

- [x] No accidental duplication of existing components or utilities
- [x] Architectural decision is sound and consistent with existing patterns
- [x] No security concerns (no sensitive data logged, no unprotected routes)
- [x] Performance: no unnecessary re-renders, heavy computations, or unoptimized assets