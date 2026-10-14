# sweetmelon-music-player

A music player app for the [Sweetmelon](https://github.com/legionir/sweetmelon)
core **v2.5.0**. The UI comes from the *Modern Music Player* React template, the
project structure from
[sweetmelon-app-template](https://github.com/legionir/sweetmelon-app-template),
and playback, storage and the rest of the device side go through the core's
plugins.

```
app/                     the web app (React + TypeScript + Vite + Tailwind)
  index.html             entry point, loads js/native-sdk.js + src/main.tsx
  public/js/native-sdk.js  dev placeholder; a build replaces it with the core SDK
  src/native/            everything that talks to the bridge
    sdk.ts               types + readiness of window.NativeSDK
    plugins.ts           wake_lock, file_picker, back_button, storage helpers
    engine.ts            playback engines: audio plugin (device) / <audio> (browser)
    notify.ts            toast, haptic, share with browser fallbacks
  src/data/              catalogue, imported files, stored preferences
  src/context/PlayerContext.tsx   queue, transport, likes, persistence
www/                     the built app the Sweetmelon action packages (npm run build)
tool/detect-check.mjs    plugin report for the built app (Node port of `sweetmelon detect`)
tool/playground/         simulated bridge, for trying the native paths in a browser
sweetmelon.yaml          core version, names, icon, plugin selection
icon.png                 1024 px app icon
.github/workflows/build.yml  Actions tab → "Build app" → APK / AAB / iOS
```

## How the app uses the core

`plugin_selection.mode` is `auto`: a build scans `www/` and switches on the
plugins it finds. These are the ones the app calls:

| Plugin (`sweetmelon.yaml` key) | Calls in the app | Used for |
| --- | --- | --- |
| `audio` | `NativeSDK.audio.play/pause/resume/stop/seek/setVolume/getPosition/getDuration`, events `audio.position`, `audio.playerState` | playback of the demo catalogue and of imported files |
| `storage` | `NativeSDK.storage.get/set` | likes, queue, shuffle/repeat, volume, last position (resumes where you left off) |
| `wake_lock` | `NativeSDK.wakeLock.enable/disable` | screen stays on while a track plays |
| `share` | `NativeSDK.share.shareText` | Share button on the Now Playing screen |
| `file_picker` | `NativeSDK.filePicker.pickFiles` | Import button: adds audio files from the device to "On this device" |
| `back_button` | `NativeSDK.backButton.enableIntercept/minimizeApp`, event `backButton.pressed` | back closes the queue drawer, then the Explorer; from the library it minimises the app so playback keeps going |
| `toast` | `NativeSDK.toast.show` | short confirmations |
| `haptic` | `NativeSDK.haptic.lightImpact` | a tap when liking or queueing |

`www/js/native-sdk.js` is injected by the build, so `window.NativeSDK` only
exists inside a Sweetmelon app. Without it (browser, `npm run dev`) the app runs
in **web mode**: an `<audio>` element plays, preferences go to `localStorage`
and toasts are drawn in-app. The status chip in the header shows which mode is
active.

Playback is driven through one seam — `src/native/engine.ts` — so the UI never
touches a player directly:

```
PlayerContext ──► PlaybackEngine ──► NativeSDK.audio.*   (device)
                       └───────────► <audio> element     (browser)
```

## Develop in a browser

```bash
npm install
npm run dev          # http://localhost:5173, web mode (placeholder SDK)
npm run playground   # builds with tool/playground's simulated bridge and serves it
```

`npm run playground` runs the app as if the plugins were there: playback goes
through the `audio` calls, positions arrive as events, preferences land per key,
the status chip says "native core", and `filePicker` really opens a file dialog.
Every bridge call is logged as `[bridge] audio.play {...}` in the console.

## Build the app

Actions tab → **Build app** → *Run workflow*: set the package name, Dart package
name and app name (empty keeps `sweetmelon.yaml`), tick APK / AAB / iOS. The job
installs the JS toolchain, builds `app/` into `www/`, and hands it to
[`legionir/sweetmelon@v2.5.0`](https://github.com/legionir/sweetmelon).

Signing with your own key needs `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`,
`KEY_ALIAS` and `KEY_PASSWORD` repository secrets; without them builds are
signed with a throw-away key, which is fine for testing but not for the store.

Locally, in a checkout of the core:

```bash
npm ci && npm run build && npm run detect   # this repository
dart run bin/sweetmelon.dart prepare --www <path>/www --apply
flutter build apk
```

`npm run detect` prints the plugins it found in the built app and the
`plugin_selection.include` list for them. `sweetmelon.yaml` pins that list, so a
scan that cannot resolve a call can never silently drop playback.

## Verify

```bash
npm run typecheck   # TypeScript
npm run detect      # plugin report for www/ (same rules as sweetmelon detect)
npm run smoke       # boots the built app in a DOM with the simulated bridge:
                    # 11 checks — mount, audio.play, storage, wake lock, haptic
npm run smoke:web   # the same app in web mode: 9 checks — <audio>, local storage
```

`npm run smoke` is the end-to-end guard that the plugin wiring still works, and
it runs in the build workflow before the Android/iOS build.

## Known limits

- Lock-screen / notification controls and media buttons are not wired up yet:
  the core's `notification` plugin is unused, and file imports are stored by
  path, not deleted when you remove them from the library.
- The demo catalogue streams from `soundhelix.com`, so it needs a connection.
  Imported files play offline through the `audio` plugin.
- Imported tracks show `--:--` until the engine reports the real duration on
  their first play.
- `application_id` is still `com.example.*`; change it in `sweetmelon.yaml` (or
  with `sweetmelon rename`) before publishing.
