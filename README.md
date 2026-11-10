# Quick Control

Quick Control is a small React Native app for changing Android media
volume when the phone's physical volume buttons are unavailable or difficult to
use. It provides in-app controls and Android Quick Settings tiles.

The app controls **media volume** (the volume used by music and other media),
not ringtone, alarm, or call volume.

## Features

- Read and adjust the current media volume from the app.
- Drag the in-app slider or use the Volume + and Volume - buttons.
- Use the **Volume Controller** Quick Settings tile to show Android's native
  media-volume UI without changing the current level.
- Use the **Restart** Quick Settings tile to open Android's system power menu.
  Choose Restart from that menu to confirm the restart.

> **Android limitation:** A regular app cannot directly shut down or restart a
> device. The Restart tile opens the system power menu for the user to confirm;
> it does not force a restart. The tile requires the app's Power Menu
> Accessibility Service to be enabled.

## Requirements

- Node.js `>= 22.11.0` and npm
- Android Studio with the Android SDK and a configured emulator, or a physical
  Android device
- A Java Development Kit compatible with the Android Gradle Plugin
- `make` if you want to use the Makefile shortcuts

For Android Studio, SDK, and device setup, follow the official
[React Native Android environment setup guide](https://reactnative.dev/docs/set-up-your-environment).

## Install dependencies

From the project root:

```sh
npm ci
```

## Run on Android

Start an Android emulator or connect a phone with USB debugging enabled. Install
the app dependencies, then run Metro and the Android app in separate terminals.

**Terminal 1 — start Metro:**

```sh
make metro
```

Equivalent command:

```sh
npm start
```

**Terminal 2 — build and install the debug app:**

```sh
make android
```

Equivalent command:

```sh
npm run android
```

The Android command builds and installs the app on the available emulator or
connected device. To check that a physical device is detected, run:

```sh
adb devices
```

## Add the Quick Settings tiles

After installing and opening the app at least once:

1. Swipe down from the top of the screen to open Quick Settings. Swipe down
   again if needed to expand the full tile panel.
2. Tap the pencil or **Edit** control. Its appearance and location vary by
   Android version and device manufacturer.
3. Find **Volume Controller** and **Restart** in the available tiles.
4. Drag each tile into the active Quick Settings area.

Tap **Volume Controller** to display the system media-volume controls. Tap
**Restart** to open the system power menu.

## Enable the Restart tile

Android requires the app's Accessibility Service for the Restart tile to request
the system power menu. Enable it once in Android Settings:

1. Open **Settings** on the phone.
2. Go to **Accessibility**.
3. Open the installed, downloaded, or enabled services list. The name varies by
   Android version and manufacturer.
4. Select **Quick Control Power Menu** and turn it on.
5. Review and accept Android's confirmation.

The service is used to request the system power menu. It does not directly
restart or power off the phone. If the service is disabled, tapping **Restart**
will take you to Accessibility settings.

## Build a release APK

From the project root, run:

```sh
make release
```

This runs `./gradlew assembleRelease` from the `android/` directory. To remove
Android build outputs and perform a clean rebuild, run:

```sh
make clean
make release
```

Equivalent direct commands are:

```sh
cd android
./gradlew clean
./gradlew assembleRelease
```

The APK is generated at:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Release builds have R8 code shrinking and resource shrinking enabled. The
current Gradle configuration signs the release with the debug signing
configuration for local testing. Before publishing or distributing an APK,
configure a private production signing key as described in the
[React Native signed APK guide](https://reactnative.dev/docs/signed-apk-android).
Never commit a private signing key or its passwords.

## Checks

Run the existing lint and test commands from the project root:

```sh
npm run lint
npm test -- --watchAll=false
```

To run the TypeScript compiler without emitting files:

```sh
npx tsc --noEmit
```

## Project layout

- `App.tsx` — React Native media-volume screen.
- `android/app/src/main/java/com/volumecontroller/` — Android Quick Settings
  tile and Accessibility Service implementations.
- `android/app/src/main/AndroidManifest.xml` — Android activity, tile, and
  Accessibility Service declarations.
- `android/app/src/main/res/drawable/` — Quick Settings tile icons.
- `Makefile` — `make metro`, `make android`, `make clean`, and `make release`
  shortcuts.

## iOS

The repository includes an iOS project, but the Quick Settings tiles and power
menu flow described here are Android-only features. The app's native volume
behavior and tile setup should be tested on Android.
