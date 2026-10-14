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
import { bridgeIsNative, type BridgeStatus, type BrowseResult } from "./sdk";

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

export interface AudioAccess {
  granted: boolean;
  /** The system will not ask again: only the app settings can change it. */
  permanentlyDenied: boolean;
}

/**
 * `permission` plugin — read access to the music on the device. Android 13+
 * asks for "music and audio", older versions for "storage": either one is enough.
 */
export async function requestAudioAccess(): Promise<AudioAccess> {
  const access: AudioAccess = { granted: false, permanentlyDenied: false };
  if (!window.NativeSDK) return access;
  for (const name of ["storage", "audio"]) {
    try {
      const result = await window.NativeSDK.permission.request(name);
      if (result?.granted) access.granted = true;
      if (result?.permanentlyDenied) access.permanentlyDenied = true;
    } catch {
      /* unknown on this OS version */
    }
  }
  if (access.granted) access.permanentlyDenied = false;
  return access;
}

/** `permission` plugin — the app's page in the system settings. */
export async function openAppSettings(): Promise<void> {
  if (!window.NativeSDK) return;
  try {
    await window.NativeSDK.permission.openSettings();
  } catch {
    /* ignore */
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
 * `safe_area` plugin — height of the status bar, as the CSS variable
 * `--safe-top`. The web view draws under the bar, so without it the header sits
 * behind the clock. Never smaller than 24 px: a read of 0 right after the app
 * comes back from another app must not push the page under the bar.
 */
export async function applySafeArea(): Promise<void> {
  if (!window.NativeSDK) return;
  let top = 0;
  try {
    const insets = await window.NativeSDK.safeArea.getInsets();
    top = Math.round(insets?.padding?.top ?? 0);
  } catch {
    /* keep the default */
  }
  document.documentElement.style.setProperty("--safe-top", `${Math.max(top, 24)}px`);
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
