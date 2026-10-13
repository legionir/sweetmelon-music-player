/**
 * -----------------------------------------------------------------------
 * FEEDBACK — `toast`, `haptic` and `share` with browser fallbacks
 * -----------------------------------------------------------------------
 * On a device these go through the core plugins. In a browser the toast is
 * rendered by `components/ToastHost.tsx`, haptics are skipped and share falls
 * back to the Web Share API / clipboard.
 */

export interface ToastMessage {
  id: number;
  text: string;
}

type ToastListener = (message: ToastMessage) => void;

const listeners = new Set<ToastListener>();
let nextId = 1;

/** In-app toasts, used when the native `toast` plugin is not there. */
export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function pushLocalToast(text: string) {
  const message: ToastMessage = { id: nextId++, text };
  listeners.forEach((listener) => listener(message));
}

/**
 * Show a short message. Uses the core `toast` plugin on a device.
 */
export function notify(text: string, duration: "short" | "long" = "short") {
  if (window.NativeSDK) {
    void window.NativeSDK.toast.show(text, { duration }).catch(() => pushLocalToast(text));
    return;
  }
  pushLocalToast(text);
}

/** `haptic` plugin — a light tap on likes and queue actions. */
export function hapticTap() {
  if (!window.NativeSDK) return;
  void window.NativeSDK.haptic.lightImpact().catch(() => {});
}

/**
 * `share` plugin — share the playing track. Falls back to the Web Share API,
 * then to the clipboard, so the button always does something.
 */
export async function shareText(text: string, subject: string): Promise<boolean> {
  if (window.NativeSDK) {
    try {
      await window.NativeSDK.share.shareText(text, subject);
      return true;
    } catch {
      /* plugin missing in this build: use the web APIs below */
    }
  }
  const nav = window.navigator as Navigator & {
    share?: (data: { title?: string; text?: string }) => Promise<void>;
  };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: subject, text });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await window.navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
