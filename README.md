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
- `curl` for retrying an unpublished release tag
- GitHub CLI (`gh`), authenticated with repository access, to start a new
  production release using `make git-release`

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

## Build a local release APK

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

Release builds have R8 code shrinking and resource shrinking enabled. Without
release-signing environment variables, the local APK uses the debug keystore
so it can be installed for testing; do not distribute it. Configure a private
release keystore for a distributable APK. Never commit a private signing key
or its passwords.

## GitHub Actions and versioned releases

GitHub Actions runs tests, ESLint, TypeScript checks, and an Android debug build
for pull requests and pushes to `main`. `make release` only builds a local APK;
it does not change versions, create a tag, push code, or publish a GitHub
Release.

### Preview the next production version

The version is read from `package.json`. Version bumps follow SemVer:

- `patch`: `1.2.3` → `1.2.4` (backward-compatible fixes)
- `minor`: `1.2.3` → `1.3.0` (backward-compatible features)
- `major`: `1.2.3` → `2.0.0` (breaking changes)

Preview a bump; this command does not edit files or Git refs:

```sh
make git-release-preview BUMP=patch
make git-release-preview BUMP=minor
make git-release-preview BUMP=major
```

### Create a production GitHub release

After merging the intended changes to `main`, choose the bump type and run:

```sh
make git-release BUMP=patch
make git-release BUMP=minor
make git-release BUMP=major
```

`BUMP` defaults to `patch`. This command uses the authenticated GitHub CLI to
dispatch the production workflow on `main`; it does not create a local tag or
edit the local working tree. In the workflow, version files are prepared in an
isolated runner, checks are run, and the signed optimized APK is built first.
Only after that succeeds does the workflow commit the version changes, create
the annotated `vMAJOR.MINOR.PATCH` tag, push the commit and tag atomically, and
attach the APK to a GitHub Release. A test, signing, or build failure before
that point leaves `main` and its version tags unchanged. The workflow refuses
to release from a stale `main` commit or to reuse a version tag.

Pushing a `vMAJOR.MINOR.PATCH` tag directly also builds and publishes that
existing version. This is useful for retrying an unpublished release after a
workflow-only fix has been committed to `main`; the tag must point to a commit
on `main` and its version must match `package.json`.

To retry a failed tag that has no published GitHub Release, first commit and
push the workflow fix to `main`, then run:

```sh
make retry-release
```

By default, this retries the tag matching the version in `package.json`. To
specify a different tag explicitly, use `make retry-release TAG=v0.0.2`. The
command requires the current branch to be `main`, fetches the latest
`origin/main`, checks the tag against the version in that remote branch, and
refuses to retag if a GitHub Release already exists. It does not require a clean
local working tree or a local branch synchronized with GitHub; local edits are
left untouched and the tag is moved specifically to `origin/main`. The push
uses `--force-with-lease` so a concurrent remote tag change is not overwritten.
The release-existence check uses `curl` and the GitHub REST API, so the GitHub
CLI is not needed for retries. Set `GITHUB_TOKEN` if the repository is private
or API authentication is required. The tag push reruns the release workflow.
Never use it to replace a tag for a release that has already been published or
distributed.

Configure all four repository Actions secrets before running
`make git-release`: `ANDROID_KEYSTORE_BASE64` (base64-encoded keystore),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`.
The signing key and passwords must remain private.

If a tag's build failed and no GitHub Release was published, do not create a
new version just to retry. Once the workflow fix is on `main`, the unpublished
tag can be moved to that fixed commit and pushed again to rerun the build.
Only do this when no release has been distributed; tags for published releases
should be treated as immutable.

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
- `.github/workflows/android-ci.yml` and `android-release.yml` — continuous
  checks and tag-triggered Android release automation.
- `scripts/release.js` — guarded semantic-version bump and Git tag workflow.
- `Makefile` — `make release` for a local APK and `make git-release` for a
  versioned production GitHub release; `make retry-release TAG=...` retries an
  unpublished failed release.

## iOS

The repository includes an iOS project, but the Quick Settings tiles and power
menu flow described here are Android-only features. The app's native volume
behavior and tile setup should be tested on Android.
