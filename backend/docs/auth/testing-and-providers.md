# Oki App — Auth: Testing & Provider Setup (Twilio · Resend · Google)

> **Audience:** developers and QA engineers onboarding to the Oki app.
> **Scope:** how to run the automated auth tests, and how to enable + manually test
> authentication that depends on third-party providers — **SMS OTP (Twilio)** and
> **email OTP / confirmations (Resend)** — plus Google OAuth.

---

## 1. Auth flows at a glance

| Flow | Method(s) in `src/services/authService.ts` | Provider | Screen(s) |
| ------ | --------------------------------------------- | ---------- | ----------- |
| Email + password login / signup | `login` / `signup` | Supabase (built-in) | `app/(auth)/login.tsx`, `signup-*.tsx` |
| Phone + password login / signup | `login` / `signup` | Supabase (built-in) | `app/(auth)/login.tsx`, `signup-client.tsx` |
| Email OTP (magic code) | `sendEmailOtp` → `verifyOtp` | **Resend** (SMTP) | `app/(auth)/otp-verify.tsx` |
| SMS OTP | `sendPhoneOtp` → `verifyOtp` | **Twilio** | `app/(auth)/otp-verify.tsx` |
| Google OAuth (PKCE) | `signInWithGoogle` | Google | `app/(auth)/login.tsx` |
| Password reset | `requestPasswordReset` / `confirmPasswordReset` | Resend (SMTP) | `app/(auth)/forgot-password.tsx`, `reset-password.tsx` |
| Logout | `logout` | Supabase | all profile screens |

The client uses `@supabase/supabase-js` (`src/lib/supabase.ts`). OTP delivery only
works once the corresponding provider is configured — see sections 4 (Resend) and 5 (Twilio).

---

## 2. Running the automated tests

Auth logic is unit-tested with **Jest** (`jest-expo` preset). **No Supabase instance and
no Twilio/Resend credentials are required** — `@supabase/supabase-js` is fully mocked.

### Commands

```bash
# Install once
npm install            # or: pnpm install

# Run the whole suite (CI mode)
npm run test:ci

# Run tests in watch mode (dev)
npm test

# Run ONLY the auth service tests
npx jest __tests__/services/authService.test.ts --ci

# Also run the static checks (part of CI)
npm run type-check     # tsc --noEmit
npm run lint           # eslint + prettier
```

### What the auth tests cover (`__tests__/services/authService.test.ts`)

- `signup` — email & phone variants, session returned, profile row created, error path
  (e.g. "Email taken").
- `login` — email & phone variants, missing-session error, invalid-credentials error.
- `sendEmailOtp` / `sendPhoneOtp` — resolves on success, throws on provider errors.
- `verifyOtp` — email token, SMS token, missing identifier guard, error paths.
- `signInWithGoogle` — calls `signInWithOAuth` with `redirectTo: oki://login`, opens the
  browser session, exchanges the PKCE code, and rejects on failures.
- `requestPasswordReset` / `confirmPasswordReset` — deep-link redirect and token-hash flow.

### How the mock works

`__tests__/__mocks__/supabase.ts` exports `createMockSupabase()`, a fake client whose
`auth.*` methods are `jest.fn()`s. `authService.test.ts` mocks `src/lib/supabase` with a
custom fake and asserts on the calls (e.g. that `verifyOtp` is called with
`{ email, token, type: 'email' }`).

> **Tip for QA:** the automated suite validates logic, not real delivery. To test actual
> OTP delivery (email arrives, SMS arrives), follow the manual scripts in sections 4–6.

---

## 3. Prerequisites for manual / QA testing

1. **Docker Desktop** running (required for the local Supabase backend).
2. **Start the local backend:**

   ```bash
   npx supabase start        # applies migrations + seed, prints API URL & keys
   npx supabase status       # view credentials (anon key, service-role, etc.)
   ```

3. **Environment:** copy `.env.example` to `.env` (local defaults work out of the box).
   Provider credentials are **not** stored in `.env` — see `.env.example` and
   `supabase/config.toml` for where each value goes.
4. **Run the app:**

   ```bash
   npm start                 # Expo dev server
   # then open on a device/emulator, or: npm run web
   ```

5. **Authenticate as the right role:** use `app/(auth)/auth-client.tsx` (client),
   `auth-handyman.tsx` (handyman) or `auth-admin.tsx` (admin) to reach the login screens.

> Some provider config only takes effect after restarting the local backend:
>
> ```bash
> npx supabase stop && npx supabase start
> ```

---

## 4. Resend — Email OTP & confirmations

Resend is used for **email OTP codes**, **signup confirmation emails**, and **password
reset links** via SMTP.

### 4.1 Get the credentials

1. Create a [Resend](https://resend.com) account.
2. **API Keys → Create API Key** → copy the key (starts with `re_`).
3. For testing, the sandbox sender `onboarding@resend.dev` is enough. For real email,
   verify your own domain in Resend and use an address on that domain.

### 4.2 Option A — Local dev (`supabase/config.toml`)

Uncomment and fill:

```toml
[auth.email]
enable_signup = true
enable_confirmations = true

[auth.email.smtp]
host = "smtp.resend.com"
port = 465
user = "resend"
pass = "re_xxxxxxxx"            # your Resend API key
sender_name = "Oki"
sender_email = "onboarding@resend.dev"
```

Then restart Supabase (section 3, step 5).

### 4.3 Option B — Remote project (Supabase Dashboard)

1. **Authentication → Email → SMTP** → choose the **Resend** provider.
2. Fill in the same values as above (host `smtp.resend.com`, port `465`, user `resend`,
   pass = Resend API key, sender).
3. Turn **Confirm email** ON (and "Secure email change" as desired).

### 4.4 QA script — Email OTP

1. Open the client login screen (`auth-client.tsx` → `login.tsx`).
2. Tap **"Send me an email code"**, enter a real inbox address.
3. Check the inbox (or Resend Dashboard → **Emails** → logs) for the 6-digit code.
4. Enter the code on `otp-verify.tsx` → expect a session (app stays logged in).
5. Repeat with a **wrong code** → expect a clear error and no session.
6. If email confirmations are on, repeat signup and confirm via the emailed link.

---

## 5. Twilio — SMS OTP

Twilio powers **SMS OTP** ("Send me an SMS code").

### 5.1 Get the credentials

1. Create a [Twilio](https://twilio.com) account.
2. **Account Info** → copy **Account SID** (`AC...`) and **Auth Token**.
3. **Messaging → Services → Create a Messaging Service** → copy the **Message Service SID**
   (`MG...`).
4. **Trial accounts:** Twilio only delivers SMS to **verified recipient numbers** — add the
   test phone(s) under **Verified Caller IDs** in the console. You also need a Twilio
   phone number to send from.

### 5.2 Option A — Local dev (`supabase/config.toml`)

```toml
[auth.sms]
enable_signup = true
enable_confirmations = false

[auth.sms.twilio]
enabled = true
account_sid = "ACxxxxxxxx"
message_service_sid = "MGxxxxxxxx"
auth_token = "your_auth_token"
```

Restart Supabase after editing.

### 5.3 Option B — Remote project (Supabase Dashboard)

**Authentication → Providers → Phone** → choose **Twilio** → fill Account SID, Auth Token,
Message Service SID, and set the max OTP frequency as needed.

### 5.4 QA script — SMS OTP

1. Open the client login screen.
2. Tap **"Send me an SMS code"**, enter the phone in **E.164** format, e.g. `+639171234567`
   (the app also accepts a local `09…` format, but Twilio needs E.164 to deliver).
3. SMS arrives (check Twilio Console → **Logs**) with the 6-digit code.
4. Enter the code on `otp-verify.tsx` → expect a session.
5. Test the **wrong code** path and (if set) the **resend / cooldown** behavior.

> If you don't have Twilio SMS credits, `supabase start` can still be used to develop
> against the app, but OTP **delivery** requires a configured provider.

---

## 6. Google OAuth

- **Local (`supabase/config.toml`):**

  ```toml
  [auth.external.google]
  enabled = true
  client_id = "xxxx.apps.googleusercontent.com"
  secret = "GOCSPX-xxxx"
  redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
  ```

- **Remote (Dashboard):** **Authentication → Providers → Google** → Client ID + Secret.
- The app uses **PKCE** via `expo-web-browser` and deep-links back to `oki://login`.

### QA script — Google

1. On `login.tsx`, tap **"Continue with Google"**.
2. Complete the Google consent screen.
3. Expect redirect back into the app (`oki://login`) and a persisted session.
4. Test on a **physical device** — OAuth redirects can be unreliable on some web previews.

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
| --------- | -------------------- |
| Email OTP never arrives | Resend SMTP not configured / wrong `pass`; `enable_confirmations` off; check Resend Dashboard → Emails logs; sandbox sender only sends to your own inbox |
| SMS OTP never arrives | Twilio not configured; recipient not verified (trial account); wrong/`09…` phone format — use E.164; check Twilio Console → Logs |
| "Provider not enabled" on Google | `[auth.external.google]` / Dashboard provider disabled |
| Deep link `oki://…` doesn't open | Scheme not registered on the device; test on a physical device; confirm `additional_redirect_urls` includes `oki://login` |
| OTP rejected immediately | Code expired (default 5 min) or max frequency hit — resend and retry |
| `supabase start` / `db push` errors | Docker not running; run `npx supabase status`; pull fresh migrations with `npx supabase db reset` |
| Auth tests fail locally | Run `npm install` first; ensure `__tests__/__mocks__/supabase.ts` is present (mocked — no creds needed) |

---

## 8. QA sign-off checklist

- [ ] Email + password login (client, handyman, admin)
- [ ] Phone + password login
- [ ] Email OTP happy path (Resend) + wrong-code + expired-code paths
- [ ] SMS OTP happy path (Twilio) + wrong-code path
- [ ] Signup confirmation email (if confirmations enabled)
- [ ] Google OAuth sign-in + redirect back into app
- [ ] Forgot password → email link → set new password → session works
- [ ] Logout clears the session
- [ ] `npm run test:ci` and `npm run type-check` pass

---

## Related files

| File | Purpose |
| ------ | --------- |
| `src/services/authService.ts` | All auth calls (signup/login/OTP/Google/reset) |
| `src/context/AuthContext.tsx` | Session state, exposes auth actions to screens |
| `app/(auth)/*.tsx` | Login, OTP, forgot/reset, signup, confirm screens |
| `__tests__/services/authService.test.ts` | Unit tests for the auth service |
| `__tests__/__mocks__/supabase.ts` | Mock Supabase client used by tests |
| `supabase/config.toml` | Local provider config (commented sections) |
| `.env.example` | Documents where each credential lives |
