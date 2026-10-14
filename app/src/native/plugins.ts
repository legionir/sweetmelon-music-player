/**
 * -----------------------------------------------------------------------
 * PLUGIN WRAPPERS — the plugins of the core this app uses
 * -----------------------------------------------------------------------
 * Every call is written as `window.NativeSDK.<plugin>.<method>(...)`, because
 * `plugin_selection: mode auto` finds the plugins by scanning the built app
 * for exactly that text (`sweetmelon detect`). Keep the literals: no aliases,
 * no dynamic property access, or the plugin is left out of the build.
 *
 * Each helper degrades gracefully so the same bundle also runs in a browser.
 */
import { bridgeIsNative, type BridgeStatus, type BrowseResult, type PickedFile } from "./sdk";

/** `storage` plugin — JSON key-value store (SharedPreferences on the device). */
export async function storeGet<T>(key: string, fallback: T): Promise<T> {
  if (window.NativeSDK) {
    try {
      const value = await window.NativeSDK.storage.get(key);
      if (value !== null && value !== undefined) return value as T;
    } catch {
      /* plugin missing in this build: fall through to localStorage */
    }
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function storeSet(key: string, value: unknown): Promise<void> {
  if (window.NativeSDK) {
    try {
      await window.NativeSDK.storage.set(key, value);
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: nothing to do */
  }
}

/** `wake_lock` plugin — keep the screen on while a track plays. */
export async function setWakeLock(enabled: boolean): Promise<void> {
  if (!window.NativeSDK) return;
  try {
    if (enabled) await window.NativeSDK.wakeLock.enable();
    else await window.NativeSDK.wakeLock.disable();
  } catch {
    /* plugin missing in this build */
  }
}

/** `file_picker` plugin — import audio files from the device. */
export async function pickAudioFiles(): Promise<PickedFile[]> {
  if (!window.NativeSDK) return [];
  try {
    const result = await window.NativeSDK.filePicker.pickFiles({
      multiple: true,
      type: "audio",
    });
    return result?.files ?? [];
  } catch {
    return [];
  }
}

/** `back_button` plugin — Android back button as in-app navigation. */
export async function interceptBackButton(
  onPressed: () => void,
): Promise<() => void> {
  if (!window.NativeSDK) return () => {};
  try {
    await window.NativeSDK.backButton.enableIntercept();
    window.NativeSDK.on("backButton.pressed", onPressed);
    return () => {
      window.NativeSDK?.off("backButton.pressed", onPressed);
    };
  } catch {
    return () => {};
  }
}

/** `back_button` plugin — leave the app running in the background. */
export async function minimizeApp(): Promise<void> {
  if (!window.NativeSDK) return;
  try {
    await window.NativeSDK.backButton.minimizeApp();
  } catch {
    /* ignore */
  }
}

/** File types the player can play; the browser only lists these (and folders). */
export const AUDIO_EXTENSIONS = ["mp3", "m4a", "aac", "wav", "flac", "ogg", "oga", "opus", "wma", "amr", "mid"];

/** `permission` plugin — read access to the music on the device (Android 13+ and older). */
export async function requestAudioAccess(): Promise<void> {
  if (!window.NativeSDK) return;
  for (const name of ["audio", "storage"]) {
    try {
      await window.NativeSDK.permission.request(name);
    } catch {
      /* unknown on this OS version: the listing below shows what is readable */
    }
  }
}

/**
 * `file_system` plugin — one folder of the device's shared storage, read-only.
 * Pass "" for the storage roots. Throws with the plugin's message on failure.
 */
export async function browseStorage(path: string): Promise<BrowseResult> {
  if (!window.NativeSDK) throw new Error("Browsing files needs the Android/iOS build");
  return window.NativeSDK.fileSystem.browse(path, { extensions: AUDIO_EXTENSIONS });
}

/**
 * `safe_area` plugin — height of the status bar, as a CSS variable. The web
 * view draws under it, so without this the header sits behind the clock.
 */
export async function applySafeArea(): Promise<void> {
  if (!window.NativeSDK) return;
  try {
    const insets = await window.NativeSDK.safeArea.getInsets();
    const top = Math.round(insets?.padding?.top ?? 0);
    document.documentElement.style.setProperty("--safe-top", `${top > 0 ? top : 28}px`);
  } catch {
    document.documentElement.style.setProperty("--safe-top", "28px");
  }
}

export function bridgeStatus(): BridgeStatus {
  if (!bridgeIsNative()) {
    return {
      mode: "web",
      placeholder: typeof window !== "undefined" && Boolean(window.__SWEETMELON_SDK_PLACEHOLDER__),
    };
  }
  return { mode: "native", placeholder: false };
}
