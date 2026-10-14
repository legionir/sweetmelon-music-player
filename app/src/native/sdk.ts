/**
 * -----------------------------------------------------------------------
 * SWEETMELON BRIDGE — low-level access to `window.NativeSDK`
 * -----------------------------------------------------------------------
 * `js/native-sdk.js` (injected by the Sweetmelon build from the core) defines
 * `window.NativeSDK`, which forwards every call to a Flutter plugin through
 * the native bridge. In a plain browser (Vite dev server, `npm run preview`)
 * that file is a placeholder, `window.NativeSDK` stays undefined and the app
 * falls back to web APIs.
 *
 * Only this folder is allowed to touch `window.NativeSDK`.
 */

/** Methods of the core plugins this app calls. The full SDK is much larger. */
export interface SweetmelonSdk {
  waitForReady(timeoutMs?: number): Promise<unknown>;
  info(): unknown;
  on(event: string, callback: (data: unknown) => void): void;
  off(event: string, callback: (data: unknown) => void): void;

  audio: {
    play(options: { url?: string; path?: string; volume?: number }): Promise<unknown>;
    pause(): Promise<unknown>;
    resume(): Promise<unknown>;
    stop(): Promise<unknown>;
    seek(positionMs: number): Promise<unknown>;
    setVolume(volume: number): Promise<unknown>;
    getDuration(): Promise<{ durationMs?: number; durationSec?: number }>;
    getPosition(): Promise<{ positionMs?: number; positionSec?: number }>;
    isPlaying(): Promise<{ playing?: boolean }>;
  };

  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<unknown>;
    remove(key: string): Promise<unknown>;
  };

  toast: {
    show(text: string, options?: { duration?: string }): Promise<unknown>;
  };

  wakeLock: {
    enable(): Promise<unknown>;
    disable(): Promise<unknown>;
  };

  share: {
    shareText(text: string, subject?: string | null): Promise<unknown>;
  };

  backButton: {
    enableIntercept(): Promise<unknown>;
    disableIntercept(): Promise<unknown>;
    minimizeApp(): Promise<unknown>;
    exitApp(): Promise<unknown>;
  };

  haptic: {
    lightImpact(): Promise<unknown>;
  };

  permission: {
    request(permission: string): Promise<{ granted?: boolean; permanentlyDenied?: boolean }>;
    openSettings(): Promise<unknown>;
  };

  safeArea: {
    getInsets(): Promise<{ padding?: { top?: number; bottom?: number } }>;
  };

  fileSystem: {
    browse(path?: string, options?: { extensions?: string[] }): Promise<BrowseResult>;
  };
}

export interface BrowseEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  extension?: string;
}

export interface BrowseResult {
  /** Folder that was listed ("" = the list of storage roots). */
  path: string;
  /** Folder one level up: "" for a storage root, null at the list of roots. */
  parent: string | null;
  items: BrowseEntry[];
}

export interface PickedFile {
  name: string;
  path: string;
  size?: number;
  extension?: string;
}

declare global {
  interface Window {
    NativeSDK?: SweetmelonSdk;
    Native?: { call?: unknown };
    /** Set by app/public/js/native-sdk.js, the dev-server placeholder. */
    __SWEETMELON_SDK_PLACEHOLDER__?: boolean;
  }
}

export function bridgePresent(): boolean {
  return typeof window !== "undefined" && Boolean(window.NativeSDK);
}

export function bridgeIsNative(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.NativeSDK) &&
    typeof window.Native?.call === "function"
  );
}

/**
 * Resolves once the native side answers. False in a browser, or when the SDK
 * file was not replaced by a Sweetmelon build.
 */
export async function waitForBridge(timeoutMs = 2000): Promise<boolean> {
  if (!bridgePresent()) return false;
  if (bridgeIsNative()) return true;
  try {
    await window.NativeSDK?.waitForReady(timeoutMs);
  } catch {
    return false;
  }
  return bridgeIsNative();
}

export type BridgeMode = "native" | "web";

export interface BridgeStatus {
  mode: BridgeMode;
  /** True when `js/native-sdk.js` is still the dev placeholder. */
  placeholder: boolean;
}
