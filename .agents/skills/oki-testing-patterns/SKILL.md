---
name: oki-testing-patterns
description: 'Use when writing or debugging tests in the Oki App. Triggers: creating new test files, fixing failing tests, adding test coverage, mocking Supabase or Deno modules, testing React Native components, testing edge functions, or modifying Jest configuration.'
metadata:
  author: oki-app
  version: '1.0.0'
---

# Oki Testing Patterns

## Test Infrastructure

- **Jest** configured via `jest.config.js` (manual config, avoids `@react-native/jest-preset` ESM issues with pnpm)
- **Transform**: `babel-jest` for `.ts`/`.tsx`/`.js`/`.jsx`
- **Setup**: `__tests__/jest-setup.cjs` — provides CJS-compatible React Native mocks (TurboModules, Dimensions, UIManager, etc.)
- **CSS mock**: `__mocks__/styleMock.js`
- **Path aliases**: `@/*` → `src/*`, `components/*` → `components/*`
- **Run**: `npm test` (watch), `npm run test:ci` (CI)

### Module Name Mapper (for Supabase/Deno CDN imports in edge functions)

```js
'^https://esm.sh/@supabase/supabase-js@2\\.108\\.2$': '<rootDir>/__tests__/__mocks__/supabase-cdn.ts',
'^https://deno.land/std@0\\.224\\.0/http/server\\.ts$': '<rootDir>/__tests__/__mocks__/deno-serve.ts',
```

---

## Test File Organization

```
__tests__/
├── jest-setup.cjs              # Global setup (RN mocks, TurboModules)
├── App.test.tsx                # Basic app render test
├── __mocks__/                  # Shared mock modules
│   ├── supabase-cdn.ts         # Mocks Supabase CDN imports
│   ├── deno-serve.ts           # Mocks Deno serve() for edge functions
│   └── deno-timing-safe-equal.ts
├── services/                   # Tests for src/services/
│   ├── authService.test.ts
│   ├── bookingService.test.ts
│   ├── profileService.test.ts
│   └── rbac.test.ts
└── functions/                  # Tests for supabase/functions/
    ├── accept-booking.test.ts
    ├── complete-booking.test.ts
    ├── cancel-booking.test.ts
    ├── reject-booking.test.ts
    ├── handyman-status.test.ts
    ├── rbac.test.ts
    ├── submit-onboarding.test.ts
    ├── kyc-upload.test.ts
    ├── kyc-admin-review.test.ts
    ├── kyc-admin-list.test.ts
    ├── kyc-admin-bulk-review.test.ts
    └── payment-webhook.test.ts
```

New test files go in `__tests__/services/` for frontend services, `__tests__/functions/` for edge functions, or root `__tests__/` for component/e2e tests.

---

## Pattern 1: Service Tests (Frontend)

### Mocking Supabase Client

Always mock the `supabase` import at the top of the file:

```ts
import { supabase } from '../../src/lib/supabase';

jest.mock('../../src/lib/supabase', () => {
  const auth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    // ... add only the methods you need
  };

  const from = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  });

  return { supabase: { auth, from } };
});
```

### Resetting Between Tests

Each test gets a fresh mock chain:

```ts
beforeEach(() => {
  jest.clearAllMocks();
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
});
```

### Test Structure

```ts
describe('functionName', () => {
  it('returns expected result on success', async () => {
    // Arrange: set up mock return values
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'at', ... } },
      error: null,
    });

    // Act
    const result = await login({ email: 'test@oki.test', password: 'Test@123' });

    // Assert
    expect(result.accessToken).toBe('at');
  });

  it('throws on error', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    await expect(login({ email: 'test@oki.test', password: 'wrong' })).rejects.toThrow('Invalid credentials');
  });
});
```

### Testing Multiple DB Tables

When a function queries multiple tables (e.g., `users` and `handymen`), use `mockImplementation` with a switch:

```ts
(supabase.from as jest.Mock).mockImplementation((table: string) => {
  if (table === 'users') return { select: ..., eq: ..., maybeSingle: userMock };
  if (table === 'handymen') return { select: ..., eq: ..., maybeSingle: handymanMock };
  return defaultChain;
});
```

---

## Pattern 2: Edge Function Tests

### Setting Up Deno Mocks

The `deno-serve` mock (`__tests__/__mocks__/deno-serve.ts`) captures the request handler. Import the function module to trigger `serve()`:

```ts
import { __getHandler } from '../__mocks__/deno-serve';
import '../../supabase/functions/accept-booking/index'; // triggers serve()
```

### Mocking RBAC Middleware

```ts
jest.mock('../../supabase/functions/_shared/rbac', () => {
  const resp = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  return {
    requireHandyman: jest.fn(),
    requireClient: jest.fn(),
    requireAdmin: jest.fn(),
    methodNotAllowed: jest.fn(() => resp(405, { error: 'METHOD_NOT_ALLOWED' })),
    badRequest: jest.fn((m: string) => resp(400, { error: 'BAD_REQUEST', message: m })),
    notFound: jest.fn((m: string) => resp(404, { error: 'NOT_FOUND', message: m })),
    ok: jest.fn(<T>(d: T) => resp(200, { data: d })),
    internalError: jest.fn((m: string) => resp(500, { error: 'INTERNAL_ERROR', message: m })),
  };
});
```

### Building Supabase Mock Chains

```ts
type MockChain = {
  select: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
};

function mockFrom(_table: string, overrides?: Partial<MockChain>): MockChain {
  const chain: MockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}
```

### Creating Requests and Calling Handlers

```ts
function makeReq(body: unknown): Request {
  return new Request('http://localhost/accept-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function callHandler(req: Request): Promise<Response> {
  const handler = __getHandler();
  if (!handler) throw new Error('No handler captured');
  return Promise.resolve(handler(req));
}
```

### Test Categories for Edge Functions

Organize tests in this order:
1. **Module loading** — verify `__getHandler()` is not null
2. **Method check** — 405 for wrong HTTP methods
3. **Auth guards** — RBAC middleware returns 401/403
4. **Request validation** — missing/invalid body fields
5. **Resource existence** — 404 when record not found
6. **Guard conditions** — each business rule gets a test
7. **Optimistic locking / race conditions** — concurrent update conflicts
8. **Audit event logging** — `booking_events` insert success/failure
9. **Success path** — full happy-path test

---

## Pattern 3: Component Tests (React Native)

### Setup Requirements

To test a React Native component that uses NativeWind and the theme context:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/context/ThemeContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
```

The `jest-setup.cjs` already provides:
- TurboModule mocks (SafeAreaProvider, SourceCode)
- Dimensions mock (390x844 window)
- UIManager, Text, useColorScheme, Vibration mocks
- `requestAnimationFrame` / `cancelAnimationFrame` shims

### Component Test Template

```tsx
describe('ComponentName', () => {
  it('renders without crashing', () => {
    const { getByText } = renderWithProviders(<ComponentName />);
    expect(getByText('Expected Text')).toBeTruthy();
  });

  it('fires onPress callback', () => {
    const onPress = jest.fn();
    const { getByText } = renderWithProviders(<ComponentName onPress={onPress} />);
    fireEvent.press(getByText('Press Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

### Common Gotchas

- **`window` not defined**: Ensure `jest-setup.cjs` sets `global.window = global`
- **NativeWind classes not resolving**: CSS class names are mocked by `__mocks__/styleMock.js`. Component tests verify structure, not visual output.
- **Theme colors in assertions**: When asserting on style props, use `expect(component.props.style).toMatchObject({ ... })` — theme colors are resolved at render time.
- **Navigation mocks**: Use `jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }))` for screens that use routing.

---

## Verification Commands

```bash
npm test                 # Watch mode
npm run test:ci          # Single run (CI)
npm run lint             # ESLint + Prettier check (runs in CI parallel to tests)
npm run type-check       # TypeScript strict mode (runs in CI parallel to tests)
```

Always run `npm run test:ci` before committing test changes. Tests, lint, and type-check run in parallel in CI — failures in any job block the PR.

---

## Coverage

Coverage is collected from all `.ts`/`.tsx` files (excluding `node_modules` and `dist`):

```js
collectCoverageFrom: ['**/*.{ts,tsx}', '!**/node_modules/**', '!**/dist/**']
```

No coverage thresholds are currently enforced.
