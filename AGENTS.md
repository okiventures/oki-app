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
```

No test framework is configured. No CI/CD. No `.env` files.

## Architecture

- **Routing:** Expo Router (file-based) in `app/`. Entry: `expo-router/entry`.
- **Source:** `src/` — components, hooks, types, mocks, utils, constants, context.
- **Path alias:** `@/` → `src/*` (configured in tsconfig).
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
