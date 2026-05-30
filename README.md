# Oki App

## Development Guide

### Prerequisites

- Node.js (>=18)
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A physical iOS or Android device _or_ an emulator/simulator

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd oki-app

# Install dependencies
npm install   # or `yarn install`
```

### Running the app (development)

```bash
# Start the Expo development server
npx expo start
```

The command opens the Expo Developer Tools in your browser. From there you can:

- Press **w** to run the app in a web browser. (make sure you view in mobile mode for now)
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
