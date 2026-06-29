# Oki App — Agent Guide

React Native (Expo SDK 54) client app for a 3-sided handyman marketplace. UI prototype on mock data — no backend integration yet.

## Quick start

```bash
npm install              # uses npm (v11)
npm start                # expo start
npm run ios              # expo run:ios
npm run android          # expo run:android
npm run web              # expo start --web
npm run lint             # eslint + prettier --check
npm run format           # eslint --fix + prettier --write
npm run prebuild         # native dirs before first native build
```

## Verification commands (order independent, run in CI)

```sh
npm run type-check       # tsc --noEmit (strict mode)
npm run test:ci          # jest --ci (jest-expo preset)
npm test                 # jest (watch mode)
```

No test framework is configured. No CI/CD. No `.env` files.

## Architecture

- **Routing:** Expo Router (file-based) in `app/`. Entry: `expo-router/entry`.
- **Source:** `src/` — components, hooks, types, mocks, utils, constants, context.
- **Imports/Path alias:** `@/` → `src/*` (configured in tsconfig).
- **Types:** `src/types/index.ts` — all interfaces, enums, and type aliases.
- **Mock data:** `src/mocks/` — 11 files, barrel-exported from `index.ts`. App runs entirely on these.
- **Theming:** 3 color schemes (crimson default, teal, indigo). Use `useTheme().colors` for all brand colors. Never hardcode.
- **Dual Expo projects:** `my-expo-app/` is a leftover scaffold — ignore it.

## Key conventions (from `skills.md`)

| Concern | Rule |
|---|---|
| Styling | NativeWind `className` first; inline `style` only for dynamic/computed values |
| Colors | Always via `useTheme().colors` — never hardcode |
| Shadows | Inline `style` only (not expressible in NativeWind) |
| Page wrap | `SafeAreaView` from `react-native-safe-area-context` |
| Bottom inset | Owned by `BottomNav` inside tab shells; screens must not duplicate |
| Top inset | Owned by `Navbar` when used; don't add a second top inset |
| Interactive | `Pressable` (not `TouchableOpacity`) for new code |
| Modals | Shared `src/components/ui/Modal.tsx` component |
| Font classes | `font-sans` (Inter), `font-heading` (NunitoBold), etc. |

## Layout patterns

Standard page skeleton: `SafeAreaView → header band (rounded-b-3xl) → ScrollView` with negative `marginTop` for card overlap. For screen-critical height, use explicit `style={{ flex: 1 }}` on root chain. Fixed footers use flex layout (`ScrollView flex-1` + footer sibling) — never `absolute bottom-*`.

## Tailwind note

Both `tailwind.config.js` (v3) and `@tailwindcss/postcss` (v4) are present — transitional state. NativeWind preview works with v4. CSS theme variables in `global.css`.

## Reminders

- `App.tsx` is legacy; all routing lives in `app/`.
- `expo run:android` / `expo run:ios` require native builds (`npx expo prebuild` first if not yet run).
- `prettier.config.js` uses `prettier-plugin-tailwindcss` (class sorting). Run `npm run format` before committing.

## Build toolchain

NativeWind → PostCSS (`@tailwindcss/postcss`) → Metro (`withNativewind`) → Babel (`babel-preset-expo` + `react-native-worklets/plugin`)

## Config quirks

- `lightningcss` pinned to `1.30.1` in package.json overrides
- ESLint 9 flat config: `eslint.config.js` uses `defineConfig`/`require`, extends `eslint-config-expo/flat`
- Prettier: printWidth 100, singleQuote, bracketSameLine, trailingComma es5, `prettier-plugin-tailwindcss` sorts `className`
- TSConfig: `strict: true`, path alias `@/*` → `src/*`
- Jest: `jest-expo` preset, CSS files mocked, bare `components/` imports mapped

## Git hygiene

- Husky pre-commit runs `npx lint-staged` (ESLint fix + Prettier on staged ts/tsx, Prettier on json/css/md)
- CI runs lint, type-check, test in parallel on PR to main/master/develop

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

## Aspirational conventions (PR template references; not yet implemented)

- `src/constants/theme.ts` — design tokens
- `src/components/ui/` — shared UI primitives
- `src/mocks/` — mock data
- `src/types/index.ts` — shared types
- Route groups: `(auth)`, `(client)`, `(handyman)`, `(admin)`
