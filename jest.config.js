// Manual Jest configuration — avoids @react-native/jest-preset's ESM/Flow type
// files that are incompatible with pnpm's strict CJS module resolution.
module.exports = {
  // Use babel-jest for TypeScript/JSX transformation (same as jest-expo)
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  // Must match jest-expo's transformIgnorePatterns (including .pnpm for pnpm)
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  // Minimal setup — our CJS-compatible file (no RN mocks needed for basic tests)
  setupFiles: ['<rootDir>/__tests__/jest-setup.cjs'],
  testPathIgnorePatterns: ['/__tests__/__mocks__/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/node_modules/**', '!**/dist/**'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '^components/(.*)$': '<rootDir>/components/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^https://esm.sh/@supabase/supabase-js@2\\.108\\.2$':
      '<rootDir>/__tests__/__mocks__/supabase-cdn.ts',
    '^https://deno.land/std@0\\.224\\.0/http/server\\.ts$':
      '<rootDir>/__tests__/__mocks__/deno-serve.ts',
  },
};
