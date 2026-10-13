# sweetmelon-music-player

Music player app built with [Sweetmelon](https://github.com/legionir/sweetmelon)
core v2.4.0, scaffolded from
[sweetmelon-app-template](https://github.com/legionir/sweetmelon-app-template).

- `www/` your app (HTML, CSS, JavaScript)
- `sweetmelon.yaml` names, core version and plugin selection
- `.github/workflows/build.yml` Actions tab, "Build app": pick the package name,
  app name and APK / AAB / iOS, then run

Plugins follow the code: a plugin is on when `www/` calls it. The current
starter code uses `storage` (open counter) and `toast`.

## Build

Actions tab → **Build app** → *Run workflow*: set the package name, Dart package
name and app name (leave empty to use `sweetmelon.yaml`), choose APK / AAB / iOS.

Signing with your own key needs `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`,
`KEY_ALIAS` and `KEY_PASSWORD` repository secrets; without them builds are
signed with a throw-away key, which is fine for testing but not for the store.

## Next steps

Playback would come from the core's `audio` / `media_manager` plugins: call them
from `www/js/main.js` and `plugin_selection: auto` switches them on at build
time. `application_id` is still `com.example.*` — change it in `sweetmelon.yaml`
(or with `sweetmelon rename`) before publishing.
