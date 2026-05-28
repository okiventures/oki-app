## Summary

<!-- Briefly describe what this PR does and why it's needed. Link to the relevant checklist item or issue. -->

Closes # <!-- issue/ticket number if applicable -->

---

## Type of Change

<!-- Check all that apply. -->

- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ♻️ Refactor (no functional change; improves structure or readability)
- [ ] 💄 UI / style change (layout, spacing, theming)
- [ ] 🔧 Config / tooling (build, lint, CI, dependencies)
- [ ] 📝 Documentation
- [ ] 🚨 Breaking change (fix or feature that causes existing functionality to change)

---

## Implementation Checklist

<!-- Tick off what applies to this PR. Remove sections that are not relevant. -->

### Code Quality
- [ ] No TypeScript errors (`tsc --noEmit` passes in strict mode)
- [ ] No ESLint warnings or errors
- [ ] Follows existing naming conventions (PascalCase components, camelCase hooks/utils)
- [ ] No duplicated code — reused existing components/hooks where possible
- [ ] No `console.log` or debug statements left in

### UI / Components
- [ ] Follows the NativeWind + Tailwind design token system (`src/constants/theme.ts`)
- [ ] Responsive on both iOS and Android (tested on simulator/emulator)
- [ ] Empty states, loading states, and error states are handled
- [ ] Uses existing shared components (`src/components/ui/`, `src/components/forms/`) where applicable

### Routing & Navigation
- [ ] Route group is correct: `(auth)`, `(client)`, `(handyman)`, or `(admin)`
- [ ] Navigation guards / redirect logic is correct for role
- [ ] Deep link or back-navigation behavior is verified

### Data & State
- [ ] Mock data updated in `src/mocks/` if new entity shape was introduced
- [ ] Types updated in `src/types/index.ts` for any new data structures
- [ ] No hardcoded strings that should be constants or tokens

### Testing
- [ ] Manually tested the happy path on iOS
- [ ] Manually tested the happy path on Android
- [ ] Edge cases tested (empty data, long strings, network error state)

---

## Screenshots / Screen Recording

<!-- Required for UI changes. Attach before/after screenshots or a short recording. -->

| Before | After |
|--------|-------|
|        |       |

---

## How to Test

<!-- Step-by-step instructions for a reviewer to reproduce and verify this change. -->

1. `npx expo start`
2. Navigate to `…`
3. Verify that `…`

---

## Reviewer Notes

<!-- Anything you want reviewers to pay special attention to, known limitations, or follow-up tasks. -->

---

## Senior Review Checklist (for Reviewer)

- [ ] No accidental duplication of existing components or utilities
- [ ] Architectural decision is sound and consistent with existing patterns
- [ ] No security concerns (no sensitive data logged, no unprotected routes)
- [ ] Performance: no unnecessary re-renders, heavy computations, or unoptimized assets
