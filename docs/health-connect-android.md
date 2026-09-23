# Android step-data test workflow

This project uses Expo SDK 57, `react-native-health-connect@4.1.3`, and a custom Android debug build. Expo Go cannot load this native module. No account or backend is involved.

## Phone and workstation

1. Install Android Studio with Android SDK Platform 36, SDK Build-Tools, and Platform-Tools. Make `adb` available on your terminal PATH. The project needs Android 8/API 26 or later.
2. On the Samsung, enable Developer options and USB debugging. Connect it by USB and accept the debugging authorization. Check with `adb devices`.
3. On Android 14+, Health Connect is built into Android. On Android 13 or older, install/update Health Connect from Google Play. Check that Health Connect itself displays today's step data; Samsung Health may need its own Health Connect sharing/sync enabled. Bream does not read Samsung Health directly.

## Build and launch

Run from the project root:

```sh
npm ci
npx expo run:android --device
```

`run:android` generates the native Android project from `app.json`, compiles a custom debug app, installs it on the selected device, and starts Metro. If the native app is already installed, start Metro with:

```sh
npx expo start --dev-client --host lan
```

Keep the Samsung and workstation on the same network. Rebuild after changing a native package or `app.json`; a JavaScript-only edit does not need another native build. The app ID is `com.bream.app`.

## Test in the app

Open Profile → Health Connect → Connecter. This is the only path that requests permission, and it requests only *read Steps*. Subsequent launches and foreground resumes check existing permission silently. Once connected, the Island HUD shows today's aggregate. The first real reading establishes a baseline without Energy reward. Later increases award 1 Energy for each full 10 newly eligible steps; smaller remainders carry forward even when the local day changes. Energy, XP and buildings remain saved. If the device has no steps today, the status shows “aucun pas disponible”.

For development, use Profile → Actualiser after walking and waiting for Health Connect to receive new data. Confirm that repeating refresh and restarting the app never re-credits the same steps. Android may batch sensor updates, so the Health Connect total may lag physical walking. Revoke permission in Android's Health Connect settings to test the permission-required state. Do not rely on Expo Go or a simulator to validate real step data.

No background collection is configured. Before Play Store distribution, the Health Connect privacy-policy/rationale destination and Play Console health-data declaration still need a production review.
