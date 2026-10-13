import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { interceptBackButton, minimizeApp } from "../native/plugins";

/**
 * Android back button through the core `back_button` plugin.
 *
 * A component that owns an overlay (the queue drawer) can keep the back
 * button for itself by listening for the cancelable `sweetmelon:back` event
 * and calling `preventDefault()`. Otherwise back goes to the Explorer, and
 * from there it puts the app in the background — music keeps playing, which
 * is what a player should do.
 */
export const BACK_EVENT = "sweetmelon:back";

export function NativeShell() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void interceptBackButton(() => {
      const event = new CustomEvent(BACK_EVENT, { cancelable: true });
      const unhandled = window.dispatchEvent(event);
      if (!unhandled) return;

      if (location.pathname !== "/") {
        navigate("/");
        return;
      }
      void minimizeApp();
    }).then((off) => {
      unsubscribe = off;
    });

    return () => unsubscribe?.();
  }, [navigate, location.pathname]);

  return null;
}
