# Oki App

## Development Guide

### Prerequisites

- **Node.js** (>=18)
- **npm** (v11+) or **pnpm** (workspaces enabled)
- **Docker Desktop** (Required for running local Supabase containers)
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) (ensure it's running before launching Supabase)
- **Expo CLI** (Installed automatically via npm/pnpm commands)
- A physical iOS or Android device _or_ an emulator/simulator

### Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd oki-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   The `.env.example` file is pre-configured with default credentials for the local Supabase environment (e.g., `http://127.0.0.1:54321` and the standard local anon key), so it should work out of the box.

4. **Start the Local Backend (Supabase):**
   Make sure **Docker Desktop** is open and running, then execute:
   ```bash
   npx supabase start
   ```
   _Note: This uses the project's pinned version of the Supabase CLI (`^2.108.0`), avoiding version mismatches. It will spin up PostgreSQL, GoTrue, Realtime, Storage, and run all migrations in `./supabase/migrations/` sequentially, and then apply seed data from `./supabase/seed.sql`._

---

### Local Backend Management

Here are useful commands for working with the local Supabase instance:

- **Show Status & API Credentials:**

  ```bash
  npx supabase status
  ```

  This will print your API URL, GraphQL URL, DB URL, and keys (anon, service_role).

- **Stop the Local Database:**

  ```bash
  npx supabase stop
  ```

  Stops the containers without deleting database data.

- **Syncing Local Database (When pulling from `dev`):**
  When other developers add new migrations and you pull changes, run:
  ```bash
  npx supabase db reset
  ```
  This command drops the local database, recreates it from scratch, applies all migrations in the correct order, and re-seeds it. This ensures your local database is completely in sync with the repository.

---

### Running the app (development)

```bash
# Start the Expo development server
npx expo start
```

The command opens the Expo Developer Tools in your terminal. From there you can:

- Press **w** to run the app in a web browser. (make sure you view in mobile view for now)
- Press **i** to launch the iOS simulator (macOS only).
- Press **a** to launch the Android emulator.
- Scan the QR code with the **Expo Go** app on a physical device.

### Running on a mobile device with Expo Go

1. Install the **Expo Go** app from the App Store (iOS) or Google Play Store (Android).
2. Ensure your phone is on the same local network as your computer.
3. Run `npx expo start` as shown above.
4. In the Expo DevTools, you will see a QR code. Open **Expo Go** on your phone and scan the QR code.
5. The app will load and refresh automatically as you make changes.

### Building the native app (optional)

If you need a standalone build you can run:

```bash
npx expo prebuild   # generates native iOS/Android project files
npx expo run:ios    # builds and runs on iOS simulator/device
npx expo run:android# builds and runs on Android emulator/device
```

---

For more detailed information, see the `App_Development_Guide.md` file in this repository.
