# oki-app

Expo SDK 54 + React Native 0.81 + NativeWind (preview) + TypeScript strict.

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

- **Entry**: `expo-router/entry` (routes live under `app/`)
- **Components**: `components/` and `src/components/`
- **Imports**: `components/*` points to the root `components/` dir; TS alias `@/*` → `src/*`
- **Styles**: NativeWind via `className` string literals; styles defined as `const styles = {}` at component bottom
- **CSS**: `global.css` imports Tailwind v4 layers + NativeWind theme at app root

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
